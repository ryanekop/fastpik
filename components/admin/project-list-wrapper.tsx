"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ProjectList } from "@/components/admin/project-list"
import { CreateProjectForm } from "@/components/admin/create-project-form"
import type { Project } from "@/lib/project-store"
import type { Folder } from "@/lib/supabase/folders"
import { useRouter } from "next/navigation"

interface ProjectListWrapperProps {
    initialProjects: Project[]
    initialFolders: Folder[]
}

export function ProjectListWrapper({ initialProjects, initialFolders }: ProjectListWrapperProps) {
    const router = useRouter()
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

    return (
        <div className="bg-card text-card-foreground rounded-xl border shadow-sm p-6 sm:p-8 min-h-[500px]">
            <AnimatePresence mode="wait">
                {view === 'list' ? (
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
