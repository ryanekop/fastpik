"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ProjectList } from "@/components/admin/project-list"
import { CreateProjectForm } from "@/components/admin/create-project-form"
import { ImportProjectForm } from "@/components/admin/import-project-form"
import { BatchModeForm } from "@/components/admin/batch-mode-form"
import { BatchProjectDialog } from "@/components/admin/batch-project-dialog"
import { ClientStatusTab } from "@/components/admin/client-status-tab"
import { ClientPrintStatusTab } from "@/components/admin/client-print-status-tab"
import type { Project } from "@/lib/project-store"
import type { Folder } from "@/lib/supabase/folders"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { LayoutList, Eye, Printer } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
interface ProjectListWrapperProps {
    initialProjects: Project[]
    initialFolders: Folder[]
}

export function ProjectListWrapper({ initialProjects, initialFolders }: ProjectListWrapperProps) {
    const router = useRouter()
    const t = useTranslations('Admin')
    const [projects, setProjects] = useState<Project[]>(initialProjects)
    const [folders, setFolders] = useState<Folder[]>(initialFolders)

    useEffect(() => {
        setProjects(initialProjects)
    }, [initialProjects])

    useEffect(() => {
        setFolders(initialFolders)
    }, [initialFolders])

    const [view, setView] = useState<'list' | 'create' | 'edit' | 'import' | 'batch'>('list')
    const [editingProject, setEditingProject] = useState<Project | null>(null)
    const [showBatchDialog, setShowBatchDialog] = useState(false)
    const [activeTab, setActiveTab] = useState<'projects' | 'status' | 'print-status'>('projects')
    const [printEnabled, setPrintEnabled] = useState(false)

    // Load print_enabled from settings
    useEffect(() => {
        const loadPrintSetting = async () => {
            try {
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return
                const { data } = await supabase.from('settings').select('print_enabled').eq('user_id', user.id).maybeSingle()
                if (data?.print_enabled) setPrintEnabled(true)
            } catch { }
        }
        loadPrintSetting()
    }, [])

    // Folder navigation
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
    const [breadcrumbPath, setBreadcrumbPath] = useState<{ id: string | null; name: string }[]>([])

    const navigateToFolder = (folderId: string | null) => {
        setCurrentFolderId(folderId)
        if (folderId === null) {
            setBreadcrumbPath([])
        } else {
            // Build breadcrumb path from folders
            const path: { id: string | null; name: string }[] = []
            let currentId: string | null = folderId
            while (currentId) {
                const folder = folders.find(f => f.id === currentId)
                if (folder) {
                    path.unshift({ id: folder.id, name: folder.name })
                    currentId = folder.parentId
                } else {
                    break
                }
            }
            setBreadcrumbPath(path)
        }
    }

    const getCurrentDepth = (): number => {
        return breadcrumbPath.length
    }

    const handleEditProject = (project: Project) => {
        setEditingProject(project)
        setView('edit')
    }

    const handleCreateNew = () => {
        setEditingProject(null)
        setView('create')
    }

    const handleBatchClick = () => {
        setShowBatchDialog(true)
    }

    const handleImport = () => {
        setShowBatchDialog(false)
        setView('import')
    }

    const handleBatchMode = () => {
        setShowBatchDialog(false)
        setView('batch')
    }

    const onProjectsImported = (importedProjects: Project[]) => {
        setProjects(prev => [...importedProjects, ...prev])
        setView('list')
        router.refresh()
    }

    const handleBack = () => {
        setEditingProject(null)
        setView('list')
    }

    const onProjectCreated = (newProject: Project) => {
        setProjects(prev => [newProject, ...prev])
        router.refresh()
    }

    const onEditComplete = () => {
        setView('list')
        setEditingProject(null)
        router.refresh()
    }

    const refreshData = () => {
        router.refresh()
    }

    // Count active selections (in_progress)
    const activeSelections = projects.filter(p =>
        p.selectionStatus === 'in_progress' && p.projectType !== 'print'
    ).length

    // Count active print selections (in_progress or submitted)
    const activePrintSelections = projects.filter(p =>
        p.projectType === 'print' && (p.printStatus === 'in_progress' || p.printStatus === 'submitted')
    ).length

    return (
        <div className="bg-card text-card-foreground rounded-xl border shadow-sm p-6 sm:p-8 min-h-[500px]">
            {/* Tab Navigation - always rendered for smooth transitions */}
            <div
                className={cn(
                    "flex items-center gap-1 border-b overflow-x-auto scrollbar-none transition-all duration-300 ease-in-out",
                    view === 'list' ? "mb-6 max-h-20 opacity-100" : "mb-0 max-h-0 opacity-0 overflow-hidden border-b-0"
                )}
            >
                <button
                    onClick={() => { if (view === 'list') setActiveTab('projects') }}
                    className={cn(
                        "px-4 py-2.5 text-sm font-medium transition-colors relative cursor-pointer flex items-center gap-2 whitespace-nowrap",
                        activeTab === 'projects'
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <LayoutList className="h-4 w-4" />
                    {t('tabProjects')}
                    {activeTab === 'projects' && (
                        <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                </button>
                <button
                    onClick={() => { if (view === 'list') setActiveTab('status') }}
                    className={cn(
                        "px-4 py-2.5 text-sm font-medium transition-colors relative cursor-pointer flex items-center gap-2 whitespace-nowrap",
                        activeTab === 'status'
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Eye className="h-4 w-4" />
                    {t('tabClientStatus')}
                    {activeSelections > 0 && (
                        <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-bold bg-blue-500 text-white rounded-full">
                            {activeSelections}
                        </span>
                    )}
                    {activeTab === 'status' && (
                        <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                </button>
                {printEnabled && (
                    <button
                        onClick={() => { if (view === 'list') setActiveTab('print-status') }}
                        className={cn(
                            "px-4 py-2.5 text-sm font-medium transition-colors relative cursor-pointer flex items-center gap-2 whitespace-nowrap",
                            activeTab === 'print-status'
                                ? "text-primary"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Printer className="h-4 w-4" />
                        {t('tabClientPrintStatus')}
                        {activePrintSelections > 0 && (
                            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-bold bg-purple-500 text-white rounded-full">
                                {activePrintSelections}
                            </span>
                        )}
                        {activeTab === 'print-status' && (
                            <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                        )}
                    </button>
                )}
            </div>
            <AnimatePresence mode="wait">
                {view === 'list' && activeTab === 'print-status' ? (
                    <motion.div
                        key="print-status"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                    >
                        <ClientPrintStatusTab projects={projects} folders={folders} onProjectsChanged={setProjects} />
                    </motion.div>
                ) : view === 'list' && activeTab === 'status' ? (
                    <motion.div
                        key="status"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                    >
                        <ClientStatusTab projects={projects} folders={folders} onProjectsChanged={setProjects} />
                    </motion.div>
                ) : view === 'list' ? (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ProjectList
                            projects={projects}
                            folders={folders}
                            currentFolderId={currentFolderId}
                            breadcrumbPath={breadcrumbPath}
                            currentDepth={getCurrentDepth()}
                            onNavigateToFolder={navigateToFolder}
                            onCreateNew={handleCreateNew}
                            onBatchClick={handleBatchClick}
                            onOpenProject={(p) => window.open(p.link, '_blank')}
                            onEditProject={handleEditProject}
                            onDeleteProject={async (id) => {
                                await fetch(`/api/projects/${id}`, { method: 'DELETE' })
                                setProjects(prev => prev.filter(p => p.id !== id))
                                router.refresh()
                            }}
                            onBatchDeleteProjects={async (ids) => {
                                await Promise.all(ids.map(id => fetch(`/api/projects/${id}`, { method: 'DELETE' })))
                                setProjects(prev => prev.filter(p => !ids.includes(p.id)))
                                router.refresh()
                            }}
                            onFoldersChanged={refreshData}
                            onProjectsChanged={setProjects}
                        />
                    </motion.div>
                ) : view === 'import' ? (
                    <motion.div
                        key="import"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ImportProjectForm
                            onBack={handleBack}
                            onProjectsImported={onProjectsImported}
                            currentFolderId={currentFolderId}
                        />
                    </motion.div>
                ) : view === 'batch' ? (
                    <motion.div
                        key="batch"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                    >
                        <BatchModeForm
                            onBack={handleBack}
                            onProjectsCreated={onProjectsImported}
                            currentFolderId={currentFolderId}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                    >
                        <CreateProjectForm
                            onBack={handleBack}
                            onProjectCreated={onProjectCreated}
                            editProject={editingProject}
                            onEditComplete={onEditComplete}
                            currentFolderId={currentFolderId}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <BatchProjectDialog
                isOpen={showBatchDialog}
                onClose={() => setShowBatchDialog(false)}
                onImportFile={handleImport}
                onBatchMode={handleBatchMode}
            />
        </div>
    )
}
