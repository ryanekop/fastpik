"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ProjectList } from "@/components/admin/project-list"
import { CreateProjectForm } from "@/components/admin/create-project-form"
import { ClientStatusTab } from "@/components/admin/client-status-tab"
import type { Project } from "@/lib/project-store"
import type { Folder } from "@/lib/supabase/folders"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { LayoutList, Eye } from "lucide-react"
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

    const [view, setView] = useState<'list' | 'create' | 'edit'>('list')
    const [editingProject, setEditingProject] = useState<Project | null>(null)
    const [activeTab, setActiveTab] = useState<'projects' | 'status'>('projects')

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
        p.selectionStatus === 'in_progress'
    ).length

    return (
        <div className="bg-card text-card-foreground rounded-xl border shadow-sm p-6 sm:p-8 min-h-[500px]">
            {/* Tab Navigation */}
            {view === 'list' && (
                <div className="flex items-center gap-1 mb-6 border-b">
                    <button
                        onClick={() => setActiveTab('projects')}
                        className={cn(
                            "px-4 py-2.5 text-sm font-medium transition-colors relative cursor-pointer flex items-center gap-2",
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
                        onClick={() => setActiveTab('status')}
                        className={cn(
                            "px-4 py-2.5 text-sm font-medium transition-colors relative cursor-pointer flex items-center gap-2",
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
                </div>
            )}
            <AnimatePresence mode="wait">
                {view === 'list' && activeTab === 'status' ? (
                    <motion.div
                        key="status"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                    >
                        <ClientStatusTab projects={projects} folders={folders} />
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
        </div>
    )
}
