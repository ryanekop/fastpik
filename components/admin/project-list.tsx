"use client"

import { useState, useEffect, useRef, DragEvent, MouseEvent as ReactMouseEvent } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations, useLocale } from "next-intl"
import { Plus, Trash2, ExternalLink, Copy, Clock, Users, MessageCircle, Edit, CheckSquare, Square, X, PlusCircle, Search, Loader2, Bell, FolderOpen, ArrowUpDown, Move, ChevronRight, ChevronDown, Home, FolderPlus, FileText, Zap, LayoutList, Printer, ImagePlus } from "lucide-react"
import { isProjectExpired, getClientWhatsapp, generateShortId, type Project } from "@/lib/project-store"
import type { Folder } from "@/lib/supabase/folders"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PopupDialog, Toast } from "@/components/ui/popup-dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

interface ProjectListProps {
    projects: Project[]
    folders: Folder[]
    currentFolderId: string | null
    breadcrumbPath: { id: string | null; name: string }[]
    currentDepth: number
    onNavigateToFolder: (folderId: string | null) => void
    onCreateNew: () => void
    onBatchClick: () => void
    onOpenProject: (project: Project) => void
    onEditProject: (project: Project, focus?: 'extra' | 'print' | null) => void
    onDeleteProject: (id: string) => Promise<void>
    onBatchDeleteProjects: (ids: string[]) => Promise<void>
    onFoldersChanged: () => void
    onProjectsChanged?: (updater: (prev: Project[]) => Project[]) => void
}

