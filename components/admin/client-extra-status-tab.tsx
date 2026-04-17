"use client"

import { useState, useEffect } from "react"
import { useTranslations, useLocale } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { PopupDialog } from "@/components/ui/popup-dialog"
import { RefreshCw, CheckCircle, XCircle, Clock, Search, Loader2, ImagePlus, Bell, Undo2, Timer, FolderOpen, Copy } from "lucide-react"
import { getClientWhatsapp, type Project } from "@/lib/project-store"
import type { Folder } from "@/lib/supabase/folders"
import { createClient } from "@/lib/supabase/client"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface ClientExtraStatusTabProps {
    projects: Project[]
    folders: Folder[]
    onProjectsChanged?: (projects: Project[]) => void
}

type StatusFilter = 'all' | 'in_progress' | 'reviewed' | 'pending'

const STATUS_CONFIG = {
    pending: { color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', cardBg: 'bg-red-50/50 dark:bg-red-950/10' },
    in_progress: { color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-300 dark:border-amber-800', cardBg: 'bg-amber-50/50 dark:bg-amber-950/10' },
    reviewed: { color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-300 dark:border-emerald-800', cardBg: 'bg-emerald-50/50 dark:bg-emerald-950/10' },
} as const

const isLegacyExtraProject = (project: Project) => !project.extraEnabled && project.projectType !== 'print' && (project.lockedPhotos || []).length > 0
const isExtraStatusProject = (project: Project) => !!project.extraEnabled || isLegacyExtraProject(project)

export function ClientExtraStatusTab({ projects: initialProjects, folders, onProjectsChanged }: ClientExtraStatusTabProps) {
    const t = useTranslations('Admin')
    const locale = useLocale()
    const [projects, setProjects] = useState<Project[]>(initialProjects.filter(isExtraStatusProject))
    const [filter, setFilter] = useState<StatusFilter>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [isPolling, setIsPolling] = useState(false)
    const [markingId, setMarkingId] = useState<string | null>(null)
    const [showMarkDialog, setShowMarkDialog] = useState(false)
    const [markTargetId, setMarkTargetId] = useState<string | null>(null)
    const [showUnmarkDialog, setShowUnmarkDialog] = useState(false)
    const [unmarkTargetId, setUnmarkTargetId] = useState<string | null>(null)
    const [copiedProjectId, setCopiedProjectId] = useState<string | null>(null)

    const [vendorSlug, setVendorSlug] = useState<string | null>(null)
    const [reminderTemplate, setReminderTemplate] = useState<{ id: string, en: string } | null>(null)

    const supabase = createClient()

    useEffect(() => {
        setProjects(initialProjects.filter(isExtraStatusProject))
    }, [initialProjects])

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return
                const { data } = await supabase
                    .from('settings')
                    .select('vendor_name, msg_tmpl_reminder_extra')
                    .eq('user_id', user.id)
                    .maybeSingle()
                if (data?.vendor_name) {
                    setVendorSlug(data.vendor_name)
                }
                if (data?.msg_tmpl_reminder_extra) {
                    setReminderTemplate(data.msg_tmpl_reminder_extra as { id: string, en: string })
                }
            } catch (err) {
                console.error('Failed to load settings:', err)
            }
        }
        loadSettings()
    }, [])

    useEffect(() => {
        const poll = async () => {
            try {
                setIsPolling(true)
                const res = await fetch('/api/projects')
                if (res.ok) {
                    const data = await res.json()
                    setProjects(data.filter((p: Project) => isExtraStatusProject(p)))
                    onProjectsChanged?.(data)
                }
            } catch (err) {
                console.error('Polling failed:', err)
            } finally {
                setIsPolling(false)
            }
        }
        const interval = setInterval(poll, 30000)
        return () => clearInterval(interval)
    }, [])

    const normalizePhotoName = (name: string | null | undefined) => {
        return (name || '').trim().replace(/\.[^/.]+$/, '')
    }

    const getLockedPhotoNames = (project: Project) => {
        return (project.lockedPhotos || []).map(normalizePhotoName).filter(Boolean)
    }

    const getAdditionalPhotoNames = (project: Project) => {
        if (project.extraEnabled) {
            return (project.extraSelectedPhotos || []).map(normalizePhotoName).filter(Boolean)
        }

        const lockedSet = new Set(getLockedPhotoNames(project))
        return (project.selectedPhotos || [])
            .map(normalizePhotoName)
            .filter((name) => name && !lockedSet.has(name))
    }

    const getExtraMaxPhotos = (project: Project) => {
        if (project.extraEnabled) return project.extraMaxPhotos || 0
        return Math.max(0, project.maxPhotos - (project.lockedPhotos || []).length)
    }

    const getExtraExpiry = (project: Project) => {
        return project.extraEnabled ? project.extraExpiresAt : project.expiresAt
    }

    const getExtraLastSyncedAt = (project: Project) => {
        return project.extraEnabled ? project.extraLastSyncedAt : project.selectionLastSyncedAt
    }

    const getEffectiveStatus = (project: Project): keyof typeof STATUS_CONFIG => {
        const rawStatus = project.extraEnabled ? project.extraStatus : project.selectionStatus
        if (rawStatus === 'submitted') return 'in_progress'
        if (rawStatus === 'in_progress') return 'in_progress'
        if (rawStatus === 'reviewed') return 'reviewed'
        return 'pending'
    }

    const formatExpiry = (timestamp: number | null | undefined) => {
        if (!timestamp) return `♾️ ${t('forever')}`
        const diff = timestamp - Date.now()
        if (diff <= 0) return `⏰ ${t('expired')}`
        const days = Math.ceil(diff / (24 * 60 * 60 * 1000))
        return `${days} ${t('days')}`
    }

    const formatRelativeTime = (timestamp: number | null | undefined) => {
        if (!timestamp) return '-'
        const diff = Date.now() - timestamp
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const date = new Date(timestamp)
        const timeStr = date.toLocaleTimeString(locale === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })
        const dateStr = date.toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short' })
        if (minutes < 1) return locale === 'id' ? 'Baru saja' : 'Just now'
        if (minutes < 60) return `${minutes} ${locale === 'id' ? 'menit lalu' : 'min ago'}`
        if (hours < 24) return `${hours} ${locale === 'id' ? 'jam lalu' : 'hr ago'} (${timeStr})`
        return `${dateStr}, ${timeStr}`
    }

    const buildProjectLink = (projectId: string) => {
        const origin = window.location.origin
        const pathParts = window.location.pathname.split('/')
        const loc = pathParts[1] || 'id'
        return vendorSlug
            ? `${origin}/${loc}/client/${vendorSlug}/${projectId}`
            : `${origin}/${loc}/client/${projectId}`
    }

    const getFolderName = (folderId: string | null | undefined): string | null => {
        if (!folderId) return null
        const folder = folders.find(f => f.id === folderId)
        return folder?.name || null
    }

    const confirmMarkReviewed = (projectId: string) => {
        setMarkTargetId(projectId)
        setShowMarkDialog(true)
    }

    const handleMarkReviewed = async () => {
        if (!markTargetId) return
        const targetId = markTargetId
        const targetProject = projects.find((p) => p.id === targetId)
        setShowMarkDialog(false)
        setMarkTargetId(null)
        setMarkingId(targetId)
        try {
            const res = await fetch(`/api/projects/${targetId}/mark-reviewed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: targetProject?.extraEnabled ? JSON.stringify({ target: 'extra' }) : undefined
            })
            if (res.ok) {
                const updateProject = (p: Project) =>
                    p.id === targetId
                        ? (p.extraEnabled ? { ...p, extraStatus: 'reviewed' } : { ...p, selectionStatus: 'reviewed' })
                        : p
                setProjects(prev => prev.map(updateProject))
                onProjectsChanged?.(initialProjects.map(updateProject))
            }
        } catch (err) {
            console.error('Failed to mark extra reviewed:', err)
        } finally {
            setMarkingId(null)
        }
    }

    const confirmUnmarkReviewed = (projectId: string) => {
        setUnmarkTargetId(projectId)
        setShowUnmarkDialog(true)
    }

    const handleUnmarkReviewed = async () => {
        if (!unmarkTargetId) return
        const targetId = unmarkTargetId
        const targetProject = projects.find((p) => p.id === targetId)
        const nextStatus = targetProject?.extraEnabled ? 'submitted' : 'in_progress'
        setShowUnmarkDialog(false)
        setUnmarkTargetId(null)
        setMarkingId(targetId)
        try {
            const res = await fetch(`/api/projects/${targetId}/mark-reviewed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(targetProject?.extraEnabled ? { status: nextStatus, target: 'extra' } : { status: nextStatus })
            })
            if (res.ok) {
                const updateProject = (p: Project) =>
                    p.id === targetId
                        ? (p.extraEnabled ? { ...p, extraStatus: nextStatus } : { ...p, selectionStatus: nextStatus })
                        : p
                setProjects(prev => prev.map(updateProject))
                onProjectsChanged?.(initialProjects.map(updateProject))
            }
        } catch (err) {
            console.error('Failed to unmark extra reviewed:', err)
        } finally {
            setMarkingId(null)
        }
    }

    const manualRefresh = async () => {
        try {
            setIsPolling(true)
            const res = await fetch('/api/projects')
            if (res.ok) {
                const data = await res.json()
                setProjects(data.filter((p: Project) => isExtraStatusProject(p)))
                onProjectsChanged?.(data)
            }
        } catch (err) {
            console.error('Refresh failed:', err)
        } finally {
            setIsPolling(false)
        }
    }

    const buildCopyListText = (project: Project) => {
        const lockedPhotoNames = getLockedPhotoNames(project)
        const additionalPhotoNames = getAdditionalPhotoNames(project)
        if (lockedPhotoNames.length === 0 && additionalPhotoNames.length === 0) return ''

        return `=== ${t('previousPhotos')} (${lockedPhotoNames.length}) ===\n${lockedPhotoNames.join('\n') || '-'}\n\n=== ${t('additionalPhotos')} (${additionalPhotoNames.length}) ===\n${additionalPhotoNames.join('\n') || '-'}`
    }

    const copyProjectList = async (project: Project) => {
        const listText = buildCopyListText(project)
        if (!listText) return

        const markCopied = () => {
            setCopiedProjectId(project.id)
            window.setTimeout(() => setCopiedProjectId((prev) => prev === project.id ? null : prev), 2000)
        }

        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(listText)
                markCopied()
                return
            } catch (err) {
                console.error('Clipboard API failed, falling back to execCommand:', err)
            }
        }

        const textArea = document.createElement("textarea")
        textArea.value = listText
        textArea.style.position = "fixed"
        textArea.style.left = "-9999px"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()

        try {
            document.execCommand('copy')
            markCopied()
        } catch (err) {
            console.error('Failed to copy', err)
        } finally {
            document.body.removeChild(textArea)
        }
    }

    const sendReminder = (project: Project) => {
        const clientWa = getClientWhatsapp(project)
        if (!clientWa) return

        const link = buildProjectLink(project.id)
        const extraMaxPhotos = getExtraMaxPhotos(project)
        const variables: Record<string, string> = {
            client_name: project.clientName,
            link,
            count: extraMaxPhotos.toString(),
            max_photos: extraMaxPhotos.toString()
        }

        if (project.password) {
            variables.password = project.password
        }

        const expiry = getExtraExpiry(project)
        if (expiry) {
            const diff = expiry - Date.now()
            if (diff > 0) {
                const days = Math.floor(diff / 86400000)
                const hours = Math.floor((diff % 86400000) / 3600000)
                if (days > 0) variables.duration = `${days} ${t('days')}`
                else if (hours > 0) variables.duration = `${hours} ${t('hours')}`
                else variables.duration = t('lessThanHour')
            }
        }

        if (reminderTemplate) {
            const tmplStr = locale === 'id' ? reminderTemplate.id : reminderTemplate.en
            if (tmplStr?.trim()) {
                let message = tmplStr
                Object.entries(variables).forEach(([key, val]) => {
                    message = message.replace(new RegExp(`{{${key}}}`, 'g'), val)
                })
                message = message.replace(/{{(\w+)}}/g, '').replace(/\n{3,}/g, '\n\n').trim()
                window.open(`https://api.whatsapp.com/send/?phone=${clientWa}&text=${encodeURIComponent(message)}`, '_blank')
                return
            }
        }

        let fallbackMessage = t('waReminderExtraMessage', {
            name: project.clientName,
            link,
            duration: variables.duration || `♾️ ${t('forever')}`
        })
        if (variables.password) {
            fallbackMessage += `\n\n🔐 Password: ${variables.password}`
        }

        window.open(`https://api.whatsapp.com/send/?phone=${clientWa}&text=${encodeURIComponent(fallbackMessage)}`, '_blank')
    }

    const filteredProjects = projects
        .filter(p => {
            const status = getEffectiveStatus(p)
            if (filter !== 'all' && status !== filter) return false
            if (searchQuery.trim()) {
                return p.clientName.toLowerCase().includes(searchQuery.toLowerCase())
            }
            return true
        })
        .sort((a, b) => {
            const order: Record<string, number> = { in_progress: 0, pending: 1, reviewed: 2 }
            const aOrder = order[getEffectiveStatus(a)] ?? 1
            const bOrder = order[getEffectiveStatus(b)] ?? 1
            if (aOrder !== bOrder) return aOrder - bOrder
            return (getExtraLastSyncedAt(b) || 0) - (getExtraLastSyncedAt(a) || 0)
        })

    const stats = {
        inProgress: projects.filter(p => getEffectiveStatus(p) === 'in_progress').length,
        reviewed: projects.filter(p => getEffectiveStatus(p) === 'reviewed').length,
        pending: projects.filter(p => getEffectiveStatus(p) === 'pending').length,
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ImagePlus className="h-5 w-5" />
                    {t('extraClientStatus')}
                    {isPolling && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </h3>
                <Button variant="outline" size="sm" onClick={manualRefresh} disabled={isPolling} className="gap-2 cursor-pointer">
                    <RefreshCw className={cn("h-4 w-4", isPolling && "animate-spin")} />
                    {t('refresh')}
                </Button>
            </div>

            <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setFilter(filter === 'pending' ? 'all' : 'pending')} className={cn("p-3 rounded-lg border text-center transition-all cursor-pointer", filter === 'pending' ? 'border-red-400 bg-red-100 dark:bg-red-900/40' : 'border-red-200 bg-red-50/60 dark:bg-red-950/15 dark:border-red-900/30')}>
                    <div className="text-2xl font-bold text-red-500">{stats.pending}</div>
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                        <span>{t('extraStatusPending')}</span>
                    </div>
                </button>
                <button onClick={() => setFilter(filter === 'in_progress' ? 'all' : 'in_progress')} className={cn("p-3 rounded-lg border text-center transition-all cursor-pointer", filter === 'in_progress' ? 'border-amber-400 bg-amber-100 dark:bg-amber-900/40' : 'border-amber-200 bg-amber-50/60 dark:bg-amber-950/15 dark:border-amber-900/30')}>
                    <div className="text-2xl font-bold text-amber-500">{stats.inProgress}</div>
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                        <span>{t('extraStatusInProgress')}</span>
                    </div>
                </button>
                <button onClick={() => setFilter(filter === 'reviewed' ? 'all' : 'reviewed')} className={cn("p-3 rounded-lg border text-center transition-all cursor-pointer", filter === 'reviewed' ? 'border-emerald-400 bg-emerald-100 dark:bg-emerald-900/40' : 'border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/15 dark:border-emerald-900/30')}>
                    <div className="text-2xl font-bold text-emerald-500">{stats.reviewed}</div>
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                        <span>{t('extraStatusReviewed')}</span>
                    </div>
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                    className="pl-9"
                />
            </div>

            <p className="text-xs text-muted-foreground text-center">
                <RefreshCw className="h-3 w-3 inline mr-1" />
                {t('autoRefresh30s')}
                {filter !== 'all' && (
                    <button onClick={() => setFilter('all')} className="ml-2 text-primary hover:underline cursor-pointer">
                        {t('clearFilter')}
                    </button>
                )}
            </p>

            <div className="grid gap-3">
                <AnimatePresence mode="popLayout">
                    {filteredProjects.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8 text-muted-foreground">
                            <p>{t('noClientActivity')}</p>
                        </motion.div>
                    ) : (
                        filteredProjects.map((project, index) => {
                            const status = getEffectiveStatus(project)
                            const statusCfg = STATUS_CONFIG[status]
                            const folderName = getFolderName(project.folderId)
                            const lockedPhotoNames = getLockedPhotoNames(project)
                            const additionalPhotoNames = getAdditionalPhotoNames(project)
                            const extraMaxPhotos = getExtraMaxPhotos(project)
                            const progressPct = extraMaxPhotos > 0 ? Math.min((additionalPhotoNames.length / extraMaxPhotos) * 100, 100) : 0
                            const hasCopyablePhotos = lockedPhotoNames.length > 0 || additionalPhotoNames.length > 0
                            const lastSyncedAt = getExtraLastSyncedAt(project)

                            return (
                                <motion.div
                                    key={project.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    transition={{ delay: index * 0.03 }}
                                >
                                    <Card className={cn("transition-all hover:shadow-sm", statusCfg.border, statusCfg.cardBg)}>
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="flex-1 min-w-0 space-y-2">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", statusCfg.bg, statusCfg.color)}>
                                                            {status === 'in_progress' && <Clock className="h-3 w-3" />}
                                                            {status === 'reviewed' && <CheckCircle className="h-3 w-3" />}
                                                            {status === 'pending' && <XCircle className="h-3 w-3" />}
                                                            {t(`extra_status_${status}`)}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                                                            <Timer className="h-3 w-3" />
                                                            {formatExpiry(getExtraExpiry(project))}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-semibold truncate text-base flex-1 min-w-0">{project.clientName}</h4>
                                                        <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded shrink-0">📷 {t('extraFeatureBadge')}</span>
                                                    </div>

                                                    {folderName && (
                                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                            <FolderOpen className="h-3 w-3" />
                                                            <span>{folderName}</span>
                                                        </div>
                                                    )}

                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-muted-foreground">{t('extraSelectionProgress')}</span>
                                                            <span className="font-medium">{additionalPhotoNames.length} / {extraMaxPhotos}</span>
                                                        </div>
                                                        <Progress value={progressPct} className="h-2" />
                                                    </div>

                                                    {lockedPhotoNames.length > 0 && (
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{t('previousPhotos')} ({lockedPhotoNames.length})</p>
                                                            <div className="flex flex-wrap gap-1">
                                                                {lockedPhotoNames.slice(0, 6).map((name, i) => (
                                                                    <span key={i} className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
                                                                        {name}
                                                                    </span>
                                                                ))}
                                                                {lockedPhotoNames.length > 6 && (
                                                                    <span className="text-xs text-muted-foreground px-1.5 py-0.5">
                                                                        +{lockedPhotoNames.length - 6} {t('more')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {additionalPhotoNames.length > 0 && (
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground">{t('additionalPhotos')} ({additionalPhotoNames.length})</p>
                                                            <div className="flex flex-wrap gap-1">
                                                                {additionalPhotoNames.slice(0, 8).map((name, i) => (
                                                                    <span key={i} className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                                                        {name}
                                                                    </span>
                                                                ))}
                                                                {additionalPhotoNames.length > 8 && (
                                                                    <span className="text-xs text-muted-foreground px-1.5 py-0.5">
                                                                        +{additionalPhotoNames.length - 8} {t('more')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {lastSyncedAt && (
                                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <RefreshCw className="h-3 w-3" />
                                                            <span>{t('lastSynced')}: {formatRelativeTime(lastSyncedAt)}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex flex-col gap-1 shrink-0">
                                                    {status !== 'reviewed' ? (
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 cursor-pointer text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                                            onClick={() => confirmMarkReviewed(project.id)}
                                                            disabled={markingId === project.id}
                                                            title={t('markReviewed')}
                                                        >
                                                            {markingId === project.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <CheckCircle className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 cursor-pointer text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                                            onClick={() => confirmUnmarkReviewed(project.id)}
                                                            disabled={markingId === project.id}
                                                            title={t('unmarkReviewed')}
                                                        >
                                                            {markingId === project.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Undo2 className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    )}

                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 cursor-pointer text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                                        onClick={() => sendReminder(project)}
                                                        disabled={!getClientWhatsapp(project)}
                                                        title={t('sendReminder')}
                                                    >
                                                        <Bell className="h-4 w-4" />
                                                    </Button>

                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 cursor-pointer text-slate-600 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/20"
                                                        onClick={() => void copyProjectList(project)}
                                                        disabled={!hasCopyablePhotos}
                                                        title={copiedProjectId === project.id ? t('copied') : t('copyList')}
                                                    >
                                                        {copiedProjectId === project.id ? (
                                                            <span className="text-xs font-semibold text-emerald-500">✓</span>
                                                        ) : (
                                                            <Copy className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )
                        })
                    )}
                </AnimatePresence>
            </div>

            <PopupDialog
                isOpen={showMarkDialog}
                onClose={() => { setShowMarkDialog(false); setMarkTargetId(null) }}
                onConfirm={handleMarkReviewed}
                title={t('confirmMarkExtraReviewed')}
                message={t('confirmMarkExtraReviewedMsg')}
                type="success"
                confirmText={t('markReviewed')}
                cancelText={t('cancel')}
            />

            <PopupDialog
                isOpen={showUnmarkDialog}
                onClose={() => { setShowUnmarkDialog(false); setUnmarkTargetId(null) }}
                onConfirm={handleUnmarkReviewed}
                title={t('confirmUnmarkExtraReviewed')}
                message={t('confirmUnmarkExtraReviewedMsg')}
                type="warning"
                confirmText={t('unmarkReviewed')}
                cancelText={t('cancel')}
            />
        </div>
    )
}
