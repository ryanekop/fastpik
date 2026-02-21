"use client"

import { useState, useEffect, useRef, DragEvent } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations, useLocale } from "next-intl"
import { Plus, Trash2, ExternalLink, Copy, Clock, Users, MessageCircle, Edit, CheckSquare, Square, X, PlusCircle, Search, Loader2, Bell, FolderOpen, ArrowUpDown, Move, ChevronRight, Home, FolderPlus, FileText } from "lucide-react"
import { isProjectExpired, getClientWhatsapp, generateShortId, type Project } from "@/lib/project-store"
import type { Folder } from "@/lib/supabase/folders"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
    onOpenProject: (project: Project) => void
    onEditProject: (project: Project) => void
    onDeleteProject: (id: string) => Promise<void>
    onBatchDeleteProjects: (ids: string[]) => Promise<void>
    onFoldersChanged: () => void
}

export function ProjectList({
    projects,
    folders,
    currentFolderId,
    breadcrumbPath,
    currentDepth,
    onNavigateToFolder,
    onCreateNew,
    onOpenProject,
    onEditProject,
    onDeleteProject,
    onBatchDeleteProjects,
    onFoldersChanged
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

    // Message Templates
    const [templates, setTemplates] = useState<{
        initialLink: { id: string, en: string } | null,
        extraLink: { id: string, en: string } | null,
        reminderLink: { id: string, en: string } | null
    }>({ initialLink: null, extraLink: null, reminderLink: null })
    const [vendorSlug, setVendorSlug] = useState<string | null>(null)
    const [dashboardDurationDisplay, setDashboardDurationDisplay] = useState<'selection' | 'download'>('selection')

    useEffect(() => {
        loadSettings()
    }, [])

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
                .select('msg_tmpl_link_initial, msg_tmpl_link_extra, msg_tmpl_reminder, vendor_name, dashboard_duration_display, default_expiry_days, default_download_expiry_days')
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
                setDashboardDurationDisplay(data.dashboard_duration_display || 'selection')
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
        return fallback
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
    const [extraDownloadExpiryDays, setExtraDownloadExpiryDays] = useState("14")
    const [isGeneratingExtra, setIsGeneratingExtra] = useState(false)
    const [showCustomExtraExpiryDialog, setShowCustomExtraExpiryDialog] = useState(false)
    const [customExtraTarget, setCustomExtraTarget] = useState<'selection' | 'download'>('selection')
    const [customExtraMonths, setCustomExtraMonths] = useState("")
    const [customExtraDays, setCustomExtraDays] = useState("")
    const [customExtraExpiryLabel, setCustomExtraExpiryLabel] = useState<string | null>(null)
    const [customExtraDownloadExpiryLabel, setCustomExtraDownloadExpiryLabel] = useState<string | null>(null)

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

    // Helper: generate dynamic link from project ID using current vendor slug
    const buildProjectLink = (projectId: string) => {
        if (typeof window === 'undefined') return ''
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

        const isExtra = !!(project.lockedPhotos && project.lockedPhotos.length > 0)
        const template = isExtra ? templates.extraLink : templates.initialLink
        const message = compileMessage(template, variables, isExtra)
        window.open(`https://wa.me/${clientWa}?text=${encodeURIComponent(message)}`, '_blank')
    }

    const copyTemplateForProject = (project: Project) => {
        const dynamicLink = buildProjectLink(project.id)
        const variables: Record<string, string> = {
            client_name: project.clientName,
            link: dynamicLink,
            count: project.maxPhotos.toString(),
            max_photos: project.maxPhotos.toString()
        }
        if (project.password) {
            variables.password = project.password
        }
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
        const isExtra = !!(project.lockedPhotos && project.lockedPhotos.length > 0)
        const template = isExtra ? templates.extraLink : templates.initialLink
        const message = compileMessage(template, variables, isExtra)
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(message)
            setCopiedTemplateId(project.id)
            setTimeout(() => setCopiedTemplateId(null), 2000)
        } else {
            const textArea = document.createElement("textarea")
            textArea.value = message
            textArea.style.position = "fixed"
            textArea.style.left = "-9999px"
            document.body.appendChild(textArea)
            textArea.focus()
            textArea.select()
            try { document.execCommand('copy'); setCopiedTemplateId(project.id); setTimeout(() => setCopiedTemplateId(null), 2000) } catch (err) { console.error('Failed to copy', err) }
            document.body.removeChild(textArea)
        }
    }

    const sendReminder = (project: Project) => {
        const clientWa = getClientWhatsapp(project)
        if (!clientWa) {
            setToastMessage(tc('noWhatsapp') || 'WhatsApp not set')
            setShowToast(true)
            return
        }

        const dynamicLink = buildProjectLink(project.id)

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

        const message = compileMessage(templates.reminderLink, variables, false)
        if (!message || !templates.reminderLink?.id) {
            // Fallback to default if no custom template
            let fallbackMessage = t('waReminderMessage', {
                name: project.clientName,
                link: dynamicLink,
                duration: variables.duration || formatExpiry(project.expiresAt)
            })
            // Append password info if available
            if (variables.password) {
                fallbackMessage += `\n\n🔐 Password: ${variables.password}`
            }
            // Append download duration if available (selection duration already in template as "Sisa waktu")
            if (variables.download_duration) {
                fallbackMessage += `\n📥 ${locale === 'id' ? 'Berlaku download' : 'Download valid for'}: ${variables.download_duration}`
            }
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

    // Filter projects by folder and search query
    const currentFolderProjects = sortByExpiry
        ? projects // In sort mode, show all projects flat
        : projects.filter(p => (p.folderId || null) === currentFolderId)

    const filteredProjects = (() => {
        let result = searchQuery.trim()
            ? currentFolderProjects.filter(p => p.clientName.toLowerCase().includes(searchQuery.toLowerCase()))
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

    if (projects.length === 0 && folders.length === 0) {
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
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    📋 {t('projectList')} ({projects.length})
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
            {currentSubfolders.length > 0 && !searchQuery.trim() && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <FolderOpen className="h-4 w-4" />
                        <span>Folder</span>
                        <div className="flex-1 border-t border-border/50" />
                    </div>
                    <div className="grid gap-3 overflow-hidden max-w-full">
                        {currentSubfolders.map((folder) => (
                            <div
                                key={folder.id}
                                draggable={!isSelectMode}
                                onDragStart={(e) => { e.dataTransfer.setData('text/plain', `folder:${folder.id}`); e.dataTransfer.effectAllowed = 'move' }}
                                onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                                onDragLeave={handleFolderDragLeave}
                                onDrop={(e) => handleFolderDrop(e, folder.id)}
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
                                            <div className="flex-1 min-w-0 flex items-center gap-3" onClick={() => onNavigateToFolder(folder.id)}>
                                                <FolderOpen className="h-5 w-5 text-amber-500 shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="font-semibold truncate">{folder.name}</h4>
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
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Project Section */}
            {filteredProjects.length > 0 && (
                <div className="space-y-2">
                    {currentSubfolders.length > 0 && !searchQuery.trim() && (
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>Proyek</span>
                            <div className="flex-1 border-t border-border/50" />
                        </div>
                    )}
                    <div className="grid gap-3 overflow-hidden max-w-full">
                        <AnimatePresence mode="popLayout">
                            {filteredProjects.map((project, index) => {
                                const expired = isProjectExpired(project)
                                const isSelected = selectedIds.includes(project.id)
                                const dynamicLink = buildProjectLink(project.id)
                                return (
                                    <motion.div key={project.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }} transition={{ delay: index * 0.05 }} className="overflow-hidden max-w-full" draggable={!isSelectMode} onDragStart={(e) => handleDragStart(e as any, project.id)}>
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
                                                            <span className="flex items-center gap-1 shrink-0"><Clock className="h-3 w-3" /><ExpiryDisplay expiresAt={dashboardDurationDisplay === 'download' ? project.downloadExpiresAt : project.expiresAt} /></span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap block" style={{ maxWidth: 'min(100%, calc(100vw - 100px))' }} suppressHydrationWarning>🔗 {dynamicLink}</p>
                                                    </div>
                                                    {!isSelectMode && (
                                                        <div className="flex items-center gap-1 flex-wrap w-full sm:w-auto justify-center sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 mt-2 sm:mt-0 border-border/50">
                                                            <Button size="icon" variant="ghost" onClick={() => copyLink(dynamicLink, project.id)} className="h-8 w-8 cursor-pointer" title={t('copyLink')}>{copiedId === project.id ? <span className="text-green-500 text-xs">✓</span> : <Copy className="h-4 w-4" />}</Button>
                                                            <Button size="icon" variant="ghost" onClick={() => copyTemplateForProject(project)} className="h-8 w-8 cursor-pointer text-purple-600 hover:text-purple-700" disabled={expired} title={t('copyTemplate')}>{copiedTemplateId === project.id ? <span className="text-green-500 text-xs">✓</span> : <FileText className="h-4 w-4" />}</Button>
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
                </div>
            )}

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
                                                if (!clientWa) { setToastMessage(tc('noWhatsapp')); setShowToast(true); return }
                                                const message = buildExtraTemplateMessage()
                                                window.open(`https://wa.me/${clientWa}?text=${encodeURIComponent(message)}`, '_blank')
                                            }} className="flex-1 bg-green-600 hover:bg-green-700 text-white cursor-pointer"><MessageCircle className="h-4 w-4 mr-2" />{t('sendToClientWa')}</Button>
                                            <Button variant="outline" className="flex-1 cursor-pointer" onClick={() => {
                                                const message = buildExtraTemplateMessage()
                                                if (navigator.clipboard && window.isSecureContext) {
                                                    navigator.clipboard.writeText(message)
                                                    setToastMessage(t('templateCopied'))
                                                    setShowToast(true)
                                                }
                                            }}><Copy className="h-4 w-4 mr-2" />{t('copyTemplate')}</Button>
                                        </div>
                                    )
                                })()}
                            </div>
                        )}
                    </motion.div>
                </div>
            )}

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
