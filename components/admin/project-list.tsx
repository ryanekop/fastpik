"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations } from "next-intl"
import { Plus, Trash2, ExternalLink, Copy, Clock, Users, MessageCircle, Edit, CheckSquare, Square, X } from "lucide-react"
import { useProjectStore, isProjectExpired, getClientWhatsapp, type Project } from "@/lib/project-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PopupDialog, Toast } from "@/components/ui/popup-dialog"
import { cn } from "@/lib/utils"

interface ProjectListProps {
    onCreateNew: () => void
    onOpenProject: (project: Project) => void
    onEditProject: (project: Project) => void
}

export function ProjectList({ onCreateNew, onOpenProject, onEditProject }: ProjectListProps) {
    const t = useTranslations('Admin')
    const tc = useTranslations('Client')
    const { projects, removeProject, removeMultipleProjects } = useProjectStore()
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [isSelectMode, setIsSelectMode] = useState(false)
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    // Popup states
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false)
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
    const [showToast, setShowToast] = useState(false)
    const [toastMessage, setToastMessage] = useState("")

    // Localized expiry time formatter
    const formatExpiry = (expiresAt: number | undefined): string => {
        if (!expiresAt) return `♾️ ${t('forever')}`

        const now = Date.now()
        const diff = expiresAt - now

        if (diff <= 0) return `⏰ ${t('expired')}`

        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

        if (days > 0) return `${days} ${t('days')} ${hours} ${t('hours')}`
        if (hours > 0) return `${hours} ${t('hours')}`
        return t('lessThanHour')
    }

    // Component to render expiry safely on client only to prevent hydration mismatch
    const ExpiryDisplay = ({ expiresAt }: { expiresAt: number | undefined }) => {
        // We use a simple way to avoid hydration mismatch: only render on client or use suppressHydrationWarning
        // But the best way is usually calculating it inside useEffect or just suppressing warning for this specific timestamp
        return (
            <span suppressHydrationWarning>
                {formatExpiry(expiresAt)}
            </span>
        )
    }

    const copyLink = (link: string, id: string) => {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(link)
            setCopiedId(id)
            setTimeout(() => setCopiedId(null), 2000)
        } else {
            // Fallback for non-secure context
            const textArea = document.createElement("textarea")
            textArea.value = link
            textArea.style.position = "fixed"
            textArea.style.left = "-9999px"
            document.body.appendChild(textArea)
            textArea.focus()
            textArea.select()
            try {
                document.execCommand('copy')
                setCopiedId(id)
                setTimeout(() => setCopiedId(null), 2000)
            } catch (err) {
                console.error('Failed to copy', err)
            }
            document.body.removeChild(textArea)
        }
    }

    const openLink = (link: string) => {
        window.open(link, '_blank')
    }

    const sendToClient = (project: Project) => {
        const clientWa = getClientWhatsapp(project)
        if (!clientWa) {
            setToastMessage(tc('noWhatsapp') || 'WhatsApp not set')
            setShowToast(true)
            return
        }
        // Use localized message with proper variable passing
        const message = tc('waClientMessage', {
            name: project.clientName,
            link: project.link,
            max: project.maxPhotos.toString()
        })
        window.open(`https://wa.me/${clientWa}?text=${encodeURIComponent(message)}`, '_blank')
    }

    const handleDeleteClick = (projectId: string) => {
        setDeleteTargetId(projectId)
        setShowDeleteDialog(true)
    }

    const confirmDelete = () => {
        if (deleteTargetId) {
            removeProject(deleteTargetId)
            setDeleteTargetId(null)
            setShowDeleteDialog(false)
            setToastMessage(t('deleted'))
            setShowToast(true)
        }
    }

    const toggleSelect = (projectId: string) => {
        setSelectedIds(prev =>
            prev.includes(projectId)
                ? prev.filter(id => id !== projectId)
                : [...prev, projectId]
        )
    }

    const toggleSelectAll = () => {
        if (selectedIds.length === projects.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(projects.map(p => p.id))
        }
    }

    const handleBatchDeleteClick = () => {
        if (selectedIds.length === 0) return
        setShowBatchDeleteDialog(true)
    }

    const confirmBatchDelete = () => {
        removeMultipleProjects(selectedIds)
        setSelectedIds([])
        setIsSelectMode(false)
        setShowBatchDeleteDialog(false)
        setToastMessage(t('deleted'))
        setShowToast(true)
    }

    const cancelSelectMode = () => {
        setIsSelectMode(false)
        setSelectedIds([])
    }

    if (projects.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12 space-y-4"
            >
                <div className="text-6xl">📂</div>
                <h3 className="text-xl font-semibold">{t('noProjects')}</h3>
                <p className="text-muted-foreground">{t('noProjectsDesc')}</p>
                <Button onClick={onCreateNew} size="lg" className="gap-2 cursor-pointer">
                    <Plus className="h-5 w-5" />
                    {t('createNew')}
                </Button>
            </motion.div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    📋 {t('projectList')} ({projects.length})
                </h3>
                <div className="flex items-center gap-2">
                    {isSelectMode ? (
                        <>
                            <Button
                                onClick={toggleSelectAll}
                                size="sm"
                                variant="outline"
                                className="gap-2 cursor-pointer"
                            >
                                {selectedIds.length === projects.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                                {selectedIds.length === projects.length ? tc('clearSelection') : t('manage')}
                            </Button>
                            <Button
                                onClick={handleBatchDeleteClick}
                                size="sm"
                                variant="destructive"
                                className="gap-2 cursor-pointer"
                                disabled={selectedIds.length === 0}
                            >
                                <Trash2 className="h-4 w-4" />
                                {t('delete')} ({selectedIds.length})
                            </Button>
                            <Button
                                onClick={cancelSelectMode}
                                size="sm"
                                variant="ghost"
                                className="cursor-pointer"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                onClick={() => setIsSelectMode(true)}
                                size="sm"
                                variant="outline"
                                className="gap-2 cursor-pointer"
                            >
                                <CheckSquare className="h-4 w-4" />
                                {t('manage')}
                            </Button>
                            <Button onClick={onCreateNew} size="sm" className="gap-2 cursor-pointer">
                                <Plus className="h-4 w-4" />
                                {t('createNew')}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid gap-3 overflow-hidden max-w-full">
                <AnimatePresence mode="popLayout">
                    {projects.map((project, index) => {
                        const expired = isProjectExpired(project)
                        const isSelected = selectedIds.includes(project.id)
                        return (
                            <motion.div
                                key={project.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -100 }}
                                transition={{ delay: index * 0.05 }}
                                className="overflow-hidden max-w-full"
                            >
                                <Card className={cn(
                                    "overflow-hidden transition-all hover:shadow-md",
                                    expired && "opacity-60 border-destructive/30",
                                    isSelected && "border-primary bg-primary/5"
                                )}>
                                    <CardContent className="p-4 overflow-hidden">
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 w-full overflow-hidden">
                                            {/* Checkbox for select mode */}
                                            {isSelectMode && (
                                                <button
                                                    onClick={() => toggleSelect(project.id)}
                                                    className="mt-1 cursor-pointer"
                                                >
                                                    {isSelected ? (
                                                        <CheckSquare className="h-5 w-5 text-primary" />
                                                    ) : (
                                                        <Square className="h-5 w-5 text-muted-foreground" />
                                                    )}
                                                </button>
                                            )}

                                            <div className="flex-1 min-w-0 space-y-1 overflow-hidden max-w-full">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                                                    <h4 className="font-semibold truncate flex-1 min-w-0">
                                                        {project.clientName}
                                                    </h4>
                                                    {expired && (
                                                        <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded shrink-0">
                                                            {t('expired')}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1 shrink-0">
                                                        📸 {project.maxPhotos} {t('photo')}
                                                    </span>
                                                    <span className="flex items-center gap-1 shrink-0">
                                                        <Clock className="h-3 w-3" />
                                                        <ExpiryDisplay expiresAt={project.expiresAt} />
                                                    </span>
                                                </div>
                                                <p
                                                    className="text-xs text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap block"
                                                    style={{ maxWidth: 'min(100%, calc(100vw - 100px))' }}
                                                >
                                                    🔗 {project.link}
                                                </p>
                                            </div>

                                            {!isSelectMode && (
                                                <div className="flex items-center gap-1 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 mt-2 sm:mt-0 border-border/50">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => copyLink(project.link, project.id)}
                                                        className="h-8 w-8 cursor-pointer"
                                                        title={t('copyLink')}
                                                    >
                                                        {copiedId === project.id ? (
                                                            <span className="text-green-500 text-xs">✓</span>
                                                        ) : (
                                                            <Copy className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => sendToClient(project)}
                                                        className="h-8 w-8 cursor-pointer text-green-600 hover:text-green-700"
                                                        disabled={expired}
                                                        title={t('sendToClient')}
                                                    >
                                                        <MessageCircle className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => openLink(project.link)}
                                                        className="h-8 w-8 cursor-pointer"
                                                        disabled={expired}
                                                        title={t('openLink')}
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => onEditProject(project)}
                                                        className="h-8 w-8 cursor-pointer text-blue-600 hover:text-blue-700"
                                                        title={t('editProject')}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => handleDeleteClick(project.id)}
                                                        className="h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
                                                        title={t('delete')}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>

            {/* Single Delete Confirmation */}
            <PopupDialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onConfirm={confirmDelete}
                title={t('confirmDelete')}
                message={t('confirmDeleteSingle')}
                type="danger"
                confirmText={t('delete')}
                cancelText={t('cancel')}
            />

            {/* Batch Delete Confirmation */}
            <PopupDialog
                isOpen={showBatchDeleteDialog}
                onClose={() => setShowBatchDeleteDialog(false)}
                onConfirm={confirmBatchDelete}
                title={t('confirmDelete')}
                message={t('confirmDeleteMsg', { count: selectedIds.length })}
                type="danger"
                confirmText={t('deleteSelected')}
                cancelText={t('cancel')}
            />

            {/* Toast Notification */}
            <Toast
                isOpen={showToast}
                message={toastMessage}
                type="success"
                onClose={() => setShowToast(false)}
            />
        </div>
    )
}
