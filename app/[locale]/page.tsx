"use client"

import { useState } from "react"
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from "framer-motion"
import { CreateProjectForm } from "@/components/admin/create-project-form"
import { ProjectList } from "@/components/admin/project-list"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import type { Project } from "@/lib/project-store"

export default function Home() {
  const t = useTranslations('Index')
  const tAdmin = useTranslations('Admin')
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list')
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  const handleEditProject = (project: Project) => {
    setEditingProject(project)
    setView('edit')
  }

  const handleEditComplete = () => {
    setEditingProject(null)
    setView('list')
  }

  return (
    <div className="flex flex-col min-h-screen font-[family-name:var(--font-geist-sans)]">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="font-bold text-xl tracking-tight flex items-center gap-2">
          📸 Fastpik
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-4 sm:p-8 gap-8 bg-muted/20">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">{t('title')}</h1>
          <p className="text-xl text-muted-foreground">{t('description')}</p>
        </div>

        <div className="w-full max-w-xl">
          <div className="bg-card text-card-foreground rounded-xl border shadow-sm p-6 sm:p-8">
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
                    onCreateNew={() => setView('create')}
                    onOpenProject={(project) => window.open(project.link, '_blank')}
                    onEditProject={handleEditProject}
                  />
                </motion.div>
              ) : view === 'create' ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <CreateProjectForm
                    onBack={() => setView('list')}
                    onProjectCreated={() => { }}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="edit"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <CreateProjectForm
                    onBack={() => setView('list')}
                    editProject={editingProject}
                    onEditComplete={handleEditComplete}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  )
}