export function ProjectList({
    projects,
    folders,
    currentFolderId,
    breadcrumbPath,
    currentDepth,
    onNavigateToFolder,
    onCreateNew,
    onBatchClick,
    onOpenProject,
    onEditProject,
    onDeleteProject,
    onBatchDeleteProjects,
    onFoldersChanged,
    onProjectsChanged
}: ProjectListProps) {
    const t = useTranslations('Admin')
    const tc = useTranslations('Client')
    const locale = useLocale()
    const supabase = createClient()
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null)
    const [isSelectMode, setIsSelectMode] = useState(false)
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [settingsLoaded, setSettingsLoaded] = useState(false)
    const [clientLinkBase, setClientLinkBase] = useState("")
    const [projectLinks, setProjectLinks] = useState<Record<string, string>>({})

    // Message Templates
    const [templates, setTemplates] = useState<{
        initialLink: { id: string, en: string } | null,
        extraLink: { id: string, en: string } | null,
        reminderLink: { id: string, en: string } | null,
        reminderExtraLink: { id: string, en: string } | null,
        reminderPrintLink: { id: string, en: string } | null,
        rawRequest: { id: string, en: string } | null
    }>({ initialLink: null, extraLink: null, reminderLink: null, reminderExtraLink: null, reminderPrintLink: null, rawRequest: null })
    const [vendorSlug, setVendorSlug] = useState<string | null>(null)
    const [dashboardDurationDisplay, setDashboardDurationDisplay] = useState<'selection' | 'download'>('selection')

    useEffect(() => {
        loadSettings()
    }, [])

    useEffect(() => {
        if (!settingsLoaded) return

        const pathParts = window.location.pathname.split('/')
        const loc = pathParts[1] || 'id'
        const base = vendorSlug
            ? `${window.location.origin}/${loc}/client/${vendorSlug}`
            : `${window.location.origin}/${loc}/client`

        setClientLinkBase(base)
        setProjectLinks(Object.fromEntries(projects.map((project) => [project.id, `${base}/${project.id}`])))
    }, [projects, settingsLoaded, vendorSlug])

    // Close sort menu on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
                setShowSortMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const loadSettings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase
                .from('settings')
                .select('msg_tmpl_link_initial, msg_tmpl_link_extra, msg_tmpl_reminder, msg_tmpl_reminder_extra, msg_tmpl_reminder_print, msg_tmpl_link_initial_print, msg_tmpl_raw_request, vendor_name, dashboard_duration_display, default_expiry_days, default_download_expiry_days, print_enabled, print_templates, default_print_expiry_days')
                .eq('user_id', user.id)
                .maybeSingle()

            if (data) {
                setTemplates({
                    initialLink: data.msg_tmpl_link_initial,
                    extraLink: data.msg_tmpl_link_extra,
                    reminderLink: data.msg_tmpl_reminder,
                    reminderExtraLink: data.msg_tmpl_reminder_extra,
                    reminderPrintLink: data.msg_tmpl_reminder_print,
                    rawRequest: data.msg_tmpl_raw_request
                })
                if (data.vendor_name) {
                    const slug = data.vendor_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                    setVendorSlug(slug)
                }
                setDashboardDurationDisplay(data.dashboard_duration_display || 'selection')
                // Print config
                if (data.print_enabled) {
                    setPrintEnabled(true)
                    setPrintTemplates(data.print_templates || [])
                    if (data.default_print_expiry_days) {
                        setPrintExpiryDays(data.default_print_expiry_days.toString())
                    }
                }
                if (data.msg_tmpl_link_initial_print) {
                    setPrintWaTemplate(data.msg_tmpl_link_initial_print)
                }
                // Load defaults for extra photos popup
                const standardOptions = ['', '1', '3', '5', '7', '14', '30']
                if (data.default_expiry_days) {
                    const val = data.default_expiry_days.toString()
                    setExtraExpiryDays(val)
                    if (!standardOptions.includes(val)) {
                        const days = data.default_expiry_days
                        const months = Math.floor(days / 30)
                        const remainDays = days % 30
                        const parts: string[] = []
                        if (months > 0) parts.push(`${months} ${t('customMonthsLabel')}`)
                        if (remainDays > 0 || parts.length === 0) parts.push(`${remainDays > 0 ? remainDays : days} ${t('customDaysLabel')}`)
                        setCustomExtraExpiryLabel(parts.join(' '))
                    }
                }
                if (data.default_download_expiry_days) {
                    const val = data.default_download_expiry_days.toString()
                    setExtraDownloadExpiryDays(val)
                    if (!standardOptions.includes(val)) {
                        const days = data.default_download_expiry_days
                        const months = Math.floor(days / 30)
                        const remainDays = days % 30
                        const parts: string[] = []
                        if (months > 0) parts.push(`${months} ${t('customMonthsLabel')}`)
                        if (remainDays > 0 || parts.length === 0) parts.push(`${remainDays > 0 ? remainDays : days} ${t('customDaysLabel')}`)
                        setCustomExtraDownloadExpiryLabel(parts.join(' '))
                    }
                }
            }
        } catch (err) {
            console.error("Failed to load templates", err)
        } finally {
            setSettingsLoaded(true)
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
            // Remove any unreplaced variables (e.g. {{download_duration}} when not set)
            msg = msg.replace(/{{(\w+)}}/g, '').replace(/\n{3,}/g, '\n\n').trim()
            return msg
        }

        // Fallback: build a default message that includes password & duration if available
        const namePart = variables.client_name
        const linkPart = variables.link
        const countPart = isExtra ? variables.count : (variables.max_photos || variables.count)

        let fallback = isExtra
            ? t('waExtraMessage', { name: namePart, count: countPart, link: linkPart })
            : tc('waClientMessage', { name: namePart, link: linkPart, max: countPart })

        // Append password info if available
        if (variables.password) {
            fallback += `\n\n🔐 Password: ${variables.password}`
        }
        // Append duration info if available
        if (variables.duration) {
            fallback += `\n⏰ ${locale === 'id' ? 'Berlaku pilih foto' : 'Selection valid for'}: ${variables.duration}`
        }
        // Append download duration if available
        if (variables.download_duration) {
            fallback += `\n📥 ${locale === 'id' ? 'Berlaku download' : 'Download valid for'}: ${variables.download_duration}`
        }
        // Append print duration if available
        if (variables.print_duration) {
            fallback += `\n🖨️ ${locale === 'id' ? 'Berlaku pilih cetak' : 'Print selection valid for'}: ${variables.print_duration}`
        }
        return fallback
    }

    const compileTemplateOnly = (template: { id: string, en: string } | null, variables: Record<string, string>) => {
        const lang = locale as 'id' | 'en'
        const tmplText = template?.[lang] || ""
        if (!tmplText.trim()) return null
        let msg = tmplText
        Object.entries(variables).forEach(([key, val]) => {
            msg = msg.replace(new RegExp(`{{${key}}}`, 'g'), val)
        })
        return msg.replace(/{{(\w+)}}/g, '').replace(/\n{3,}/g, '\n\n').trim()
    }

    const getExtraPhotoQuota = (project: Project) => {
        if (project.extraEnabled) return project.extraMaxPhotos || 0
        return Math.max((project.maxPhotos || 0) - (project.lockedPhotos || []).length, 0)
    }

    const getPrintSizesText = (project: Project) => (project.printSizes || [])
        .map((s: any) => `${s.name}×${s.quota}`)
        .join(', ')

    const hasExtraAction = (project: Project) => !!project.extraEnabled || (!project.extraEnabled && !!(project.lockedPhotos && project.lockedPhotos.length > 0))
    const hasPrintAction = (project: Project) => project.projectType === 'print' || !!(project.printEnabled && (project.printSizes || []).length > 0)
    const getFreelancerOptions = (project: Project | null) => (project?.freelancersSnapshot || [])
        .filter((freelancer) => freelancer.name?.trim() && freelancer.whatsapp?.trim())

    const canSendProjectToFreelancer = (project: Project | null) => {
        return getFreelancerOptions(project).length > 0 && (project?.selectedPhotos || []).length > 0
    }

    const getClientLinkVariables = (project: Project, link: string, mode: 'client' | 'extra' | 'print') => {
        const variables: Record<string, string> = {
            client_name: project.clientName,
            link,
            count: mode === 'extra'
                ? getExtraPhotoQuota(project).toString()
                : mode === 'print'
                    ? (project.printSizes || []).reduce((sum: number, s: any) => sum + (Number(s.quota) || 0), 0).toString()
                    : project.maxPhotos.toString(),
            max_photos: project.maxPhotos.toString(),
            print_sizes: getPrintSizesText(project),
        }

        if (project.password) {
            variables.password = project.password
        }

        const addDuration = (key: 'duration' | 'download_duration' | 'print_duration', expiresAt: number | null | undefined) => {
            if (!expiresAt) return
            const diff = expiresAt - Date.now()
            if (diff <= 0) return
            const days = Math.floor(diff / 86400000)
            const hours = Math.floor((diff % 86400000) / 3600000)
            if (days > 0) variables[key] = `${days} ${t('days')}`
            else if (hours > 0) variables[key] = `${hours} ${t('hours')}`
            else variables[key] = t('lessThanHour')
        }

        addDuration('duration', project.expiresAt)
        addDuration('download_duration', project.downloadExpiresAt)
        addDuration('print_duration', project.printExpiresAt)

        return variables
    }

    const buildPrintLinkMessage = (project: Project, variables: Record<string, string>) => {
        const customMessage = compileTemplateOnly(printWaTemplate, variables)
        if (customMessage) return customMessage

        let message = locale === 'id'
            ? `Halo ${project.clientName}! 🖨️\n\nSilakan buka link berikut lalu pilih menu Cetak Foto:\n${variables.link}`
            : `Hello ${project.clientName}! 🖨️\n\nPlease open this link and choose the Print Photos menu:\n${variables.link}`
        if (variables.print_sizes) {
            message += `\n\n${t('printSizes')}: ${variables.print_sizes}`
        }
        if (variables.password) {
            message += `\n\n🔐 Password: ${variables.password}`
        }
        if (variables.print_duration) {
            message += `\n⏰ ${t('printDuration')}: ${variables.print_duration}`
        }
        return message
    }

    // Popup states
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false)
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
    const [copyActionPopup, setCopyActionPopup] = useState<{ open: boolean; project: Project | null }>({ open: false, project: null })
    const [whatsappActionPopup, setWhatsappActionPopup] = useState<{ open: boolean; project: Project | null }>({ open: false, project: null })
    const [toast, setToast] = useState<{ open: boolean; message: string; type: 'info' | 'success' | 'warning' | 'danger' }>({ open: false, message: "", type: "success" })
    const [isDeleting, setIsDeleting] = useState(false)

    // Add Extra Photos dialog states
    const [showExtraPhotosDialog, setShowExtraPhotosDialog] = useState(false)
    const [extraPhotosProject, setExtraPhotosProject] = useState<Project | null>(null)
    const [extraPhotosCount, setExtraPhotosCount] = useState("5")
    const [lockedPhotosInput, setLockedPhotosInput] = useState("")
    const [generatedExtraLink, setGeneratedExtraLink] = useState<string | null>(null)
    const [extraExpiryDays, setExtraExpiryDays] = useState("7")
    const [extraDownloadExpiryDays, setExtraDownloadExpiryDays] = useState("14")
    const [isGeneratingExtra, setIsGeneratingExtra] = useState(false)
    const [showCustomExtraExpiryDialog, setShowCustomExtraExpiryDialog] = useState(false)
    const [customExtraTarget, setCustomExtraTarget] = useState<'selection' | 'download'>('selection')
    const [customExtraMonths, setCustomExtraMonths] = useState("")
    const [customExtraDays, setCustomExtraDays] = useState("")
    const [customExtraExpiryLabel, setCustomExtraExpiryLabel] = useState<string | null>(null)
    const [customExtraDownloadExpiryLabel, setCustomExtraDownloadExpiryLabel] = useState<string | null>(null)

    // Print dialog states
    const [showPrintDialog, setShowPrintDialog] = useState(false)
    const [printProject, setPrintProject] = useState<Project | null>(null)
    const [printTemplates, setPrintTemplates] = useState<{ name: string, sizes: { name: string, quota: number }[] }[]>([])
    const [printEnabled, setPrintEnabled] = useState(false)
    const [selectedPrintTemplateIdx, setSelectedPrintTemplateIdx] = useState<number | 'custom'>(-1 as any)
    const [customPrintSizes, setCustomPrintSizes] = useState<{ name: string, quota: number }[]>([{ name: '', quota: 1 }])
    const [printExpiryDays, setPrintExpiryDays] = useState("7")
    const [generatedPrintLink, setGeneratedPrintLink] = useState<string | null>(null)
    const [isGeneratingPrint, setIsGeneratingPrint] = useState(false)
    const [printWaTemplate, setPrintWaTemplate] = useState<{ id: string, en: string } | null>(null)
    const [showCustomPrintExpiryDialog, setShowCustomPrintExpiryDialog] = useState(false)
    const [customPrintMonths, setCustomPrintMonths] = useState("")
    const [customPrintDays, setCustomPrintDays] = useState("")
    const [customPrintExpiryLabel, setCustomPrintExpiryLabel] = useState<string | null>(null)

    // Folder states
    const [sortByExpiry, setSortByExpiry] = useState<{ type: 'selection' | 'download'; direction: 'asc' | 'desc' } | null>(null)
    const [showSortMenu, setShowSortMenu] = useState(false)
    const sortMenuRef = useRef<HTMLDivElement>(null)
    const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([])
    const [showMoveDialog, setShowMoveDialog] = useState(false)
    const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
    const [newFolderName, setNewFolderName] = useState("")
    const [showRenameFolderDialog, setShowRenameFolderDialog] = useState(false)
    const [renameFolderId, setRenameFolderId] = useState<string | null>(null)
    const [renameFolderName, setRenameFolderName] = useState("")
    const [showDeleteFolderDialog, setShowDeleteFolderDialog] = useState(false)
    const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null)
    const [dragOverBreadcrumb, setDragOverBreadcrumb] = useState<string | null>(null)
    const [dragOverFolder, setDragOverFolder] = useState<string | null>(null)
    const [isFolderLoading, setIsFolderLoading] = useState(false)

    const formatExpiry = (expiresAt: number | null | undefined): string => {
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

    const ExpiryDisplay = ({ expiresAt }: { expiresAt: number | null | undefined }) => (
        <span suppressHydrationWarning>{formatExpiry(expiresAt)}</span>
    )

    const showAdminToast = (message: string, type: 'info' | 'success' | 'warning' | 'danger' = 'success') => {
        setToast({ open: true, message, type })
    }

    // Helper: generate dynamic link from project ID using current vendor slug
    const buildProjectLink = (projectId: string) => {
        return clientLinkBase ? `${clientLinkBase}/${projectId}` : ''
    }

    const handleProjectActionClick = (event: ReactMouseEvent<HTMLElement>, action: () => void) => {
        event.preventDefault()
        event.stopPropagation()
        action()
    }

    type ActionTone = 'violet' | 'green' | 'blue' | 'slate' | 'cyan' | 'amber' | 'indigo' | 'red'
    const actionToneClasses: Record<ActionTone, string> = {
        violet: "border-violet-200 bg-violet-50/70 text-violet-600 hover:bg-violet-100 hover:text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300 dark:hover:bg-violet-900/40",
        green: "border-green-200 bg-green-50/70 text-green-600 hover:bg-green-100 hover:text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300 dark:hover:bg-green-900/40",
        blue: "border-blue-200 bg-blue-50/70 text-blue-600 hover:bg-blue-100 hover:text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-900/40",
        slate: "border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70",
        cyan: "border-cyan-200 bg-cyan-50/70 text-cyan-600 hover:bg-cyan-100 hover:text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-300 dark:hover:bg-cyan-900/40",
        amber: "border-amber-200 bg-amber-50/70 text-amber-600 hover:bg-amber-100 hover:text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-900/40",
        indigo: "border-indigo-200 bg-indigo-50/70 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300 dark:hover:bg-indigo-900/40",
        red: "border-red-200 bg-red-50/70 text-red-600 hover:bg-red-100 hover:text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-900/40",
    }
    const actionButtonClass = (tone: ActionTone) => cn(
        "h-8 w-8 rounded-md border cursor-pointer transition-colors",
        actionToneClasses[tone]
    )
    const splitButtonWrapperClass = (tone: ActionTone) => cn(
        "hidden h-8 overflow-hidden rounded-md border sm:inline-flex",
        actionToneClasses[tone]
    )
    const splitMainButtonClass = (tone: ActionTone) => cn(
        "h-8 w-8 rounded-none border-0 bg-transparent p-0 cursor-pointer hover:bg-transparent",
        actionToneClasses[tone]
    )
    const splitChevronButtonClass = (tone: ActionTone) => cn(
        "h-8 w-7 rounded-none border-0 border-l bg-transparent p-0 cursor-pointer hover:bg-transparent",
        actionToneClasses[tone],
        tone === 'red' ? "border-red-200 dark:border-red-800"
            : tone === 'green' ? "border-green-200 dark:border-green-800"
                : tone === 'violet' ? "border-violet-200 dark:border-violet-800"
                    : tone === 'blue' ? "border-blue-200 dark:border-blue-800"
                        : tone === 'cyan' ? "border-cyan-200 dark:border-cyan-800"
                            : tone === 'amber' ? "border-amber-200 dark:border-amber-800"
                                : tone === 'indigo' ? "border-indigo-200 dark:border-indigo-800"
                                    : "border-slate-200 dark:border-slate-700"
    )
    const projectActionPlaceholderClass = "inline-flex h-8 w-8 shrink-0 invisible"

    const copyText = (text: string, onCopied: () => void) => {
        if (!text) {
            showAdminToast(t('copyFailed'), 'danger')
            return
        }
        const fallbackCopy = () => {
            const textArea = document.createElement("textarea")
            textArea.value = text
            textArea.style.position = "fixed"
            textArea.style.left = "-9999px"
            document.body.appendChild(textArea)
            textArea.focus()
            textArea.select()
            try {
                const copied = document.execCommand('copy')
                if (!copied) throw new Error('Copy command failed')
                onCopied()
            } catch (err) {
                console.error('Failed to copy', err)
                showAdminToast(t('copyFailed'), 'danger')
            } finally {
                document.body.removeChild(textArea)
            }
        }

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(onCopied).catch(fallbackCopy)
        } else {
            fallbackCopy()
        }
    }

    const copyLink = (link: string, id: string) => {
        copyText(link, () => {
            setCopiedId(id)
            showAdminToast(t('copySuccess'), 'success')
            setTimeout(() => setCopiedId(null), 2000)
        })
    }

    const openLink = (link: string) => {
        if (!link) return
        window.open(link, '_blank')
    }

    const sendToClient = (project: Project, mode: 'client' | 'extra' | 'print' = 'client') => {
        const clientWa = getClientWhatsapp(project)
        if (!clientWa) {
            showAdminToast(tc('noWhatsapp') || 'WhatsApp not set', 'danger')
            return
        }

        const dynamicLink = buildProjectLink(project.id)
        if (!dynamicLink) return

        const variables = getClientLinkVariables(project, dynamicLink, mode)
        const message = mode === 'print'
            ? buildPrintLinkMessage(project, variables)
            : compileMessage(mode === 'extra' ? templates.extraLink : templates.initialLink, variables, mode === 'extra')
        window.open(`https://api.whatsapp.com/send/?phone=${clientWa}&text=${encodeURIComponent(message)}`, '_blank')
    }

    const sendToFreelancer = (project: Project, freelancer: { name: string; whatsapp: string }) => {
        const selectedPhotos = (project.selectedPhotos || []).filter(Boolean)
        if (selectedPhotos.length === 0) {
            showAdminToast(t('selectedPhotosList') || 'No selected photos', 'danger')
            return
        }
        const dynamicLink = buildProjectLink(project.id)
        if (!dynamicLink) return

        const selectedList = selectedPhotos.join('\n')
        const variables = {
            client_name: project.clientName,
            selected_count: selectedPhotos.length.toString(),
            selected_list: selectedList,
            project_link: dynamicLink,
        }
        const message = compileTemplateOnly(templates.rawRequest, variables) || t('waRawRequestMessage', {
            freelancer: freelancer.name,
            name: project.clientName,
            count: selectedPhotos.length,
            link: dynamicLink,
            list: selectedList,
        })
        window.open(`https://api.whatsapp.com/send/?phone=${freelancer.whatsapp}&text=${encodeURIComponent(message)}`, '_blank')
    }

    const buildTemplateMessageForProject = (project: Project, mode: 'client' | 'extra' | 'print') => {
        const dynamicLink = buildProjectLink(project.id)
        if (!dynamicLink) return ''

        const variables = getClientLinkVariables(project, dynamicLink, mode)
        if (mode === 'print') {
            return buildPrintLinkMessage(project, variables)
        }
        return compileMessage(mode === 'extra' ? templates.extraLink : templates.initialLink, variables, mode === 'extra')
    }

    const copyTemplateForProject = (project: Project, mode: 'client' | 'extra' | 'print' = 'client') => {
        const message = buildTemplateMessageForProject(project, mode)
        copyText(message, () => {
            setCopiedTemplateId(project.id)
            showAdminToast(t('templateCopied'), 'success')
            setTimeout(() => setCopiedTemplateId(null), 2000)
        })
    }

    const sendReminder = (project: Project) => {
        const clientWa = getClientWhatsapp(project)
        if (!clientWa) {
            showAdminToast(tc('noWhatsapp') || 'WhatsApp not set', 'danger')
            return
        }

        const dynamicLink = buildProjectLink(project.id)
        if (!dynamicLink) return

        const variables: Record<string, string> = {
            client_name: project.clientName,
            link: dynamicLink,
            count: project.maxPhotos.toString(),
            max_photos: project.maxPhotos.toString() // backward compatibility
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

        // Add download duration if set
        if (project.downloadExpiresAt) {
            const now = Date.now()
            const diff = project.downloadExpiresAt - now
            if (diff > 0) {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24))
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                if (days > 0) {
                    variables.download_duration = `${days} ${t('days')}`
                } else if (hours > 0) {
                    variables.download_duration = `${hours} ${t('hours')}`
                } else {
                    variables.download_duration = t('lessThanHour')
                }
            }
        }

        // Add print-specific variables for print projects
        if (project.projectType === 'print') {
            if (project.printSizes && project.printSizes.length > 0) {
                variables.print_sizes = project.printSizes.map(s => `${s.name}×${s.quota}`).join(', ')
            }
            if (project.printExpiresAt) {
                const now = Date.now()
                const diff = project.printExpiresAt - now
                if (diff > 0) {
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                    if (days > 0) {
                        variables.print_duration = `${days} ${t('days')}`
                        // Use print_duration as duration if no regular expiresAt
                        if (!variables.duration) variables.duration = variables.print_duration
                    } else if (hours > 0) {
                        variables.print_duration = `${hours} ${t('hours')}`
                        if (!variables.duration) variables.duration = variables.print_duration
                    } else {
                        variables.print_duration = t('lessThanHour')
                        if (!variables.duration) variables.duration = variables.print_duration
                    }
                }
            }
        }

        // Determine project category: print, extra, or original
        const isPrint = project.projectType === 'print' || !!(project.printEnabled && (project.printSizes || []).length > 0)
        const isExtra = !!project.extraEnabled || !!(project.lockedPhotos && project.lockedPhotos.length > 0)

        // Select template and fallback by category
        let selectedTemplate: { id: string, en: string } | null = null
        let fallbackKey: string
        if (isPrint) {
            selectedTemplate = templates.reminderPrintLink || null
            fallbackKey = 'waReminderPrintMessage'
        } else if (isExtra) {
            selectedTemplate = templates.reminderExtraLink || null
            fallbackKey = 'waReminderExtraMessage'
        } else {
            selectedTemplate = templates.reminderLink || null
            fallbackKey = 'waReminderMessage'
        }

        const message = compileMessage(selectedTemplate, variables, false)
        if (!message || !(selectedTemplate as any)?.[locale as 'id' | 'en']) {
            // Fallback to default per category
            const expiryRef = isPrint ? project.printExpiresAt : project.expiresAt
            let fallbackMessage = t(fallbackKey, {
                name: project.clientName,
                link: dynamicLink,
                duration: variables.duration || formatExpiry(expiryRef)
            })
            // Append password info if available
            if (variables.password) {
                fallbackMessage += `\n\n🔐 Password: ${variables.password}`
            }
            // Append download duration if available (non-print)
            if (!isPrint && variables.download_duration) {
                fallbackMessage += `\n📥 ${locale === 'id' ? 'Berlaku download' : 'Download valid for'}: ${variables.download_duration}`
            }
            window.open(`https://api.whatsapp.com/send/?phone=${clientWa}&text=${encodeURIComponent(fallbackMessage)}`, '_blank')
        } else {
            window.open(`https://api.whatsapp.com/send/?phone=${clientWa}&text=${encodeURIComponent(message)}`, '_blank')
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
                showAdminToast(t('deleted'), 'success')
            } catch (error) {
                showAdminToast("Failed to delete project", 'danger')
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
        const allProjectIds = filteredProjects.map(p => p.id)
        const allFolderIds = currentSubfolders.map(f => f.id)
        if (selectedIds.length === allProjectIds.length && selectedFolderIds.length === allFolderIds.length) {
            setSelectedIds([])
            setSelectedFolderIds([])
        } else {
            setSelectedIds(allProjectIds)
            setSelectedFolderIds(allFolderIds)
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
            showAdminToast(t('deleted'), 'success')
            setSelectedIds([])
            setIsSelectMode(false)
        } catch (error) {
            showAdminToast("Failed to delete projects", 'danger')
        } finally {
            setIsDeleting(false)
            setShowBatchDeleteDialog(false)
        }
    }

    const cancelSelectMode = () => {
        setIsSelectMode(false)
        setSelectedIds([])
        setSelectedFolderIds([])
    }

    const toggleSelectFolder = (folderId: string) => {
        setSelectedFolderIds(prev =>
            prev.includes(folderId) ? prev.filter(id => id !== folderId) : [...prev, folderId]
        )
    }

    const openExtraPhotosDialog = (project: Project) => {
        setExtraPhotosProject(project)
        setExtraPhotosCount("5")
        setLockedPhotosInput("")
        setGeneratedExtraLink(null)
        setShowExtraPhotosDialog(true)
    }

    const openPrintDialog = (project: Project) => {
        setPrintProject(project)
        setSelectedPrintTemplateIdx(-1 as any)
        setCustomPrintSizes([{ name: '', quota: 1 }])
        setGeneratedPrintLink(null)
        setShowPrintDialog(true)
    }

    const closePrintDialog = () => {
        setShowPrintDialog(false)
        setPrintProject(null)
        setGeneratedPrintLink(null)
    }

    const generatePrintLink = async () => {
        if (!printProject) return
        setIsGeneratingPrint(true)
        try {
            let printSizes: { name: string, quota: number }[] = []
            if (selectedPrintTemplateIdx === 'custom') {
                printSizes = customPrintSizes.filter(s => s.name.trim())
            } else if (typeof selectedPrintTemplateIdx === 'number' && selectedPrintTemplateIdx >= 0 && printTemplates[selectedPrintTemplateIdx]) {
                printSizes = printTemplates[selectedPrintTemplateIdx].sizes
            }

            const newProjectId = generateShortId()
            const newLink = buildProjectLink(newProjectId)
            if (!newLink) throw new Error(locale === 'id' ? 'Link belum siap, coba lagi sebentar.' : 'Link is not ready yet, please try again shortly.')
            const printDays = printExpiryDays ? parseInt(printExpiryDays) : undefined

            const projectPayload: Project = {
                id: newProjectId,
                clientName: printProject.clientName,
                gdriveLink: printProject.gdriveLink,
                clientWhatsapp: printProject.clientWhatsapp || '',
                adminWhatsapp: printProject.adminWhatsapp || (printProject as any).whatsapp || '',
                countryCode: printProject.countryCode || 'ID',
                maxPhotos: 0,
                detectSubfolders: printProject.detectSubfolders,
                createdAt: Date.now(),
                link: newLink,
                folderId: printProject.folderId || null,
                projectType: 'print',
                printEnabled: true,
                printSizes: printSizes,
                printExpiresAt: printDays ? Date.now() + (printDays * 24 * 60 * 60 * 1000) : undefined,
            }

            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectPayload)
            })

            if (!res.ok) {
                const errData = await res.json()
                throw new Error(errData.message || 'Failed to create print project')
            }

            setGeneratedPrintLink(newLink)
        } catch (err: any) {
            showAdminToast(err.message || 'Failed to generate print link', 'danger')
        } finally {
            setIsGeneratingPrint(false)
        }
    }

    const buildPrintTemplateMessage = () => {
        if (!printProject || !generatedPrintLink) return ''
        // Get printSizes from the project's selected template or custom sizes
        let printSizes: { name: string, quota: number }[] = []
        if (selectedPrintTemplateIdx === 'custom') {
            printSizes = customPrintSizes.filter(s => s.name.trim())
        } else if (typeof selectedPrintTemplateIdx === 'number' && selectedPrintTemplateIdx >= 0 && printTemplates[selectedPrintTemplateIdx]) {
            printSizes = printTemplates[selectedPrintTemplateIdx].sizes
        }
        const variables: Record<string, string> = {
            client_name: printProject.clientName,
            link: generatedPrintLink,
            print_sizes: printSizes.map(s => `${s.name}×${s.quota}`).join(', '),
        }
        const days = printExpiryDays ? parseInt(printExpiryDays) : 0
        if (days > 0) {
            variables.print_duration = `${days} ${t('days')}`
        }
        // Try custom WA template first
        if (printWaTemplate) {
            const lang = locale as 'id' | 'en'
            const tmplText = printWaTemplate[lang] || ''
            if (tmplText.trim()) {
                let msg = tmplText
                Object.entries(variables).forEach(([key, val]) => {
                    msg = msg.replace(new RegExp(`{{${key}}}`, 'g'), val)
                })
                msg = msg.replace(/{{(\w+)}}/g, '').replace(/\n{3,}/g, '\n\n').trim()
                return msg
            }
        }
        // Default print message
        let message = `Halo ${printProject.clientName}! \u{1F5A8}\u{FE0F}\n\nSilakan pilih foto untuk dicetak melalui link berikut:\n${generatedPrintLink}`
        if (variables.print_duration) {
            message += `\n\n\u23F0 ${t('printDuration')}: ${variables.print_duration}`
        }
        return message
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
            if (!newLink) throw new Error(locale === 'id' ? 'Link belum siap, coba lagi sebentar.' : 'Link is not ready yet, please try again shortly.')
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
                downloadExpiresAt: extraDownloadExpiryDays ? Date.now() + (parseInt(extraDownloadExpiryDays) * 24 * 60 * 60 * 1000) : undefined,
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
            showAdminToast(err.message || 'Failed to generate extra link', 'danger')
        } finally {
            setIsGeneratingExtra(false)
        }
    }

    const copyExtraLink = () => {
        if (!generatedExtraLink) return
        copyText(generatedExtraLink, () => showAdminToast(tc('copied'), 'success'))
    }

    const closeExtraPhotosDialog = () => {
        setShowExtraPhotosDialog(false)
        setExtraPhotosProject(null)
        setGeneratedExtraLink(null)
    }

    // Filter projects by folder and search query
    const currentFolderProjects = sortByExpiry
        ? projects // In sort mode, show all projects flat
        : projects.filter(p => (p.folderId || null) === currentFolderId)

    const filteredProjects = (() => {
        let result = searchQuery.trim()
            ? projects.filter(p => p.clientName.toLowerCase().includes(searchQuery.toLowerCase()))
            : currentFolderProjects

        if (sortByExpiry) {
            result = [...result].sort((a, b) => {
                const getExp = (p: Project) => sortByExpiry.type === 'download'
                    ? (p.downloadExpiresAt ?? p.expiresAt ?? Infinity)
                    : (p.expiresAt ?? Infinity)
                const aExp = getExp(a)
                const bExp = getExp(b)
                return sortByExpiry.direction === 'asc' ? aExp - bExp : bExp - aExp
            })
        }
        return result
    })()

    // Subfolders in current folder
    const currentSubfolders = sortByExpiry ? [] : folders.filter(f => (f.parentId || null) === currentFolderId)

    // Filtered folders: search all folders globally, otherwise show current subfolders
    const filteredFolders = searchQuery.trim()
        ? folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : currentSubfolders

    // Count projects in a folder (recursive)
    const countProjectsInFolder = (folderId: string): number => {
        const directCount = projects.filter(p => p.folderId === folderId).length
        const subfolderIds = folders.filter(f => f.parentId === folderId).map(f => f.id)
        const subCount = subfolderIds.reduce((sum, id) => sum + countProjectsInFolder(id), 0)
        return directCount + subCount
    }

    // Folder CRUD
    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return
        setIsFolderLoading(true)
        try {
            await fetch('/api/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newFolderName.trim(), parentId: currentFolderId })
            })
            setNewFolderName("")
            setShowNewFolderDialog(false)
            onFoldersChanged()
        } catch (err) {
            console.error('Failed to create folder:', err)
        } finally {
            setIsFolderLoading(false)
        }
    }

    const handleRenameFolder = async () => {
        if (!renameFolderId || !renameFolderName.trim()) return
        setIsFolderLoading(true)
        try {
            await fetch(`/api/folders/${renameFolderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: renameFolderName.trim() })
            })
            setShowRenameFolderDialog(false)
            setRenameFolderId(null)
            onFoldersChanged()
        } catch (err) {
            console.error('Failed to rename folder:', err)
        } finally {
            setIsFolderLoading(false)
        }
    }

    const handleDeleteFolder = async () => {
        if (!deleteFolderId) return
        setIsFolderLoading(true)
        try {
            await fetch(`/api/folders/${deleteFolderId}`, { method: 'DELETE' })
            setShowDeleteFolderDialog(false)
            setDeleteFolderId(null)
            onFoldersChanged()
        } catch (err) {
            console.error('Failed to delete folder:', err)
        } finally {
            setIsFolderLoading(false)
        }
    }

    // Move projects to folder
    const handleMoveProjects = async (targetFolderId: string | null) => {
        if (selectedIds.length === 0) return
        setIsFolderLoading(true)
        try {
            await fetch('/api/folders/move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectIds: selectedIds, folderId: targetFolderId })
            })
            // Optimistic update
            const movedIds = [...selectedIds]
            onProjectsChanged?.(prev => prev.map(p => movedIds.includes(p.id) ? { ...p, folderId: targetFolderId } : p))
            setSelectedIds([])
            setSelectedFolderIds([])
            setIsSelectMode(false)
            setShowMoveDialog(false)
            onFoldersChanged()
        } catch (err) {
            console.error('Failed to move projects:', err)
        } finally {
            setIsFolderLoading(false)
        }
    }

    // Drag & Drop handlers
    const handleDragStart = (e: DragEvent<HTMLDivElement>, projectId: string) => {
        e.dataTransfer.setData('text/plain', projectId)
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleBreadcrumbDragOver = (e: DragEvent<HTMLButtonElement>, segmentId: string | null) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDragOverBreadcrumb(segmentId === null ? '__root__' : segmentId)
    }

    const handleBreadcrumbDragLeave = () => {
        setDragOverBreadcrumb(null)
    }

    const handleBreadcrumbDrop = async (e: DragEvent<HTMLButtonElement>, targetFolderId: string | null) => {
        e.preventDefault()
        setDragOverBreadcrumb(null)
        const data = e.dataTransfer.getData('text/plain')
        if (!data) return

        // Check if dragging a folder
        if (data.startsWith('folder:')) {
            const folderId = data.replace('folder:', '')
            // Don't move folder into itself
            if (folderId === targetFolderId) return
            setIsFolderLoading(true)
            try {
                await fetch(`/api/folders/${folderId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ parentId: targetFolderId })
                })
                onFoldersChanged()
            } catch (err) {
                console.error('Failed to move folder:', err)
            } finally {
                setIsFolderLoading(false)
            }
            return
        }

        // Otherwise it's a project
        const projectId = data
        const project = projects.find(p => p.id === projectId)
        if (project && (project.folderId || null) === targetFolderId) return
        setIsFolderLoading(true)
        try {
            await fetch('/api/folders/move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectIds: [projectId], folderId: targetFolderId })
            })
            // Optimistic update
            onProjectsChanged?.(prev => prev.map(p => p.id === projectId ? { ...p, folderId: targetFolderId } : p))
            onFoldersChanged()
        } catch (err) {
            console.error('Failed to move project:', err)
        } finally {
            setIsFolderLoading(false)
        }
    }

    const handleFolderDragOver = (e: DragEvent<HTMLDivElement>, folderId: string) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDragOverFolder(folderId)
    }

    const handleFolderDragLeave = () => {
        setDragOverFolder(null)
    }

    const handleFolderDrop = async (e: DragEvent<HTMLDivElement>, targetFolderId: string) => {
        e.preventDefault()
        setDragOverFolder(null)
        const projectId = e.dataTransfer.getData('text/plain')
        if (!projectId) return
        setIsFolderLoading(true)
        try {
            await fetch('/api/folders/move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectIds: [projectId], folderId: targetFolderId })
            })
            // Optimistic update
            onProjectsChanged?.(prev => prev.map(p => p.id === projectId ? { ...p, folderId: targetFolderId } : p))
            onFoldersChanged()
        } catch (err) {
            console.error('Failed to move project:', err)
        } finally {
            setIsFolderLoading(false)
        }
    }

    const totalSelected = selectedIds.length + selectedFolderIds.length

    // Build folder tree for move dialog
    const buildFolderTree = (parentId: string | null, depth: number): { id: string | null; name: string; depth: number }[] => {
        if (depth >= 5) return []
        const children = folders.filter(f => (f.parentId || null) === parentId)
        const result: { id: string | null; name: string; depth: number }[] = []
        for (const child of children) {
            result.push({ id: child.id, name: child.name, depth })
            result.push(...buildFolderTree(child.id, depth + 1))
        }
        return result
    }

    const allFolderTree = [{ id: null, name: t('rootFolder'), depth: 0 }, ...buildFolderTree(null, 1)]
    const actionPickerOptionClass = "flex w-full items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50 cursor-pointer disabled:pointer-events-none disabled:opacity-50"
    const copyPopupProject = copyActionPopup.project
    const copyPopupLink = copyPopupProject ? buildProjectLink(copyPopupProject.id) : ''
    const whatsappPopupProject = whatsappActionPopup.project
    const whatsappPopupFreelancers = getFreelancerOptions(whatsappPopupProject)

    if (projects.length === 0 && folders.length === 0) {
        return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12 space-y-4">
                <div className="text-6xl">📂</div>
                <h3 className="text-xl font-semibold">{t('noProjects')}</h3>
                <p className="text-muted-foreground">{t('noProjectsDesc')}</p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button onClick={onCreateNew} size="lg" className="gap-2 cursor-pointer">
                        <Plus className="h-5 w-5" />
                        {t('createNew')}
                    </Button>
                    <Button onClick={onBatchClick} size="lg" variant="outline" className="gap-2 cursor-pointer">
                        <Zap className="h-5 w-5" />
                        {t('batchCreate')}
                    </Button>
                </div>
            </motion.div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <LayoutList className="h-5 w-5" /> {t('projectList')} ({projects.length})
                </h3>
                <div className="flex items-center gap-1.5 flex-wrap">
                    {isSelectMode ? (
                        <>
                            <Button onClick={toggleSelectAll} size="sm" variant="outline" className="gap-2 cursor-pointer">
                                {(selectedIds.length === filteredProjects.length && selectedFolderIds.length === currentSubfolders.length && totalSelected > 0) ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                                {(selectedIds.length === filteredProjects.length && selectedFolderIds.length === currentSubfolders.length && totalSelected > 0) ? tc('clearSelection') : t('selectAll')}
                            </Button>
                            <Button onClick={() => { if (selectedIds.length > 0) setShowMoveDialog(true) }} size="sm" variant="outline" className="gap-2 cursor-pointer" disabled={selectedIds.length === 0}>
                                <Move className="h-4 w-4" />
                                {t('moveProject')} ({selectedIds.length})
                            </Button>
                            <Button onClick={handleBatchDeleteClick} size="sm" variant="destructive" className="gap-2 cursor-pointer" disabled={totalSelected === 0}>
                                <Trash2 className="h-4 w-4" />
                                {t('delete')} ({totalSelected})
                            </Button>
                            <Button onClick={cancelSelectMode} size="sm" variant="ghost" className="cursor-pointer">
                                <X className="h-4 w-4" />
                            </Button>
                        </>
                    ) : (
                        <>
                            <div className="relative" ref={sortMenuRef}>
                                <Button onClick={() => sortByExpiry ? setSortByExpiry(null) : setShowSortMenu(!showSortMenu)} size="sm" variant={sortByExpiry ? "default" : "outline"} className="gap-2 cursor-pointer">
                                    <ArrowUpDown className="h-4 w-4" />
                                    {sortByExpiry
                                        ? `${sortByExpiry.type === 'download' ? t('downloadDuration') : t('selectionDuration')} ${sortByExpiry.direction === 'asc' ? '↑' : '↓'}`
                                        : t('sortByExpiry')}
                                </Button>
                                {showSortMenu && (
                                    <div className="absolute top-full mt-1 left-0 z-50 bg-popover border border-border rounded-lg shadow-lg p-1 min-w-[220px]">
                                        <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground">{t('selectionDuration')}</p>
                                        <button className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent cursor-pointer flex items-center gap-2" onClick={() => { setSortByExpiry({ type: 'selection', direction: 'asc' }); setShowSortMenu(false) }}>
                                            ↑ {t('sortAscending')}
                                        </button>
                                        <button className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent cursor-pointer flex items-center gap-2" onClick={() => { setSortByExpiry({ type: 'selection', direction: 'desc' }); setShowSortMenu(false) }}>
                                            ↓ {t('sortDescending')}
                                        </button>
                                        <div className="border-t border-border my-1" />
                                        <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground">{t('downloadDuration')}</p>
                                        <button className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent cursor-pointer flex items-center gap-2" onClick={() => { setSortByExpiry({ type: 'download', direction: 'asc' }); setShowSortMenu(false) }}>
                                            ↑ {t('sortAscending')}
                                        </button>
                                        <button className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent cursor-pointer flex items-center gap-2" onClick={() => { setSortByExpiry({ type: 'download', direction: 'desc' }); setShowSortMenu(false) }}>
                                            ↓ {t('sortDescending')}
                                        </button>
                                    </div>
                                )}
                            </div>
                            <Button onClick={() => setIsSelectMode(true)} size="sm" variant="outline" className="gap-2 cursor-pointer">
                                <CheckSquare className="h-4 w-4" />
                                {t('manage')}
                            </Button>
                            {!sortByExpiry && currentDepth < 5 && (
                                <Button onClick={() => { setNewFolderName(""); setShowNewFolderDialog(true) }} size="sm" variant="outline" className="gap-2 cursor-pointer">
                                    <FolderPlus className="h-4 w-4" />
                                    {t('newFolder')}
                                </Button>
                            )}
                            <Button onClick={onBatchClick} size="sm" variant="outline" className="gap-2 cursor-pointer">
                                <Zap className="h-4 w-4" />
                                {t('batchCreate')}
                            </Button>
                            <Button onClick={onCreateNew} size="sm" className="gap-2 cursor-pointer">
                                <Plus className="h-4 w-4" />
                                {t('createNew')}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Breadcrumb - hidden in sort mode */}
            {!sortByExpiry && (currentFolderId !== null || breadcrumbPath.length > 0) && (
                <div className="flex items-center gap-1 text-sm flex-wrap bg-muted/50 rounded-lg px-3 py-2">
                    <button
                        onClick={() => onNavigateToFolder(null)}
                        onDragOver={(e: any) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverBreadcrumb('__root__') }}
                        onDragLeave={() => setDragOverBreadcrumb(null)}
                        onDrop={(e: any) => handleBreadcrumbDrop(e, null)}
                        className={cn(
                            "flex items-center gap-1 hover:text-primary transition-colors cursor-pointer rounded px-1.5 py-0.5",
                            dragOverBreadcrumb === '__root__' && "bg-primary/20 ring-2 ring-primary"
                        )}
                    >
                        <Home className="h-3.5 w-3.5" />
                        {t('rootFolder')}
                    </button>
                    {breadcrumbPath.map((segment) => (
                        <span key={segment.id} className="flex items-center gap-1">
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            <button
                                onClick={() => onNavigateToFolder(segment.id)}
                                onDragOver={(e: any) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverBreadcrumb(segment.id) }}
                                onDragLeave={() => setDragOverBreadcrumb(null)}
                                onDrop={(e: any) => handleBreadcrumbDrop(e, segment.id)}
                                className={cn(
                                    "hover:text-primary transition-colors cursor-pointer rounded px-1.5 py-0.5 font-medium",
                                    segment.id === currentFolderId && "text-primary",
                                    dragOverBreadcrumb === segment.id && "bg-primary/20 ring-2 ring-primary"
                                )}
                            >
                                {segment.name}
                            </button>
                        </span>
                    ))}
                </div>
            )}

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

            {/* Folder Section */}
            {filteredFolders.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <FolderOpen className="h-4 w-4" />
                        <span>Folder</span>
                        <div className="flex-1 border-t border-border/50" />
                    </div>
                    <div className="grid gap-3 overflow-hidden max-w-full">
                        <AnimatePresence mode="popLayout">
                            {filteredFolders.map((folder, index) => (
                                <motion.div
                                    key={folder.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    transition={{ delay: index * 0.03 }}
                                    draggable={!isSelectMode}
                                    onDragStart={(e: any) => { e.dataTransfer.setData('text/plain', `folder:${folder.id}`); e.dataTransfer.effectAllowed = 'move' }}
                                    onDragOver={(e: any) => handleFolderDragOver(e, folder.id)}
                                    onDragLeave={handleFolderDragLeave}
                                    onDrop={(e: any) => handleFolderDrop(e, folder.id)}
                                >
                                    <Card className={cn(
                                        "overflow-hidden transition-all hover:shadow-md cursor-pointer",
                                        selectedFolderIds.includes(folder.id) && "border-primary bg-primary/5",
                                        dragOverFolder === folder.id && "ring-2 ring-primary bg-primary/10"
                                    )}>
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-4 w-full">
                                                {isSelectMode && (
                                                    <button onClick={(e) => { e.stopPropagation(); toggleSelectFolder(folder.id) }} className="cursor-pointer">
                                                        {selectedFolderIds.includes(folder.id) ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5 text-muted-foreground" />}
                                                    </button>
                                                )}
                                                <div className="flex-1 min-w-0 flex items-center gap-3" onClick={() => { setSearchQuery(""); onNavigateToFolder(folder.id) }}>
                                                    <FolderOpen className="h-5 w-5 text-amber-500 shrink-0" />
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="font-semibold truncate hover:underline">{folder.name}</h4>
                                                        <p className="text-sm text-muted-foreground">{t('projectCount', { count: countProjectsInFolder(folder.id) })}</p>
                                                    </div>
                                                </div>
                                                {!isSelectMode && (
                                                    <div className="flex items-center gap-1">
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 cursor-pointer" title={t('renameFolder')} onClick={(e) => { e.stopPropagation(); setRenameFolderId(folder.id); setRenameFolderName(folder.name); setShowRenameFolderDialog(true) }}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive cursor-pointer" title={t('deleteFolder')} onClick={(e) => { e.stopPropagation(); setDeleteFolderId(folder.id); setShowDeleteFolderDialog(true) }}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {/* Project Section */}
            {filteredProjects.length > 0 && (
                <div className="space-y-2">
                    {filteredFolders.length > 0 && (
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>Proyek</span>
                            <div className="flex-1 border-t border-border/50" />
                        </div>
                    )}
                    <div className="grid gap-3 overflow-hidden max-w-full">
                        <AnimatePresence mode="popLayout">
                            {filteredProjects.map((project) => {
                                const expired = isProjectExpired(project)
                                const isSelected = selectedIds.includes(project.id)
                                const dynamicLink = projectLinks[project.id] || ''
                                const isProjectLinkReady = Boolean(dynamicLink)
                                const projectLinkLabel = isProjectLinkReady
                                    ? dynamicLink
                                    : (locale === 'id' ? 'Menyiapkan link...' : 'Preparing link...')
                                const hasLegacyExtra = !project.extraEnabled && !!(project.lockedPhotos && project.lockedPhotos.length > 0)
                                const hasExtraDisplay = hasExtraAction(project)
                                const hasPrintDisplay = hasPrintAction(project)
                                const hasExtraAndPrint = hasExtraDisplay && hasPrintDisplay
                                const hasBadges = hasLegacyExtra || project.extraEnabled || project.projectType === 'print' || !!(project.printEnabled && (project.printSizes || []).length > 0) || expired
                                const freelancerOptions = getFreelancerOptions(project)
                                const canSendToFreelancer = canSendProjectToFreelancer(project)
                                return (
                                    <motion.div key={project.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }} transition={{ duration: 0.15 }} className="overflow-hidden max-w-full" draggable={!isSelectMode} onDragStart={(e) => handleDragStart(e as any, project.id)}>
                                        <Card className={cn("overflow-hidden transition-all hover:shadow-md", expired && "opacity-60 border-destructive/30", isSelected && "border-primary bg-primary/5", !isSelected && !expired && hasExtraAndPrint && "border-teal-400 bg-teal-50/50 dark:bg-teal-950/20 dark:border-teal-600", !isSelected && !expired && !hasExtraAndPrint && hasPrintDisplay && "border-purple-400 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-600", !isSelected && !expired && !hasExtraAndPrint && hasExtraDisplay && "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-600")}>
                                            <CardContent className="p-4 overflow-hidden">
                                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 w-full overflow-hidden">
                                                    {isSelectMode && (
                                                        <button type="button" onClick={(e) => handleProjectActionClick(e, () => toggleSelect(project.id))} className="mt-1 cursor-pointer">
                                                            {isSelected ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5 text-muted-foreground" />}
                                                        </button>
                                                    )}
                                                    <div className="flex-1 min-w-0 space-y-1 overflow-hidden max-w-full">
                                                        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2 overflow-hidden">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                                                                <h4 className="font-semibold truncate flex-1 min-w-0 cursor-pointer hover:text-primary hover:underline transition-colors" onClick={() => onEditProject(project)} title={`Edit ${project.clientName}`}>{project.clientName}</h4>
                                                            </div>
                                                            {hasBadges && (
                                                                <div className="flex flex-wrap gap-1.5 pl-6 sm:pl-0 sm:shrink-0">
                                                                    {hasLegacyExtra && (
                                                                        <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded shrink-0">📷 {t('extraPhotosBadge')}</span>
                                                                    )}
                                                                    {project.extraEnabled && (
                                                                        <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded shrink-0">📷 {t('extraFeatureBadge')}</span>
                                                                    )}
                                                                    {project.projectType === 'print' && (
                                                                        <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded shrink-0">🖨️ {t('projectTypePrint')}</span>
                                                                    )}
                                                                    {project.projectType !== 'print' && project.printEnabled && (project.printSizes || []).length > 0 && (
                                                                        <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded shrink-0">🖨️ {t('printFeatureBadge')}</span>
                                                                    )}
                                                                    {expired && <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded shrink-0">{t('expired')}</span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                            <span className="flex items-center gap-1 min-w-0 max-w-full">
                                                                {project.projectType === 'print'
                                                                    ? `🖨️ ${(project.printSizes || []).map((s: any) => `${s.name}×${s.quota}`).join(', ')}`
                                                                    : `📸 ${project.maxPhotos} ${t('photo')}`
                                                                }
                                                            </span>
                                                            {project.extraEnabled && (
                                                                <span className="flex items-center gap-1">📷 +{project.extraMaxPhotos || 0}</span>
                                                            )}
                                                            {project.projectType !== 'print' && project.printEnabled && (project.printSizes || []).length > 0 && (
                                                                <span className="flex items-center gap-1 min-w-0 max-w-full">🖨️ {(project.printSizes || []).map((s: any) => `${s.name}×${s.quota}`).join(', ')}</span>
                                                            )}
                                                            <span className="flex items-center gap-1"><Clock className="h-3 w-3 shrink-0" /><ExpiryDisplay expiresAt={project.projectType === 'print' ? project.printExpiresAt : (dashboardDurationDisplay === 'download' ? project.downloadExpiresAt : project.expiresAt)} /></span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap block min-h-4 max-w-full">🔗 {projectLinkLabel}</p>
                                                    </div>
                                                    {!isSelectMode && (
                                                        <div className="flex items-center gap-1 flex-wrap w-full sm:w-auto justify-center sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 mt-2 sm:mt-0 border-border/50">
                                                            <Button
                                                                type="button"
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={(e) => handleProjectActionClick(e, () => setCopyActionPopup({ open: true, project }))}
                                                                className={cn(actionButtonClass('violet'), "sm:hidden")}
                                                                disabled={!isProjectLinkReady}
                                                                title={t('copyActions')}
                                                                aria-label={t('copyActions')}
                                                            >
                                                                {copiedId === project.id || copiedTemplateId === project.id ? <span className="text-green-500 text-xs">✓</span> : <Copy className="h-4 w-4" />}
                                                            </Button>
                                                            <div className={splitButtonWrapperClass('violet')} onClick={(e) => e.stopPropagation()}>
                                                                <Button
                                                                    type="button"
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    onClick={(e) => handleProjectActionClick(e, () => copyLink(dynamicLink, project.id))}
                                                                    className={splitMainButtonClass('violet')}
                                                                    disabled={!isProjectLinkReady}
                                                                    title={t('copyLink')}
                                                                    aria-label={t('copyLink')}
                                                                >
                                                                    {copiedId === project.id ? <span className="text-green-500 text-xs">✓</span> : <Copy className="h-4 w-4" />}
                                                                </Button>
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button
                                                                            type="button"
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            className={cn(splitChevronButtonClass('violet'), "hidden sm:inline-flex")}
                                                                            disabled={!isProjectLinkReady}
                                                                            title={t('copyActions')}
                                                                            aria-label={t('copyActions')}
                                                                        >
                                                                            <ChevronDown className="h-4 w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="w-60">
                                                                        <DropdownMenuItem onSelect={() => copyLink(dynamicLink, project.id)}>
                                                                            <Copy className="h-4 w-4 text-violet-600" />
                                                                            {t('copyClientLink')}
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem onSelect={() => copyTemplateForProject(project, 'client')}>
                                                                            <FileText className="h-4 w-4 text-violet-600" />
                                                                            {t('copyClientTemplate')}
                                                                        </DropdownMenuItem>
                                                                        {hasExtraDisplay && (
                                                                            <DropdownMenuItem onSelect={() => copyTemplateForProject(project, 'extra')}>
                                                                                <ImagePlus className="h-4 w-4 text-amber-600" />
                                                                                {t('copyExtraTemplate')}
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                        {hasPrintDisplay && (
                                                                            <DropdownMenuItem onSelect={() => copyTemplateForProject(project, 'print')}>
                                                                                <Printer className="h-4 w-4 text-purple-600" />
                                                                                {t('copyPrintTemplate')}
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>
                                                            <Button
                                                                type="button"
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={(e) => handleProjectActionClick(e, () => setWhatsappActionPopup({ open: true, project }))}
                                                                className={cn(actionButtonClass('green'), "sm:hidden")}
                                                                disabled={expired || !isProjectLinkReady}
                                                                title={t('sendToClient')}
                                                                aria-label={t('sendToClient')}
                                                            >
                                                                <MessageCircle className="h-4 w-4" />
                                                            </Button>
                                                            <div className={splitButtonWrapperClass('green')} onClick={(e) => e.stopPropagation()}>
                                                                <Button
                                                                    type="button"
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    onClick={(e) => handleProjectActionClick(e, () => sendToClient(project, 'client'))}
                                                                    className={splitMainButtonClass('green')}
                                                                    disabled={expired || !isProjectLinkReady}
                                                                    title={t('sendClientLink')}
                                                                    aria-label={t('sendClientLink')}
                                                                >
                                                                    <MessageCircle className="h-4 w-4" />
                                                                </Button>
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button
                                                                            type="button"
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation()
                                                                            }}
                                                                            className={cn(splitChevronButtonClass('green'), "hidden sm:inline-flex")}
                                                                            disabled={expired || !isProjectLinkReady}
                                                                            title={t('sendToClient')}
                                                                            aria-label={t('sendToClient')}
                                                                        >
                                                                            <ChevronDown className="h-4 w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="w-56">
                                                                        <DropdownMenuItem onSelect={() => sendToClient(project, 'client')}>
                                                                            <MessageCircle className="h-4 w-4 text-green-600" />
                                                                            {t('sendClientLink')}
                                                                        </DropdownMenuItem>
                                                                        {hasExtraDisplay && (
                                                                            <DropdownMenuItem onSelect={() => sendToClient(project, 'extra')}>
                                                                                <ImagePlus className="h-4 w-4 text-amber-600" />
                                                                                {t('sendExtraLink')}
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                        {hasPrintDisplay && (
                                                                            <DropdownMenuItem onSelect={() => sendToClient(project, 'print')}>
                                                                                <Printer className="h-4 w-4 text-purple-600" />
                                                                                {t('sendPrintLink')}
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                        {canSendToFreelancer && (
                                                                            <>
                                                                                <DropdownMenuSeparator />
                                                                                <DropdownMenuSub>
                                                                                    <DropdownMenuSubTrigger>
                                                                                        <Users className="h-4 w-4 text-cyan-600" />
                                                                                        {t('sendToFreelancer')}
                                                                                    </DropdownMenuSubTrigger>
                                                                                    <DropdownMenuSubContent className="w-52">
                                                                                        {freelancerOptions.map((freelancer, index) => (
                                                                                            <DropdownMenuItem
                                                                                                key={freelancer.id || `${freelancer.whatsapp}-${index}`}
                                                                                                onSelect={() => sendToFreelancer(project, freelancer)}
                                                                                            >
                                                                                                <MessageCircle className="h-4 w-4 text-green-600" />
                                                                                                <span className="truncate">{freelancer.name}</span>
                                                                                            </DropdownMenuItem>
                                                                                        ))}
                                                                                    </DropdownMenuSubContent>
                                                                                </DropdownMenuSub>
                                                                            </>
                                                                        )}
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>
                                                            <Button type="button" size="icon" variant="ghost" onClick={(e) => handleProjectActionClick(e, () => sendReminder(project))} className={actionButtonClass('amber')} disabled={expired || !isProjectLinkReady || (!project.expiresAt && !project.printExpiresAt)} title={t('sendReminder')} aria-label={t('sendReminder')}><Bell className="h-4 w-4" /></Button>
                                                            <Button type="button" size="icon" variant="ghost" onClick={(e) => handleProjectActionClick(e, () => openLink(dynamicLink))} className={actionButtonClass('blue')} disabled={!isProjectLinkReady} title={t('openLink')} aria-label={t('openLink')}><ExternalLink className="h-4 w-4" /></Button>
                                                            <Button type="button" size="icon" variant="ghost" onClick={(e) => handleProjectActionClick(e, () => onEditProject(project))} className={actionButtonClass('indigo')} title={t('editProject')} aria-label={t('editProject')}><Edit className="h-4 w-4" /></Button>
                                                            <Button type="button" size="icon" variant="ghost" onClick={(e) => handleProjectActionClick(e, () => onEditProject(project, 'extra'))} className={actionButtonClass('amber')} title={t('openExtraFeature')} aria-label={t('openExtraFeature')}><ImagePlus className="h-4 w-4" /></Button>
                                                            {printEnabled && (
                                                                <Button type="button" size="icon" variant="ghost" onClick={(e) => handleProjectActionClick(e, () => onEditProject(project, 'print'))} className={actionButtonClass('violet')} title={t('openPrintFeature')} aria-label={t('openPrintFeature')}><Printer className="h-4 w-4" /></Button>
                                                            )}
                                                            {!printEnabled && (
                                                                <span className={projectActionPlaceholderClass} aria-hidden="true" />
                                                            )}
                                                            <Button type="button" size="icon" variant="ghost" onClick={(e) => handleProjectActionClick(e, () => handleDeleteClick(project.id))} className={actionButtonClass('red')} title={t('delete')} aria-label={t('delete')}><Trash2 className="h-4 w-4" /></Button>
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
                </div>
            )}

            <PopupDialog isOpen={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} onConfirm={confirmDelete} title={t('confirmDelete')} message={t('confirmDeleteSingle')} type="danger" confirmText={isDeleting ? "Deleting..." : t('delete')} cancelText={t('cancel')} />
            <PopupDialog isOpen={showBatchDeleteDialog} onClose={() => setShowBatchDeleteDialog(false)} onConfirm={confirmBatchDelete} title={t('confirmDelete')} message={t('confirmDeleteMsg', { count: selectedIds.length })} type="danger" confirmText={isDeleting ? "Deleting..." : t('deleteSelected')} cancelText={t('cancel')} />
            <Toast isOpen={toast.open} message={toast.message} type={toast.type} position="top-right" duration={1800} onClose={() => setToast((current) => ({ ...current, open: false }))} />

            {copyPopupProject && (
                <Dialog
                    open={copyActionPopup.open}
                    onOpenChange={(open) => {
                        if (!open) setCopyActionPopup({ open: false, project: null })
                    }}
                >
                    <DialogContent className="rounded-xl sm:max-w-md">
                        <DialogHeader className="items-center text-center">
                            <DialogTitle>{t('copyActionPickerTitle')}</DialogTitle>
                            <DialogDescription>{t('copyActionPickerDesc')}</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-2">
                            <button
                                type="button"
                                className={actionPickerOptionClass}
                                disabled={!copyPopupLink}
                                onClick={() => {
                                    setCopyActionPopup({ open: false, project: null })
                                    copyLink(copyPopupLink, copyPopupProject.id)
                                }}
                            >
                                <span>{t('copyClientLink')}</span>
                                <Copy className="h-4 w-4 text-violet-600" />
                            </button>
                            <button
                                type="button"
                                className={actionPickerOptionClass}
                                disabled={!copyPopupLink}
                                onClick={() => {
                                    setCopyActionPopup({ open: false, project: null })
                                    copyTemplateForProject(copyPopupProject, 'client')
                                }}
                            >
                                <span>{t('copyClientTemplate')}</span>
                                <FileText className="h-4 w-4 text-violet-600" />
                            </button>
                            {hasExtraAction(copyPopupProject) && (
                                <button
                                    type="button"
                                    className={actionPickerOptionClass}
                                    disabled={!copyPopupLink}
                                    onClick={() => {
                                        setCopyActionPopup({ open: false, project: null })
                                        copyTemplateForProject(copyPopupProject, 'extra')
                                    }}
                                >
                                    <span>{t('copyExtraTemplate')}</span>
                                    <ImagePlus className="h-4 w-4 text-amber-600" />
                                </button>
                            )}
                            {hasPrintAction(copyPopupProject) && (
                                <button
                                    type="button"
                                    className={actionPickerOptionClass}
                                    disabled={!copyPopupLink}
                                    onClick={() => {
                                        setCopyActionPopup({ open: false, project: null })
                                        copyTemplateForProject(copyPopupProject, 'print')
                                    }}
                                >
                                    <span>{t('copyPrintTemplate')}</span>
                                    <Printer className="h-4 w-4 text-purple-600" />
                                </button>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {whatsappPopupProject && (
                <Dialog
                    open={whatsappActionPopup.open}
                    onOpenChange={(open) => {
                        if (!open) setWhatsappActionPopup({ open: false, project: null })
                    }}
                >
                    <DialogContent className="rounded-xl sm:max-w-md">
                        <DialogHeader className="items-center text-center">
                            <DialogTitle>{t('whatsappActionPickerTitle')}</DialogTitle>
                            <DialogDescription>{t('whatsappActionPickerDesc')}</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-2">
                            <button
                                type="button"
                                className={actionPickerOptionClass}
                                onClick={() => {
                                    setWhatsappActionPopup({ open: false, project: null })
                                    sendToClient(whatsappPopupProject, 'client')
                                }}
                            >
                                <span>{t('sendClientLink')}</span>
                                <MessageCircle className="h-4 w-4 text-green-600" />
                            </button>
                            {hasExtraAction(whatsappPopupProject) && (
                                <button
                                    type="button"
                                    className={actionPickerOptionClass}
                                    onClick={() => {
                                        setWhatsappActionPopup({ open: false, project: null })
                                        sendToClient(whatsappPopupProject, 'extra')
                                    }}
                                >
                                    <span>{t('sendExtraLink')}</span>
                                    <ImagePlus className="h-4 w-4 text-amber-600" />
                                </button>
                            )}
                            {hasPrintAction(whatsappPopupProject) && (
                                <button
                                    type="button"
                                    className={actionPickerOptionClass}
                                    onClick={() => {
                                        setWhatsappActionPopup({ open: false, project: null })
                                        sendToClient(whatsappPopupProject, 'print')
                                    }}
                                >
                                    <span>{t('sendPrintLink')}</span>
                                    <Printer className="h-4 w-4 text-purple-600" />
                                </button>
                            )}
                            {canSendProjectToFreelancer(whatsappPopupProject) && whatsappPopupFreelancers.map((freelancer, index) => (
                                <button
                                    key={freelancer.id || `${freelancer.whatsapp}-${index}`}
                                    type="button"
                                    className={actionPickerOptionClass}
                                    onClick={() => {
                                        setWhatsappActionPopup({ open: false, project: null })
                                        sendToFreelancer(whatsappPopupProject, freelancer)
                                    }}
                                >
                                    <span className="truncate">{t('sendToFreelancer')} - {freelancer.name}</span>
                                    <MessageCircle className="h-4 w-4 shrink-0 text-green-600" />
                                </button>
                            ))}
                        </div>
                    </DialogContent>
                </Dialog>
            )}

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
                            <div className="relative">
                                {customExtraExpiryLabel && (
                                    <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer" onClick={() => { setCustomExtraTarget('selection'); setCustomExtraMonths(''); setCustomExtraDays(''); setShowCustomExtraExpiryDialog(true) }}>
                                        <span>✏️ {customExtraExpiryLabel}</span>
                                        <button type="button" className="text-muted-foreground hover:text-foreground ml-2" onClick={(e) => { e.stopPropagation(); setExtraExpiryDays(''); setCustomExtraExpiryLabel(null) }}>✕</button>
                                    </div>
                                )}
                                <select className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer ${customExtraExpiryLabel ? 'hidden' : ''}`} value={customExtraExpiryLabel ? 'custom' : extraExpiryDays} onChange={(e) => {
                                    if (e.target.value === 'custom') {
                                        setCustomExtraTarget('selection')
                                        setCustomExtraMonths('')
                                        setCustomExtraDays('')
                                        setShowCustomExtraExpiryDialog(true)
                                    } else {
                                        setExtraExpiryDays(e.target.value)
                                        setCustomExtraExpiryLabel(null)
                                    }
                                }}>
                                    <option value="">♾️ {t('forever')}</option>
                                    <option value="1">1 {t('days')}</option>
                                    <option value="3">3 {t('days')}</option>
                                    <option value="5">5 {t('days')}</option>
                                    <option value="7">7 {t('days')}</option>
                                    <option value="14">14 {t('days')}</option>
                                    <option value="30">30 {t('days')}</option>
                                    <option value="custom">✏️ {t('custom')}</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">📥 {t('extraDownloadDuration')}</label>
                            <div className="relative">
                                {customExtraDownloadExpiryLabel && (
                                    <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer" onClick={() => { setCustomExtraTarget('download'); setCustomExtraMonths(''); setCustomExtraDays(''); setShowCustomExtraExpiryDialog(true) }}>
                                        <span>✏️ {customExtraDownloadExpiryLabel}</span>
                                        <button type="button" className="text-muted-foreground hover:text-foreground ml-2" onClick={(e) => { e.stopPropagation(); setExtraDownloadExpiryDays(''); setCustomExtraDownloadExpiryLabel(null) }}>✕</button>
                                    </div>
                                )}
                                <select className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer ${customExtraDownloadExpiryLabel ? 'hidden' : ''}`} value={customExtraDownloadExpiryLabel ? 'custom' : extraDownloadExpiryDays} onChange={(e) => {
                                    if (e.target.value === 'custom') {
                                        setCustomExtraTarget('download')
                                        setCustomExtraMonths('')
                                        setCustomExtraDays('')
                                        setShowCustomExtraExpiryDialog(true)
                                    } else {
                                        setExtraDownloadExpiryDays(e.target.value)
                                        setCustomExtraDownloadExpiryLabel(null)
                                    }
                                }}>
                                    <option value="">♾️ {t('forever')}</option>
                                    <option value="1">1 {t('days')}</option>
                                    <option value="3">3 {t('days')}</option>
                                    <option value="5">5 {t('days')}</option>
                                    <option value="7">7 {t('days')}</option>
                                    <option value="14">14 {t('days')}</option>
                                    <option value="30">30 {t('days')}</option>
                                    <option value="custom">✏️ {t('custom')}</option>
                                </select>
                            </div>
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
                                {(() => {
                                    const buildExtraTemplateMessage = () => {
                                        const extraCount = parseInt(extraPhotosCount) || 5
                                        const variables: Record<string, string> = {
                                            client_name: extraPhotosProject?.clientName || '',
                                            link: generatedExtraLink!,
                                            count: extraCount.toString()
                                        }
                                        if (extraPhotosProject?.password) {
                                            variables.password = extraPhotosProject.password
                                        }
                                        const days = parseInt(extraExpiryDays)
                                        if (days > 0) {
                                            variables.duration = `${days} ${t('days')}`
                                        }
                                        if (extraPhotosProject?.downloadExpiresAt) {
                                            const now = Date.now()
                                            const diff = extraPhotosProject.downloadExpiresAt - now
                                            if (diff > 0) {
                                                const dlDays = Math.floor(diff / (1000 * 60 * 60 * 24))
                                                const dlHours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                                                if (dlDays > 0) {
                                                    variables.download_duration = `${dlDays} ${t('days')}`
                                                } else if (dlHours > 0) {
                                                    variables.download_duration = `${dlHours} ${t('hours')}`
                                                } else {
                                                    variables.download_duration = t('lessThanHour')
                                                }
                                            }
                                        }
                                        return compileMessage(templates.extraLink, variables, true)
                                    }

                                    return (
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <Button onClick={() => {
                                                const clientWa = extraPhotosProject?.clientWhatsapp || ''
                                                if (!clientWa) { showAdminToast(tc('noWhatsapp'), 'danger'); return }
                                                const message = buildExtraTemplateMessage()
                                                window.open(`https://api.whatsapp.com/send/?phone=${clientWa}&text=${encodeURIComponent(message)}`, '_blank')
                                            }} className="flex-1 bg-green-600 hover:bg-green-700 text-white cursor-pointer"><MessageCircle className="h-4 w-4 mr-2" />{t('sendToClientWa')}</Button>
                                            <Button variant="outline" className="flex-1 cursor-pointer" onClick={() => {
                                                const message = buildExtraTemplateMessage()
                                                copyText(message, () => showAdminToast(t('templateCopied'), 'success'))
                                            }}><Copy className="h-4 w-4 mr-2" />{t('copyTemplate')}</Button>
                                        </div>
                                    )
                                })()}
                            </div>
                        )}
                    </motion.div>
                </div>
            )}

            {/* Print Dialog */}
            <AnimatePresence>
                {showPrintDialog && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }} className="bg-background rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold flex items-center gap-2"><Printer className="h-5 w-5 text-purple-600" />{t('addPrintSelectionTitle')}</h2>
                                <Button size="icon" variant="ghost" onClick={closePrintDialog} className="h-8 w-8 cursor-pointer"><X className="h-4 w-4" /></Button>
                            </div>
                            <p className="text-sm text-muted-foreground">{printProject?.clientName}</p>

                            {/* Template selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">🖨️ {t('printTemplate')}</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                                    value={selectedPrintTemplateIdx === 'custom' ? 'custom' : selectedPrintTemplateIdx.toString()}
                                    onChange={(e) => {
                                        if (e.target.value === 'custom') {
                                            setSelectedPrintTemplateIdx('custom')
                                        } else {
                                            setSelectedPrintTemplateIdx(parseInt(e.target.value))
                                        }
                                    }}
                                >
                                    <option value="-1" disabled>— {t('printTemplate')} —</option>
                                    {printTemplates.map((tmpl, idx) => (
                                        <option key={idx} value={idx.toString()}>
                                            {tmpl.name} ({tmpl.sizes.map(s => `${s.name}×${s.quota}`).join(', ')})
                                        </option>
                                    ))}
                                    <option value="custom">{t('printTemplateCustom')}</option>
                                </select>
                            </div>

                            {/* Custom sizes editor */}
                            {selectedPrintTemplateIdx === 'custom' && (
                                <div className="space-y-2 bg-muted/30 rounded-lg p-3">
                                    <label className="text-xs font-medium">{t('printSizes')}</label>
                                    {customPrintSizes.map((size, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <Input
                                                value={size.name}
                                                onChange={(e) => {
                                                    const updated = [...customPrintSizes]
                                                    updated[idx] = { ...updated[idx], name: e.target.value }
                                                    setCustomPrintSizes(updated)
                                                }}
                                                placeholder={t('printSizeNamePlaceholder')}
                                                className="flex-1"
                                            />
                                            <Input
                                                type="number" min="1"
                                                value={size.quota}
                                                onChange={(e) => {
                                                    const updated = [...customPrintSizes]
                                                    updated[idx] = { ...updated[idx], quota: parseInt(e.target.value) || 1 }
                                                    setCustomPrintSizes(updated)
                                                }}
                                                className="w-20"
                                            />
                                            <span className="text-xs text-muted-foreground">{t('printSizeQuota')}</span>
                                            {customPrintSizes.length > 1 && (
                                                <Button type="button" variant="ghost" size="icon"
                                                    onClick={() => setCustomPrintSizes(customPrintSizes.filter((_, i) => i !== idx))}
                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm"
                                        onClick={() => setCustomPrintSizes([...customPrintSizes, { name: '', quota: 1 }])}
                                        className="gap-1.5 cursor-pointer"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        {t('addPrintSize')}
                                    </Button>
                                </div>
                            )}

                            {/* Print duration */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">⏰ {t('printDuration')}</label>
                                {customPrintExpiryLabel && (
                                    <button onClick={() => { setCustomPrintMonths(''); setCustomPrintDays(''); setShowCustomPrintExpiryDialog(true) }} className="flex items-center gap-1.5 text-sm text-purple-600 dark:text-purple-400 hover:underline cursor-pointer mb-1">
                                        <span>✏️ {customPrintExpiryLabel}</span>
                                    </button>
                                )}
                                <select
                                    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer ${customPrintExpiryLabel ? 'hidden' : ''}`}
                                    value={customPrintExpiryLabel ? 'custom' : printExpiryDays}
                                    onChange={(e) => {
                                        if (e.target.value === 'custom') {
                                            setCustomPrintMonths(''); setCustomPrintDays('');
                                            setShowCustomPrintExpiryDialog(true)
                                        } else {
                                            setPrintExpiryDays(e.target.value)
                                            setCustomPrintExpiryLabel(null)
                                        }
                                    }}
                                >
                                    <option value="">♾️ {t('forever')}</option>
                                    <option value="1">1 {t('days')}</option>
                                    <option value="3">3 {t('days')}</option>
                                    <option value="5">5 {t('days')}</option>
                                    <option value="7">7 {t('days')}</option>
                                    <option value="14">14 {t('days')}</option>
                                    <option value="30">30 {t('days')}</option>
                                    <option value="custom">✏️ Custom</option>
                                </select>
                            </div>

                            {/* Generate / Result */}
                            {!generatedPrintLink ? (
                                <Button onClick={generatePrintLink} className="w-full cursor-pointer bg-purple-600 hover:bg-purple-700" disabled={selectedPrintTemplateIdx === (-1 as any) || isGeneratingPrint}>
                                    {isGeneratingPrint ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('generatingPrintLink')}</>) : (<>🖨️ {t('generatePrintLink')}</>)}
                                </Button>
                            ) : (
                                <div className="space-y-3">
                                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg break-all text-sm border border-purple-200 dark:border-purple-800">{generatedPrintLink}</div>
                                    <div className="flex gap-2">
                                        <Button onClick={() => {
                                            copyText(generatedPrintLink, () => showAdminToast(t('linkCopied'), 'success'))
                                        }} variant="outline" className="flex-1 cursor-pointer"><Copy className="h-4 w-4 mr-2" />{t('copyLink')}</Button>
                                        <Button onClick={() => window.open(generatedPrintLink, '_blank')} variant="outline" className="flex-1 cursor-pointer"><ExternalLink className="h-4 w-4 mr-2" />{t('openLink')}</Button>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <Button onClick={() => {
                                            const clientWa = printProject?.clientWhatsapp || ''
                                            if (!clientWa) { showAdminToast('No WhatsApp number', 'danger'); return }
                                            const message = buildPrintTemplateMessage()
                                            window.open(`https://api.whatsapp.com/send/?phone=${clientWa}&text=${encodeURIComponent(message)}`, '_blank')
                                        }} className="flex-1 bg-green-600 hover:bg-green-700 text-white cursor-pointer"><MessageCircle className="h-4 w-4 mr-2" />{t('sendToClientWa')}</Button>
                                        <Button variant="outline" className="flex-1 cursor-pointer" onClick={() => {
                                            const message = buildPrintTemplateMessage()
                                            copyText(message, () => showAdminToast(t('templateCopied'), 'success'))
                                        }}><Copy className="h-4 w-4 mr-2" />{t('copyTemplate')}</Button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Custom Extra Duration Popup Dialog */}
            {showCustomExtraExpiryDialog && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-background rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
                        <h3 className="text-lg font-semibold">✏️ {t('customDuration')}</h3>
                        <div className="flex gap-3">
                            <div className="flex-1 space-y-1">
                                <label className="text-sm font-medium">🗓️ {t('customMonthsLabel')}</label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={customExtraMonths}
                                    onChange={(e) => setCustomExtraMonths(e.target.value)}
                                    placeholder="0"
                                    autoFocus
                                />
                            </div>
                            <div className="flex-1 space-y-1">
                                <label className="text-sm font-medium">📅 {t('customDaysLabel')}</label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={customExtraDays}
                                    onChange={(e) => setCustomExtraDays(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1 cursor-pointer" onClick={() => setShowCustomExtraExpiryDialog(false)}>{t('cancel')}</Button>
                            <Button className="flex-1 cursor-pointer" onClick={() => {
                                const months = parseInt(customExtraMonths) || 0
                                const days = parseInt(customExtraDays) || 0
                                if (months <= 0 && days <= 0) return
                                const totalDays = (months * 30) + days
                                const parts: string[] = []
                                if (months > 0) parts.push(`${months} ${t('customMonthsLabel')}`)
                                if (days > 0) parts.push(`${days} ${t('customDaysLabel')}`)
                                if (customExtraTarget === 'selection') {
                                    setExtraExpiryDays(totalDays.toString())
                                    setCustomExtraExpiryLabel(parts.join(' '))
                                } else {
                                    setExtraDownloadExpiryDays(totalDays.toString())
                                    setCustomExtraDownloadExpiryLabel(parts.join(' '))
                                }
                                setShowCustomExtraExpiryDialog(false)
                            }} disabled={(parseInt(customExtraMonths) || 0) <= 0 && (parseInt(customExtraDays) || 0) <= 0}>✓ OK</Button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Custom Print Duration Popup Dialog */}
            {showCustomPrintExpiryDialog && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-background rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
                        <h3 className="text-lg font-semibold">✏️ {t('customDuration')}</h3>
                        <div className="flex gap-3">
                            <div className="flex-1 space-y-1">
                                <label className="text-sm font-medium">🗓️ {t('customMonthsLabel')}</label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={customPrintMonths}
                                    onChange={(e) => setCustomPrintMonths(e.target.value)}
                                    placeholder="0"
                                    autoFocus
                                />
                            </div>
                            <div className="flex-1 space-y-1">
                                <label className="text-sm font-medium">📅 {t('customDaysLabel')}</label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={customPrintDays}
                                    onChange={(e) => setCustomPrintDays(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1 cursor-pointer" onClick={() => setShowCustomPrintExpiryDialog(false)}>{t('cancel')}</Button>
                            <Button className="flex-1 cursor-pointer" onClick={() => {
                                const months = parseInt(customPrintMonths) || 0
                                const days = parseInt(customPrintDays) || 0
                                if (months <= 0 && days <= 0) return
                                const totalDays = (months * 30) + days
                                const parts: string[] = []
                                if (months > 0) parts.push(`${months} ${t('customMonthsLabel')}`)
                                if (days > 0) parts.push(`${days} ${t('customDaysLabel')}`)
                                setPrintExpiryDays(totalDays.toString())
                                setCustomPrintExpiryLabel(parts.join(' '))
                                setShowCustomPrintExpiryDialog(false)
                            }} disabled={(parseInt(customPrintMonths) || 0) <= 0 && (parseInt(customPrintDays) || 0) <= 0}>✓ OK</Button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Empty state for current folder */}
            {filteredProjects.length === 0 && currentSubfolders.length === 0 && !searchQuery.trim() && currentFolderId !== null && (
                <div className="text-center py-8 text-muted-foreground">
                    <FolderOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>{t('noProjects')}</p>
                </div>
            )}

            {/* New Folder Dialog */}
            {showNewFolderDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-background rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2"><FolderPlus className="h-5 w-5 text-amber-500" /> {t('newFolder')}</h3>
                        <Input
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            placeholder={t('folderName')}
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder() }}
                        />
                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1 cursor-pointer" onClick={() => setShowNewFolderDialog(false)}>{t('cancel')}</Button>
                            <Button className="flex-1 cursor-pointer" onClick={handleCreateFolder} disabled={!newFolderName.trim() || isFolderLoading}>
                                {isFolderLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "✓ OK"}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Rename Folder Dialog */}
            {showRenameFolderDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-background rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2"><Edit className="h-5 w-5" /> {t('renameFolder')}</h3>
                        <Input
                            value={renameFolderName}
                            onChange={(e) => setRenameFolderName(e.target.value)}
                            placeholder={t('folderName')}
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') handleRenameFolder() }}
                        />
                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1 cursor-pointer" onClick={() => setShowRenameFolderDialog(false)}>{t('cancel')}</Button>
                            <Button className="flex-1 cursor-pointer" onClick={handleRenameFolder} disabled={!renameFolderName.trim() || isFolderLoading}>
                                {isFolderLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "✓ OK"}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Delete Folder Confirmation */}
            <PopupDialog isOpen={showDeleteFolderDialog} onClose={() => setShowDeleteFolderDialog(false)} onConfirm={handleDeleteFolder} title={t('deleteFolder')} message={t('confirmDeleteFolder')} type="danger" confirmText={isFolderLoading ? "..." : t('delete')} cancelText={t('cancel')} />

            {/* Move to Folder Dialog */}
            {showMoveDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-background rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2"><Move className="h-5 w-5" /> {t('moveToFolder')}</h3>
                        <p className="text-sm text-muted-foreground">{selectedIds.length} project</p>
                        <div className="max-h-60 overflow-y-auto border rounded-lg">
                            {allFolderTree.map((item) => (
                                <button
                                    key={item.id ?? '__root__'}
                                    onClick={() => handleMoveProjects(item.id)}
                                    className={cn(
                                        "w-full text-left px-3 py-2 hover:bg-muted transition-colors cursor-pointer flex items-center gap-2 text-sm",
                                        item.id === currentFolderId && "bg-muted font-semibold"
                                    )}
                                    style={{ paddingLeft: `${(item.depth) * 16 + 12}px` }}
                                >
                                    {item.id === null ? <Home className="h-4 w-4" /> : <FolderOpen className="h-4 w-4 text-amber-500" />}
                                    {item.name}
                                </button>
                            ))}
                        </div>
                        <Button variant="outline" className="w-full cursor-pointer" onClick={() => setShowMoveDialog(false)}>{t('cancel')}</Button>
                    </motion.div>
                </div>
            )}

        </div>
    )
}
