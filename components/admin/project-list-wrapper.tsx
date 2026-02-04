"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ProjectList } from "@/components/admin/project-list"
import { CreateProjectForm } from "@/components/admin/create-project-form"
import type { Project } from "@/lib/project-store"
import { useRouter } from "next/navigation"

interface ProjectListWrapperProps {
    initialProjects: Project[]
}

export function ProjectListWrapper({ initialProjects }: ProjectListWrapperProps) {
    const router = useRouter()
    // We maintain a local state for optimistic updates / immediate feedback,
    // but we also rely on router.refresh() to sync with server.
    const [projects, setProjects] = useState<Project[]>(initialProjects)

    // Sync with initialProjects when they change (after router.refresh)
    useEffect(() => {
        setProjects(initialProjects)
    }, [initialProjects])

    const [view, setView] = useState<'list' | 'create' | 'edit'>('list')
    const [editingProject, setEditingProject] = useState<Project | null>(null)

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
        // Don't switch to list view - let the form show the success state with action buttons
        router.refresh() // Sync server
    }

    const onEditComplete = () => {
        setView('list')
        setEditingProject(null)
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
                            projects={projects} // Pass the state
                            onCreateNew={handleCreateNew}
                            onOpenProject={(p) => window.open(p.link, '_blank')}
                            onEditProject={handleEditProject}
                            onDeleteProject={async (id) => {
                                // Delete API
                                await fetch(`/api/projects/${id}`, { method: 'DELETE' })
                                setProjects(prev => prev.filter(p => p.id !== id))
                                router.refresh()
                            }}
                            onBatchDeleteProjects={async (ids) => {
                                // Batch delete not implemented in API yet, usually loop or bulk endpoint
                                // For now loop
                                await Promise.all(ids.map(id => fetch(`/api/projects/${id}`, { method: 'DELETE' })))
                                setProjects(prev => prev.filter(p => !ids.includes(p.id)))
                                router.refresh()
                            }}
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
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
