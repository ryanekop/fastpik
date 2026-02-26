"use client"

import { useState, useEffect } from "react"
import { useTranslations, useLocale } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { PopupDialog } from "@/components/ui/popup-dialog"
import { RefreshCw, CheckCircle, XCircle, Clock, Search, Loader2, Printer, Bell, Undo2, Timer, FolderOpen } from "lucide-react"
import { getClientWhatsapp, type Project } from "@/lib/project-store"
import type { Folder } from "@/lib/supabase/folders"
import { createClient } from "@/lib/supabase/client"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface ClientPrintStatusTabProps {
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

export function ClientPrintStatusTab({ projects: initialProjects, folders, onProjectsChanged }: ClientPrintStatusTabProps) {
    const t = useTranslations('Admin')
    const locale = useLocale()
    // Only show print projects
    const [projects, setProjects] = useState<Project[]>(initialProjects.filter(p => p.projectType === 'print'))
    const [filter, setFilter] = useState<StatusFilter>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [isPolling, setIsPolling] = useState(false)
    const [markingId, setMarkingId] = useState<string | null>(null)
    const [showMarkDialog, setShowMarkDialog] = useState(false)
    const [markTargetId, setMarkTargetId] = useState<string | null>(null)
    const [showUnmarkDialog, setShowUnmarkDialog] = useState(false)
    const [unmarkTargetId, setUnmarkTargetId] = useState<string | null>(null)

    const [vendorSlug, setVendorSlug] = useState<string | null>(null)
    const [reminderTemplate, setReminderTemplate] = useState<{ id: string, en: string } | null>(null)

    const supabase = createClient()

    useEffect(() => {
        setProjects(initialProjects.filter(p => p.projectType === 'print'))
    }, [initialProjects])

    // Load settings
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return
                const { data } = await supabase
                    .from('settings')
                    .select('vendor_name, msg_tmpl_reminder_print')
                    .eq('user_id', user.id)
                    .maybeSingle()
                if (data?.vendor_name) {
                    setVendorSlug(data.vendor_name)
                }
                if (data?.msg_tmpl_reminder_print) {
                    setReminderTemplate(data.msg_tmpl_reminder_print)
                }
            } catch (err) {
                console.error('Failed to load settings:', err)
            }
        }
        loadSettings()
    }, [])

    // Polling every 30 seconds
    useEffect(() => {
        const poll = async () => {
            try {
                setIsPolling(true)
                const res = await fetch('/api/projects')
                if (res.ok) {
                    const data = await res.json()
                    const printProjects = data.filter((p: Project) => p.projectType === 'print')
                    setProjects(printProjects)
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

    const formatExpiry = (timestamp: number | null | undefined) => {
        if (!timestamp) return `♾️ ${t('forever')}`
        const diff = timestamp - Date.now()
        if (diff <= 0) return `⏰ ${t('expired')}`
        const days = Math.ceil(diff / (24 * 60 * 60 * 1000))
        return `${days} ${t('days')}`
    }

    const confirmMarkReviewed = (projectId: string) => {
        setMarkTargetId(projectId)
        setShowMarkDialog(true)
    }

    const handleMarkReviewed = async () => {
        if (!markTargetId) return
        setShowMarkDialog(false)
        setMarkingId(markTargetId)
        try {
            const res = await fetch(`/api/projects/${markTargetId}/mark-reviewed`, { method: 'POST' })
            if (res.ok) {
                setProjects(prev => prev.map(p =>
                    p.id === markTargetId ? { ...p, printStatus: 'reviewed' } : p
                ))
            }
        } catch (err) {
            console.error('Failed to mark reviewed:', err)
        } finally {
            setMarkingId(null)
            setMarkTargetId(null)
        }
    }

    const confirmUnmarkReviewed = (projectId: string) => {
        setUnmarkTargetId(projectId)
        setShowUnmarkDialog(true)
    }

    const handleUnmarkReviewed = async () => {
        if (!unmarkTargetId) return
        setShowUnmarkDialog(false)
        setMarkingId(unmarkTargetId)
        try {
            const res = await fetch(`/api/projects/${unmarkTargetId}/mark-reviewed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'submitted' })
            })
            if (res.ok) {
                setProjects(prev => prev.map(p =>
                    p.id === unmarkTargetId ? { ...p, printStatus: 'submitted' } : p
                ))
            }
        } catch (err) {
            console.error('Failed to unmark reviewed:', err)
        } finally {
            setMarkingId(null)
            setUnmarkTargetId(null)
        }
    }

    const manualRefresh = async () => {
        try {
            setIsPolling(true)
            const res = await fetch('/api/projects')
            if (res.ok) {
                const data = await res.json()
                const printProjects = data.filter((p: Project) => p.projectType === 'print')
                setProjects(printProjects)
                onProjectsChanged?.(data)
            }
        } catch (err) {
            console.error('Refresh failed:', err)
        } finally {
            setIsPolling(false)
        }
    }

    const getFolderName = (folderId: string | null | undefined): string | null => {
        if (!folderId) return null
        const folder = folders.find(f => f.id === folderId)
        return folder?.name || null
    }

    // Use printStatus for status determination
    const getEffectiveStatus = (p: Project): keyof typeof STATUS_CONFIG => {
        const s = p.printStatus || 'pending'
        if (s === 'submitted') return 'in_progress'
        if (s === 'in_progress') return 'in_progress'
        if (s === 'reviewed') return 'reviewed'
        return 'pending'
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
            return (b.printLastSyncedAt || 0) - (a.printLastSyncedAt || 0)
        })

    const stats = {
        inProgress: projects.filter(p => getEffectiveStatus(p) === 'in_progress').length,
        reviewed: projects.filter(p => getEffectiveStatus(p) === 'reviewed').length,
        pending: projects.filter(p => getEffectiveStatus(p) === 'pending').length,
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

    const sendReminder = (project: Project) => {
        const clientWa = getClientWhatsapp(project)
        if (!clientWa) return

        const link = buildProjectLink(project.id)
        const printSizesStr = (project.printSizes || []).map(s => `${s.name}×${s.quota}`).join(', ')

        const variables: Record<string, string> = {
            client_name: project.clientName,
            link,
            count: '0',
            max_photos: '0',
            print_sizes: printSizesStr,
        }

        if (project.password) {
            variables.password = project.password
        }

        if (project.printExpiresAt) {
            const diff = project.printExpiresAt - Date.now()
            if (diff > 0) {
                const days = Math.floor(diff / 86400000)
                const hours = Math.floor((diff % 86400000) / 3600000)
                if (days > 0) {
                    variables.duration = `${days} ${t('days')}`
                    variables.print_duration = variables.duration
                } else if (hours > 0) {
                    variables.duration = `${hours} ${t('hours')}`
                    variables.print_duration = variables.duration
                } else {
                    variables.duration = t('lessThanHour')
                    variables.print_duration = variables.duration
                }
            }
        }

        // Try to use settings template (uses {{var}} pattern)
        const tmpl = reminderTemplate
        if (tmpl) {
            const tmplStr = locale === 'id' ? tmpl.id : tmpl.en
            if (tmplStr?.trim()) {
                let message = tmplStr
                Object.entries(variables).forEach(([key, val]) => {
                    message = message.replace(new RegExp(`{{${key}}}`, 'g'), val)
                })
                // Remove unreplaced variables
                message = message.replace(/{{(\w+)}}/g, '').replace(/\n{3,}/g, '\n\n').trim()
                window.open(`https://api.whatsapp.com/send/?phone=${clientWa}&text=${encodeURIComponent(message)}`, '_blank')
                return
            }
        }

        // Fallback: use default print reminder translation
        let fallbackMessage = t('waReminderPrintMessage', {
            name: project.clientName,
            link,
            duration: variables.duration || `♾️ ${t('forever')}`
        })
        // Append password
        if (variables.password) {
            fallbackMessage += `\n\n🔐 Password: ${variables.password}`
        }

        window.open(`https://api.whatsapp.com/send/?phone=${clientWa}&text=${encodeURIComponent(fallbackMessage)}`, '_blank')
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Printer className="h-5 w-5" />
                    {t('printClientStatus')}
                    {isPolling && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </h3>
                <Button variant="outline" size="sm" onClick={manualRefresh} disabled={isPolling} className="gap-2 cursor-pointer">
                    <RefreshCw className={cn("h-4 w-4", isPolling && "animate-spin")} />
                    {t('refresh')}
                </Button>
            </div>

            {/* Stats summary */}
            <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setFilter(filter === 'pending' ? 'all' : 'pending')} className={cn("p-3 rounded-lg border text-center transition-all cursor-pointer", filter === 'pending' ? 'border-red-400 bg-red-100 dark:bg-red-900/40' : 'border-red-200 bg-red-50/60 dark:bg-red-950/15 dark:border-red-900/30')}>
                    <div className="text-2xl font-bold text-red-500">{stats.pending}</div>
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                        <span>{t('printStatusPending')}</span>
                    </div>
                </button>
                <button onClick={() => setFilter(filter === 'in_progress' ? 'all' : 'in_progress')} className={cn("p-3 rounded-lg border text-center transition-all cursor-pointer", filter === 'in_progress' ? 'border-amber-400 bg-amber-100 dark:bg-amber-900/40' : 'border-amber-200 bg-amber-50/60 dark:bg-amber-950/15 dark:border-amber-900/30')}>
                    <div className="text-2xl font-bold text-amber-500">{stats.inProgress}</div>
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                        <span>{t('printStatusInProgress')}</span>
                    </div>
                </button>
                <button onClick={() => setFilter(filter === 'reviewed' ? 'all' : 'reviewed')} className={cn("p-3 rounded-lg border text-center transition-all cursor-pointer", filter === 'reviewed' ? 'border-emerald-400 bg-emerald-100 dark:bg-emerald-900/40' : 'border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/15 dark:border-emerald-900/30')}>
                    <div className="text-2xl font-bold text-emerald-500">{stats.reviewed}</div>
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                        <span>{t('printStatusReviewed')}</span>
                    </div>
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                    className="pl-9"
                />
            </div>

            {/* Auto-refresh indicator */}
            <p className="text-xs text-muted-foreground text-center">
                <RefreshCw className="h-3 w-3 inline mr-1" />
                {t('autoRefresh30s')}
                {filter !== 'all' && (
                    <button onClick={() => setFilter('all')} className="ml-2 text-primary hover:underline cursor-pointer">
                        {t('clearFilter')}
                    </button>
                )}
            </p>

            {/* Project list */}
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
                            // Print projects show print sizes info
                            const printSizes = project.printSizes || []

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
                                                {/* Main content */}
                                                <div className="flex-1 min-w-0 space-y-2">
                                                    {/* Status badge */}
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", statusCfg.bg, statusCfg.color)}>
                                                            {status === 'in_progress' && <Clock className="h-3 w-3" />}
                                                            {status === 'reviewed' && <CheckCircle className="h-3 w-3" />}
                                                            {status === 'pending' && <XCircle className="h-3 w-3" />}
                                                            {t(`print_status_${status}`)}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                                                            <Timer className="h-3 w-3" />
                                                            {formatExpiry(project.printExpiresAt)}
                                                        </span>
                                                    </div>
                                                    {/* Client name + badge */}
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-semibold truncate text-base flex-1 min-w-0">{project.clientName}</h4>
                                                        <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded shrink-0">🖨️ {t('projectTypePrint')}</span>
                                                    </div>

                                                    {/* Folder info */}
                                                    {folderName && (
                                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                            <FolderOpen className="h-3 w-3" />
                                                            <span>{folderName}</span>
                                                        </div>
                                                    )}

                                                    {/* Print sizes with per-size progress */}
                                                    {printSizes.length > 0 && (
                                                        <div className="space-y-1.5">
                                                            {printSizes.map((s, i) => {
                                                                const sizeSelections = (project.printSelections || []).filter(
                                                                    sel => sel.size === s.name
                                                                )
                                                                const selectedCount = sizeSelections.length
                                                                const progressPct = s.quota > 0 ? Math.min((selectedCount / s.quota) * 100, 100) : 0
                                                                return (
                                                                    <div key={i} className="space-y-0.5">
                                                                        <div className="flex justify-between text-xs">
                                                                            <span className="text-purple-700 dark:text-purple-300 font-medium">{s.name}</span>
                                                                            <span className="text-muted-foreground">{selectedCount} / {s.quota}</span>
                                                                        </div>
                                                                        <Progress value={progressPct} className="h-1.5" />
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    )}

                                                    {/* Selected photo names */}
                                                    {(project.printSelections || []).length > 0 && (
                                                        <div className="flex flex-wrap gap-1">
                                                            {(project.printSelections || []).slice(0, 8).map((sel, i) => (
                                                                <span key={i} className="text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">
                                                                    {sel.photo}
                                                                </span>
                                                            ))}
                                                            {(project.printSelections || []).length > 8 && (
                                                                <span className="text-xs text-muted-foreground px-1.5 py-0.5">
                                                                    +{(project.printSelections || []).length - 8} {t('more')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Last synced notification */}
                                                    {project.printLastSyncedAt && (
                                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <RefreshCw className="h-3 w-3" />
                                                            <span>{t('lastSynced')}: {formatRelativeTime(project.printLastSyncedAt)}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Action buttons (right side) */}
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

                                                    {/* Reminder button */}
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 cursor-pointer text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                                        onClick={() => sendReminder(project)}
                                                        disabled={!getClientWhatsapp(project) || !project.printExpiresAt}
                                                        title={t('sendReminder')}
                                                    >
                                                        <Bell className="h-4 w-4" />
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

            {/* Mark Reviewed Confirmation Dialog */}
            <PopupDialog
                isOpen={showMarkDialog}
                onClose={() => { setShowMarkDialog(false); setMarkTargetId(null) }}
                onConfirm={handleMarkReviewed}
                title={t('confirmMarkReviewed')}
                message={t('confirmMarkReviewedMsg')}
                type="success"
                confirmText={t('markReviewed')}
                cancelText={t('cancel')}
            />

            {/* Unmark Reviewed Confirmation Dialog */}
            <PopupDialog
                isOpen={showUnmarkDialog}
                onClose={() => { setShowUnmarkDialog(false); setUnmarkTargetId(null) }}
                onConfirm={handleUnmarkReviewed}
                title={t('confirmUnmarkReviewed')}
                message={t('confirmUnmarkReviewedMsg')}
                type="warning"
                confirmText={t('unmarkReviewed')}
                cancelText={t('cancel')}
            />
        </div>
    )
}
