"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations, useLocale } from "next-intl"
import { Plus, Trash2, ExternalLink, Copy, Clock, Users, MessageCircle, Edit, CheckSquare, Square, X, PlusCircle, Search, Loader2, Bell } from "lucide-react"
import { isProjectExpired, getClientWhatsapp, generateShortId, type Project } from "@/lib/project-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PopupDialog, Toast } from "@/components/ui/popup-dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

interface ProjectListProps {

    projects: Project[]
    onCreateNew: () => void
    onOpenProject: (project: Project) => void
    onEditProject: (project: Project) => void
    onDeleteProject: (id: string) => Promise<void>
    onBatchDeleteProjects: (ids: string[]) => Promise<void>
}

export function ProjectList({
    projects,
    onCreateNew,
    onOpenProject,
    onEditProject,
    onDeleteProject,
    onBatchDeleteProjects
}: ProjectListProps) {
    const t = useTranslations('Admin')
    const tc = useTranslations('Client')
    const locale = useLocale()
    const supabase = createClient()
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [isSelectMode, setIsSelectMode] = useState(false)
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [searchQuery, setSearchQuery] = useState("")

    // Message Templates
    const [templates, setTemplates] = useState<{
        initialLink: { id: string, en: string } | null,
        extraLink: { id: string, en: string } | null,
        reminderLink: { id: string, en: string } | null
    }>({ initialLink: null, extraLink: null, reminderLink: null })
    const [vendorSlug, setVendorSlug] = useState<string | null>(null)

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase
                .from('settings')
                .select('msg_tmpl_link_initial, msg_tmpl_link_extra, msg_tmpl_reminder, vendor_name')
                .eq('user_id', user.id)
                .maybeSingle()

            if (data) {
                setTemplates({
                    initialLink: data.msg_tmpl_link_initial,
                    extraLink: data.msg_tmpl_link_extra,
                    reminderLink: data.msg_tmpl_reminder
                })
                if (data.vendor_name) {
                    const slug = data.vendor_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                    setVendorSlug(slug)
                }
            }
        } catch (err) {
            console.error("Failed to load templates", err)
        }
    }

    const compileMessage = (template: { id: string, en: string } | null, variables: Record<string, string>, isExtra: boolean) => {
        const lang = locale as 'id' | 'en'
        const tmplText = template?.[lang] || ""

        if (tmplText.trim()) {
            let msg = tmplText
            Object.entries(variables).forEach(([key, val]) => {
                msg = msg.replace(new RegExp(`{{${key}}}`, 'g'), val)
            })
            return msg
        }

        // Fallback to translation with correct variable mapping
        if (isExtra) {
            return t('waExtraMessage', {
                name: variables.client_name,
                count: variables.count,
                link: variables.link
            })
        } else {
            return tc('waClientMessage', {
                name: variables.client_name,
                link: variables.link,
                max: variables.max_photos
            })
        }
    }

    // Popup states
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false)
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
    const [showToast, setShowToast] = useState(false)
    const [toastMessage, setToastMessage] = useState("")
    const [isDeleting, setIsDeleting] = useState(false)

    // Add Extra Photos dialog states
    const [showExtraPhotosDialog, setShowExtraPhotosDialog] = useState(false)
    const [extraPhotosProject, setExtraPhotosProject] = useState<Project | null>(null)
    const [extraPhotosCount, setExtraPhotosCount] = useState("5")
    const [lockedPhotosInput, setLockedPhotosInput] = useState("")
    const [generatedExtraLink, setGeneratedExtraLink] = useState<string | null>(null)
    const [extraExpiryDays, setExtraExpiryDays] = useState("7")
    const [isGeneratingExtra, setIsGeneratingExtra] = useState(false)

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

    const ExpiryDisplay = ({ expiresAt }: { expiresAt: number | undefined }) => (
        <span suppressHydrationWarning>{formatExpiry(expiresAt)}</span>
    )

    // Helper: generate dynamic link from project ID using current vendor slug
    const buildProjectLink = (projectId: string) => {
        const origin = window.location.origin
        const pathParts = window.location.pathname.split('/')
        const loc = pathParts[1] || 'id'
        return vendorSlug
            ? `${origin}/${loc}/client/${vendorSlug}/${projectId}`
            : `${origin}/${loc}/client/${projectId}`
    }

    const copyLink = (link: string, id: string) => {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(link)
            setCopiedId(id)
            setTimeout(() => setCopiedId(null), 2000)
        } else {
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

    const openLink = (link: string) => window.open(link, '_blank')

    const sendToClient = (project: Project) => {
        const clientWa = getClientWhatsapp(project)
        if (!clientWa) {
            setToastMessage(tc('noWhatsapp') || 'WhatsApp not set')
            setShowToast(true)
            return
        }

        const dynamicLink = buildProjectLink(project.id)

        // Build variables object with conditional password and duration
        const variables: Record<string, string> = {
            client_name: project.clientName,
            link: dynamicLink,
            max_photos: project.maxPhotos.toString()
        }

        // Add password only if set
        if (project.password) {
            variables.password = project.password
        }

        // Add duration only if expiry is set
        if (project.expiresAt) {
            const now = Date.now()
            const diff = project.expiresAt - now
            if (diff > 0) {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24))
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                if (days > 0) {
                    variables.duration = `${days} ${t('days')}`
                } else if (hours > 0) {
                    variables.duration = `${hours} ${t('hours')}`
                } else {
                    variables.duration = t('lessThanHour')
                }
            }
        }

        const message = compileMessage(templates.initialLink, variables, false)
        window.open(`https://wa.me/${clientWa}?text=${encodeURIComponent(message)}`, '_blank')
    }

    const sendReminder = (project: Project) => {
        const clientWa = getClientWhatsapp(project)
        if (!clientWa) {
            setToastMessage(tc('noWhatsapp') || 'WhatsApp not set')
            setShowToast(true)
            return
        }

        const dynamicLink = buildProjectLink(project.id)
        const duration = formatExpiry(project.expiresAt)

        const variables: Record<string, string> = {
            client_name: project.clientName,
            link: dynamicLink,
            duration: duration
        }

        const message = compileMessage(templates.reminderLink, variables, false)
        if (!message || !templates.reminderLink?.id) {
            // Fallback to default if no custom template
            const fallbackMessage = t('waReminderMessage', {
                name: project.clientName,
                link: dynamicLink,
                duration: duration
            })
            window.open(`https://wa.me/${clientWa}?text=${encodeURIComponent(fallbackMessage)}`, '_blank')
        } else {
            window.open(`https://wa.me/${clientWa}?text=${encodeURIComponent(message)}`, '_blank')
        }
    }

    const handleDeleteClick = (projectId: string) => {
        setDeleteTargetId(projectId)
        setShowDeleteDialog(true)
    }

    const confirmDelete = async () => {
        if (deleteTargetId) {
            setIsDeleting(true)
            try {
                await onDeleteProject(deleteTargetId)
                setToastMessage(t('deleted'))
                setShowToast(true)
            } catch (error) {
                setToastMessage("Failed to delete project")
                setShowToast(true)
            } finally {
                setIsDeleting(false)
                setDeleteTargetId(null)
                setShowDeleteDialog(false)
            }
        }
    }

    const toggleSelect = (projectId: string) => {
        setSelectedIds(prev =>
            prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
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

    const confirmBatchDelete = async () => {
        setIsDeleting(true)
        try {
            await onBatchDeleteProjects(selectedIds)
            setToastMessage(t('deleted'))
            setShowToast(true)
            setSelectedIds([])
            setIsSelectMode(false)
        } catch (error) {
            setToastMessage("Failed to delete projects")
            setShowToast(true)
        } finally {
            setIsDeleting(false)
            setShowBatchDeleteDialog(false)
        }
    }

    const cancelSelectMode = () => {
        setIsSelectMode(false)
        setSelectedIds([])
    }

    const openExtraPhotosDialog = (project: Project) => {
        setExtraPhotosProject(project)
        setExtraPhotosCount("5")
        setLockedPhotosInput("")
        setGeneratedExtraLink(null)
        setShowExtraPhotosDialog(true)
    }

    const generateExtraLink = async () => {
        if (!extraPhotosProject) return
        setIsGeneratingExtra(true)
        try {
            const extraPhotosNum = parseInt(extraPhotosCount) || 5
            const lockedPhotosArray = lockedPhotosInput.split('\n').map(l => l.trim()).filter(l => l.length > 0)
            const totalMaxPhotos = lockedPhotosArray.length + extraPhotosNum

            const newProjectId = generateShortId()
            const newLink = buildProjectLink(newProjectId)
            const expiryDaysNum = extraExpiryDays ? parseInt(extraExpiryDays) : undefined

            const projectPayload: Project = {
                id: newProjectId,
                clientName: extraPhotosProject.clientName,
                gdriveLink: extraPhotosProject.gdriveLink,
                clientWhatsapp: extraPhotosProject.clientWhatsapp || '',
                adminWhatsapp: extraPhotosProject.adminWhatsapp || (extraPhotosProject as any).whatsapp || '',
                countryCode: extraPhotosProject.countryCode || 'ID',
                maxPhotos: totalMaxPhotos,
                password: extraPhotosProject.password,
                detectSubfolders: extraPhotosProject.detectSubfolders,
                lockedPhotos: lockedPhotosArray.length > 0 ? lockedPhotosArray : undefined,
                createdAt: Date.now(),
                expiresAt: expiryDaysNum ? Date.now() + (expiryDaysNum * 24 * 60 * 60 * 1000) : undefined,
                link: newLink
            }

            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectPayload)
            })

            if (!res.ok) {
                const errData = await res.json()
                throw new Error(errData.message || 'Failed to create extra project')
            }

            setGeneratedExtraLink(newLink)
        } catch (err: any) {
            setToastMessage(err.message || 'Failed to generate extra link')
            setShowToast(true)
        } finally {
            setIsGeneratingExtra(false)
        }
    }

    const copyExtraLink = () => {
        if (!generatedExtraLink) return
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(generatedExtraLink)
            setToastMessage(tc('copied'))
            setShowToast(true)
        }
    }

    const closeExtraPhotosDialog = () => {
        setShowExtraPhotosDialog(false)
        setExtraPhotosProject(null)
        setGeneratedExtraLink(null)
    }

    // Filter projects by search query
    const filteredProjects = searchQuery.trim()
        ? projects.filter(p => p.clientName.toLowerCase().includes(searchQuery.toLowerCase()))
        : projects

    if (projects.length === 0) {
        return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12 space-y-4">
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
                            <Button onClick={toggleSelectAll} size="sm" variant="outline" className="gap-2 cursor-pointer">
                                {selectedIds.length === projects.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                                {selectedIds.length === projects.length ? tc('clearSelection') : t('manage')}
                            </Button>
                            <Button onClick={handleBatchDeleteClick} size="sm" variant="destructive" className="gap-2 cursor-pointer" disabled={selectedIds.length === 0}>
                                <Trash2 className="h-4 w-4" />
                                {t('delete')} ({selectedIds.length})
                            </Button>
                            <Button onClick={cancelSelectMode} size="sm" variant="ghost" className="cursor-pointer">
                                <X className="h-4 w-4" />
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button onClick={() => setIsSelectMode(true)} size="sm" variant="outline" className="gap-2 cursor-pointer">
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

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                    className="pl-9"
                />
            </div>

            <div className="grid gap-3 overflow-hidden max-w-full">
                <AnimatePresence mode="popLayout">
                    {filteredProjects.map((project, index) => {
                        const expired = isProjectExpired(project)
                        const isSelected = selectedIds.includes(project.id)
                        const dynamicLink = buildProjectLink(project.id)
                        return (
                            <motion.div key={project.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }} transition={{ delay: index * 0.05 }} className="overflow-hidden max-w-full">
                                <Card className={cn("overflow-hidden transition-all hover:shadow-md", expired && "opacity-60 border-destructive/30", isSelected && "border-primary bg-primary/5", !isSelected && !expired && project.lockedPhotos && project.lockedPhotos.length > 0 && "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-600")}>
                                    <CardContent className="p-4 overflow-hidden">
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 w-full overflow-hidden">
                                            {isSelectMode && (
                                                <button onClick={() => toggleSelect(project.id)} className="mt-1 cursor-pointer">
                                                    {isSelected ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5 text-muted-foreground" />}
                                                </button>
                                            )}
                                            <div className="flex-1 min-w-0 space-y-1 overflow-hidden max-w-full">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                                                    <h4 className="font-semibold truncate flex-1 min-w-0 cursor-pointer hover:text-primary hover:underline transition-colors" onClick={() => onEditProject(project)} title={`Edit ${project.clientName}`}>{project.clientName}</h4>
                                                    {project.lockedPhotos && project.lockedPhotos.length > 0 && (
                                                        <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded shrink-0">📷 {t('extraPhotosBadge')}</span>
                                                    )}
                                                    {expired && <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded shrink-0">{t('expired')}</span>}
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1 shrink-0">📸 {project.maxPhotos} {t('photo')}</span>
                                                    <span className="flex items-center gap-1 shrink-0"><Clock className="h-3 w-3" /><ExpiryDisplay expiresAt={project.expiresAt} /></span>
                                                </div>
                                                <p className="text-xs text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap block" style={{ maxWidth: 'min(100%, calc(100vw - 100px))' }}>🔗 {dynamicLink}</p>
                                            </div>
                                            {!isSelectMode && (
                                                <div className="flex items-center gap-1 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 mt-2 sm:mt-0 border-border/50">
                                                    <Button size="icon" variant="ghost" onClick={() => copyLink(dynamicLink, project.id)} className="h-8 w-8 cursor-pointer" title={t('copyLink')}>{copiedId === project.id ? <span className="text-green-500 text-xs">✓</span> : <Copy className="h-4 w-4" />}</Button>
                                                    <Button size="icon" variant="ghost" onClick={() => sendToClient(project)} className="h-8 w-8 cursor-pointer text-green-600 hover:text-green-700" disabled={expired} title={t('sendToClient')}><MessageCircle className="h-4 w-4" /></Button>
                                                    <Button size="icon" variant="ghost" onClick={() => sendReminder(project)} className="h-8 w-8 cursor-pointer text-amber-600 hover:text-amber-700" disabled={expired || !project.expiresAt} title={t('sendReminder')}><Bell className="h-4 w-4" /></Button>
                                                    <Button size="icon" variant="ghost" onClick={() => openLink(dynamicLink)} className="h-8 w-8 cursor-pointer" disabled={expired} title={t('openLink')}><ExternalLink className="h-4 w-4" /></Button>
                                                    <Button size="icon" variant="ghost" onClick={() => onEditProject(project)} className="h-8 w-8 cursor-pointer text-blue-600 hover:text-blue-700" title={t('editProject')}><Edit className="h-4 w-4" /></Button>
                                                    <Button size="icon" variant="ghost" onClick={() => openExtraPhotosDialog(project)} className="h-8 w-8 cursor-pointer text-amber-600 hover:text-amber-700" disabled={expired} title={t('addExtraPhotos')}><PlusCircle className="h-4 w-4" /></Button>
                                                    <Button size="icon" variant="ghost" onClick={() => handleDeleteClick(project.id)} className="h-8 w-8 text-destructive hover:text-destructive cursor-pointer" title={t('delete')}><Trash2 className="h-4 w-4" /></Button>
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

            <PopupDialog isOpen={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} onConfirm={confirmDelete} title={t('confirmDelete')} message={t('confirmDeleteSingle')} type="danger" confirmText={isDeleting ? "Deleting..." : t('delete')} cancelText={t('cancel')} />
            <PopupDialog isOpen={showBatchDeleteDialog} onClose={() => setShowBatchDeleteDialog(false)} onConfirm={confirmBatchDelete} title={t('confirmDelete')} message={t('confirmDeleteMsg', { count: selectedIds.length })} type="danger" confirmText={isDeleting ? "Deleting..." : t('deleteSelected')} cancelText={t('cancel')} />
            <Toast isOpen={showToast} message={toastMessage} type="success" onClose={() => setShowToast(false)} />

            {showExtraPhotosDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-background rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold flex items-center gap-2"><PlusCircle className="h-5 w-5 text-amber-600" />{t('addExtraPhotosTitle')}</h2>
                            <Button size="icon" variant="ghost" onClick={closeExtraPhotosDialog} className="h-8 w-8 cursor-pointer"><X className="h-4 w-4" /></Button>
                        </div>
                        <p className="text-sm text-muted-foreground">{extraPhotosProject?.clientName}</p>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">📷 {t('extraPhotosCount')}</label>
                            <Input type="number" min="1" value={extraPhotosCount} onChange={(e) => setExtraPhotosCount(e.target.value)} placeholder="5" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">🔒 {t('previouslySelectedPhotos')}</label>
                            <textarea className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none" placeholder={t('previouslySelectedHint')} value={lockedPhotosInput} onChange={(e) => setLockedPhotosInput(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">⏰ {t('extraLinkDuration')}</label>
                            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer" value={extraExpiryDays} onChange={(e) => setExtraExpiryDays(e.target.value)}>
                                <option value="1">1 {t('days')}</option>
                                <option value="3">3 {t('days')}</option>
                                <option value="7">7 {t('days')}</option>
                                <option value="14">14 {t('days')}</option>
                                <option value="30">30 {t('days')}</option>
                            </select>
                        </div>
                        {!generatedExtraLink ? (
                            <Button onClick={generateExtraLink} className="w-full cursor-pointer" disabled={!extraPhotosCount || isGeneratingExtra}>
                                {isGeneratingExtra ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('generatingExtraLink')}</>) : (<>✨ {t('generateExtraLink')}</>)}
                            </Button>
                        ) : (
                            <div className="space-y-3">
                                <div className="p-3 bg-muted rounded-lg break-all text-sm">{generatedExtraLink}</div>
                                <div className="flex gap-2">
                                    <Button onClick={copyExtraLink} variant="outline" className="flex-1 cursor-pointer"><Copy className="h-4 w-4 mr-2" />{t('copyLink')}</Button>
                                    <Button onClick={() => window.open(generatedExtraLink, '_blank')} variant="outline" className="flex-1 cursor-pointer"><ExternalLink className="h-4 w-4 mr-2" />{t('openLink')}</Button>
                                </div>
                                <Button onClick={() => {
                                    const clientWa = extraPhotosProject?.clientWhatsapp || ''
                                    if (!clientWa) { setToastMessage(tc('noWhatsapp')); setShowToast(true); return }
                                    const extraCount = parseInt(extraPhotosCount) || 5

                                    // Build variables with conditional password and duration
                                    const variables: Record<string, string> = {
                                        client_name: extraPhotosProject?.clientName || '',
                                        link: generatedExtraLink,
                                        count: extraCount.toString()
                                    }

                                    // Add password only if set
                                    if (extraPhotosProject?.password) {
                                        variables.password = extraPhotosProject.password
                                    }

                                    // Add duration based on extra expiry
                                    const expiryMs = parseInt(extraExpiryDays) * 24 * 60 * 60 * 1000
                                    const expiryDate = Date.now() + expiryMs
                                    const days = parseInt(extraExpiryDays)
                                    if (days > 0) {
                                        variables.duration = `${days} ${t('days')}`
                                    }

                                    const message = compileMessage(templates.extraLink, variables, true)

                                    window.open(`https://wa.me/${clientWa}?text=${encodeURIComponent(message)}`, '_blank')
                                }} className="w-full bg-green-600 hover:bg-green-700 text-white cursor-pointer"><MessageCircle className="h-4 w-4 mr-2" />{t('sendToClientWa')}</Button>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}

        </div>
    )
}
