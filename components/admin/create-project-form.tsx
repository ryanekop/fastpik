"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useTranslations, useLocale } from "next-intl"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Copy, ArrowRight, Check, ArrowLeft, MessageCircle, Eye, EyeOff, Loader2, ExternalLink, Trash2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { PhoneInput } from "@/components/ui/phone-input"
import { Toast } from "@/components/ui/popup-dialog"
import { generateShortId, type Project } from "@/lib/project-store"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type FormValues = {
    clientName: string
    gdriveLink: string
    clientWhatsapp: string
    adminWhatsapp: string
    countryCode: string
    maxPhotos: string
    password: string
    detectSubfolders: boolean
    expiryDays: string
    downloadExpiryDays: string
    selectionEnabled: boolean
    downloadEnabled: boolean
    extraEnabled: boolean
    extraMaxPhotos: string
    extraExpiryDays: string
    printEnabled: boolean
    printSizes: string
    printExpiryDays: string
    lockedPhotos: string
}

type PrintSize = { name: string; quota: number }
type PrintTemplate = { name: string; sizes: PrintSize[] }
type PrintTemplateSelection = number | 'custom' | -1

const formSchema = z.object({
    clientName: z.string().min(2, { message: "Nama klien minimal 2 karakter." }),
    gdriveLink: z.string().url({ message: "Masukkan URL yang valid." }),
    clientWhatsapp: z.string().min(10, { message: "Masukkan nomor WhatsApp yang valid." }),
    adminWhatsapp: z.string().min(10, { message: "Masukkan nomor WhatsApp admin yang valid." }),
    countryCode: z.string(),
    maxPhotos: z.string(),
    password: z.string(),
    detectSubfolders: z.boolean(),
    expiryDays: z.string(),
    downloadExpiryDays: z.string(),
    selectionEnabled: z.boolean(),
    downloadEnabled: z.boolean(),
    extraEnabled: z.boolean(),
    extraMaxPhotos: z.string(),
    extraExpiryDays: z.string(),
    printEnabled: z.boolean(),
    printSizes: z.string(),
    printExpiryDays: z.string(),
    lockedPhotos: z.string(),
}).superRefine((values, ctx) => {
    const maxPhotosNum = parseInt(values.maxPhotos)
    if (values.selectionEnabled && (!values.maxPhotos || !Number.isFinite(maxPhotosNum) || maxPhotosNum <= 0)) {
        ctx.addIssue({
            code: 'custom',
            path: ['maxPhotos'],
            message: "Masukkan jumlah foto.",
        })
    }
})

interface CreateProjectFormProps {
    onBack?: () => void
    onProjectCreated?: (project: Project) => void
    editProject?: Project | null
    onEditComplete?: () => void
    currentFolderId?: string | null
    focusFeature?: 'extra' | 'print' | null
}

export function CreateProjectForm({ onBack, onProjectCreated, editProject, onEditComplete, currentFolderId, focusFeature = null }: CreateProjectFormProps) {
    const t = useTranslations('Admin')
    const tc = useTranslations('Client')
    const locale = useLocale()
    const supabase = createClient()
    const [generatedLink, setGeneratedLink] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [copiedTemplate, setCopiedTemplate] = useState(false)
    const [currentProject, setCurrentProject] = useState<Project | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [vendorSlug, setVendorSlug] = useState<string | null>(null)
    const [globalPrintEnabled, setGlobalPrintEnabled] = useState(false)
    const [printTemplates, setPrintTemplates] = useState<PrintTemplate[]>([])
    const [selectedPrintTemplateIdx, setSelectedPrintTemplateIdx] = useState<PrintTemplateSelection>(editProject?.printSizes?.length ? 'custom' : -1)

    // Message template from settings
    const [initialTemplate, setInitialTemplate] = useState<{ id: string, en: string } | null>(null)

    // Custom duration dialog states
    const [showCustomExpiryDialog, setShowCustomExpiryDialog] = useState(false)
    const [customExpiryTarget, setCustomExpiryTarget] = useState<'expiryDays' | 'downloadExpiryDays' | 'extraExpiryDays' | 'printExpiryDays'>('expiryDays')
    const [customMonths, setCustomMonths] = useState("")
    const [customDays, setCustomDays] = useState("")
    const [customSelectionExpiryLabel, setCustomSelectionExpiryLabel] = useState<string | null>(null)
    const [customDownloadExpiryLabel, setCustomDownloadExpiryLabel] = useState<string | null>(null)
    const [customExtraExpiryLabel, setCustomExtraExpiryLabel] = useState<string | null>(null)
    const [customPrintExpiryLabel, setCustomPrintExpiryLabel] = useState<string | null>(null)
    const extraSectionRef = useRef<HTMLDivElement | null>(null)
    const printSectionRef = useRef<HTMLDivElement | null>(null)
    const [highlightedSection, setHighlightedSection] = useState<'extra' | 'print' | null>(null)

    const isEditing = !!editProject

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            clientName: editProject?.clientName || "",
            gdriveLink: editProject?.gdriveLink || "",
            clientWhatsapp: editProject?.clientWhatsapp || "",
            adminWhatsapp: editProject?.adminWhatsapp || "",
            countryCode: editProject?.countryCode || "ID",
            maxPhotos: editProject?.maxPhotos?.toString() || "",
            password: editProject?.password || "",
            detectSubfolders: editProject?.detectSubfolders || false,
            expiryDays: isEditing ? "__keep__" : "",
            downloadExpiryDays: isEditing ? "__keep__" : "",
            selectionEnabled: editProject?.selectionEnabled !== false,
            downloadEnabled: editProject?.downloadEnabled !== false,
            extraEnabled: editProject?.extraEnabled || false,
            extraMaxPhotos: editProject?.extraMaxPhotos?.toString() || "",
            extraExpiryDays: isEditing ? "__keep__" : "",
            printEnabled: editProject?.printEnabled || false,
            printSizes: (editProject?.printSizes || []).map((size) => `${size.name}:${size.quota}`).join(", "),
            printExpiryDays: isEditing ? "__keep__" : "",
            lockedPhotos: editProject?.lockedPhotos?.join("\n") || "",
        },
    })

    const parsePrintSizes = (value: string): PrintSize[] => value
        .split(',')
        .map((entry) => {
            const [name, quota] = entry.trim().split(':')
            return { name: (name || '').trim(), quota: Math.max(1, parseInt(quota || '1') || 1) }
        })
        .filter((entry) => entry.name)

    const serializePrintSizes = (sizes: PrintSize[] = []) => sizes
        .filter((size) => size.name?.trim())
        .map((size) => `${size.name.trim()}:${Math.max(1, Number(size.quota) || 1)}`)
        .join(", ")

    const formatPrintSizesSummary = (value: string) => parsePrintSizes(value)
        .map((size) => `${size.name}×${size.quota}`)
        .join(", ")

    const findMatchingPrintTemplate = (templates: PrintTemplate[], value: string) => {
        const normalizedValue = serializePrintSizes(parsePrintSizes(value))
        if (!normalizedValue) return -1
        return templates.findIndex((template) => serializePrintSizes(template.sizes) === normalizedValue)
    }

    const normalizePrintTemplates = (templates: PrintTemplate[] = []) => templates
        .map((template) => ({
            name: (template.name || '').trim(),
            sizes: (template.sizes || [])
                .map((size) => ({ name: (size.name || '').trim(), quota: Math.max(1, Number(size.quota) || 1) }))
                .filter((size) => size.name)
        }))
        .filter((template) => template.sizes.length > 0)

    const handlePrintTemplateChange = (value: string) => {
        if (value === 'custom') {
            setSelectedPrintTemplateIdx('custom')
            return
        }
        if (value === '-1') {
            setSelectedPrintTemplateIdx(-1)
            form.setValue('printSizes', '', { shouldDirty: true, shouldValidate: true })
            return
        }

        const templateIdx = parseInt(value)
        const template = printTemplates[templateIdx]
        if (!template) return

        setSelectedPrintTemplateIdx(templateIdx)
        form.setValue('printSizes', serializePrintSizes(template.sizes), { shouldDirty: true, shouldValidate: true })
        form.clearErrors('printSizes')
    }

    // Load shared settings in both create/edit. Only apply form defaults for new projects.
    useEffect(() => {
        loadProjectSettings({ applyDefaults: !isEditing })
    }, [isEditing])

    useEffect(() => {
        if (!isEditing || !focusFeature) return

        const targetRef = focusFeature === 'extra' ? extraSectionRef : printSectionRef
        if (!targetRef.current) return

        const scrollTimeoutId = window.setTimeout(() => {
            targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            setHighlightedSection(focusFeature)
        }, 250)

        const clearTimeoutId = window.setTimeout(() => {
            setHighlightedSection((current) => (current === focusFeature ? null : current))
        }, 3500)

        return () => {
            window.clearTimeout(scrollTimeoutId)
            window.clearTimeout(clearTimeoutId)
        }
    }, [isEditing, focusFeature])

    const loadProjectSettings = async ({ applyDefaults }: { applyDefaults: boolean }) => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase
                .from('settings')
                .select('default_admin_whatsapp, vendor_name, default_max_photos, default_detect_subfolders, default_expiry_days, default_download_expiry_days, default_password, default_selection_enabled, default_download_enabled, default_extra_enabled, default_extra_max_photos, default_extra_expiry_days, default_print_selection_enabled, msg_tmpl_link_initial, print_enabled, print_templates, default_print_expiry_days')
                .eq('user_id', user.id)
                .maybeSingle()

            if (data?.vendor_name) {
                const slug = data.vendor_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                setVendorSlug(slug)
            }
            setGlobalPrintEnabled(Boolean(data?.print_enabled))
            if (data?.msg_tmpl_link_initial) {
                setInitialTemplate(data.msg_tmpl_link_initial as { id: string, en: string })
            }
            const templates = normalizePrintTemplates((data?.print_templates || []) as PrintTemplate[])
            setPrintTemplates(templates)
            const currentPrintSizes = form.getValues('printSizes')
            const matchingTemplateIdx = findMatchingPrintTemplate(templates, currentPrintSizes)
            if (matchingTemplateIdx >= 0) {
                setSelectedPrintTemplateIdx(matchingTemplateIdx)
            } else if (currentPrintSizes) {
                setSelectedPrintTemplateIdx('custom')
            } else {
                setSelectedPrintTemplateIdx(templates.length === 0 ? 'custom' : -1)
            }

            if (!applyDefaults) return

            const standardOptions = ['', '1', '3', '5', '7', '14', '30']
            const formatCustomDuration = (days: number) => {
                const months = Math.floor(days / 30)
                const remainDays = days % 30
                const parts: string[] = []
                if (months > 0) parts.push(`${months} ${t('customMonthsLabel')}`)
                if (remainDays > 0 || parts.length === 0) parts.push(`${remainDays > 0 ? remainDays : days} ${t('customDaysLabel')}`)
                return parts.join(' ')
            }
            if (data?.default_admin_whatsapp) {
                form.setValue('adminWhatsapp', data.default_admin_whatsapp)
            }
            if (data?.default_max_photos) {
                form.setValue('maxPhotos', data.default_max_photos.toString())
            }
            if (data?.default_detect_subfolders !== undefined && data?.default_detect_subfolders !== null) {
                form.setValue('detectSubfolders', Boolean(data.default_detect_subfolders))
            }
            form.setValue('selectionEnabled', data?.default_selection_enabled !== false)
            form.setValue('downloadEnabled', data?.default_download_enabled !== false)
            form.setValue('extraEnabled', Boolean(data?.default_extra_enabled))
            if (data?.default_extra_max_photos) {
                form.setValue('extraMaxPhotos', data.default_extra_max_photos.toString())
            } else if (data?.default_extra_enabled) {
                form.setValue('extraMaxPhotos', '1')
            }
            const defaultPrintEnabled = Boolean(data?.default_print_selection_enabled) && Boolean(data?.print_enabled)
            form.setValue('printEnabled', defaultPrintEnabled)
            if (data?.default_expiry_days) {
                const val = data.default_expiry_days.toString()
                form.setValue('expiryDays', val)
                if (!standardOptions.includes(val)) {
                    setCustomSelectionExpiryLabel(formatCustomDuration(data.default_expiry_days))
                }
            }
            if (data?.default_download_expiry_days) {
                const val = data.default_download_expiry_days.toString()
                form.setValue('downloadExpiryDays', val)
                if (!standardOptions.includes(val)) {
                    setCustomDownloadExpiryLabel(formatCustomDuration(data.default_download_expiry_days))
                }
            }
            if (data?.default_extra_expiry_days) {
                const val = data.default_extra_expiry_days.toString()
                form.setValue('extraExpiryDays', val)
                if (!standardOptions.includes(val)) {
                    setCustomExtraExpiryLabel(formatCustomDuration(data.default_extra_expiry_days))
                }
            }
            if (data?.default_password) {
                form.setValue('password', data.default_password)
            }
            if (data?.default_print_expiry_days) {
                const val = data.default_print_expiry_days.toString()
                form.setValue('printExpiryDays', val)
                if (!standardOptions.includes(val)) {
                    setCustomPrintExpiryLabel(formatCustomDuration(data.default_print_expiry_days))
                }
            }
            if (defaultPrintEnabled && templates.length > 0 && !form.getValues('printSizes')) {
                setSelectedPrintTemplateIdx(0)
                form.setValue('printSizes', serializePrintSizes(templates[0].sizes), { shouldValidate: true })
            }

        } catch (err) {
            console.log('No default settings found')
        }
    }

    const clientName = form.watch("clientName")
    const gdriveLink = form.watch("gdriveLink")
    const clientWhatsapp = form.watch("clientWhatsapp")
    const adminWhatsapp = form.watch("adminWhatsapp")
    const maxPhotos = form.watch("maxPhotos")
    const selectionEnabledForValidity = form.watch("selectionEnabled")

    const hasValidMaxPhotos = !selectionEnabledForValidity || (maxPhotos.length > 0 && parseInt(maxPhotos) > 0)
    const isFormValid = clientName.length >= 2 && gdriveLink.length > 0 && clientWhatsapp.length >= 10 && adminWhatsapp.length >= 10 && hasValidMaxPhotos

    const [remainingDays, setRemainingDays] = useState<number | null>(null)

    useEffect(() => {
        if (editProject?.expiresAt) {
            setRemainingDays(Math.max(0, Math.ceil((editProject.expiresAt - Date.now()) / (24 * 60 * 60 * 1000))))
        }
    }, [editProject?.expiresAt])

    const [remainingDownloadDays, setRemainingDownloadDays] = useState<number | null>(null)

    useEffect(() => {
        if (editProject?.downloadExpiresAt) {
            setRemainingDownloadDays(Math.max(0, Math.ceil((editProject.downloadExpiresAt - Date.now()) / (24 * 60 * 60 * 1000))))
        }
    }, [editProject?.downloadExpiresAt])

    const [error, setError] = useState<string | null>(null)
    const [upgradeRequired, setUpgradeRequired] = useState(false)
    const [toast, setToast] = useState<{ open: boolean; message: string; type: 'info' | 'success' | 'warning' | 'danger' }>({ open: false, message: "", type: "success" })

    const showAdminToast = (message: string, type: 'info' | 'success' | 'warning' | 'danger' = 'success') => {
        setToast({ open: true, message, type })
    }

    async function onSubmit(values: FormValues) {
        setIsSubmitting(true)
        setError(null)
        setUpgradeRequired(false)
        try {
            const maxPhotosNum = values.selectionEnabled ? (parseInt(values.maxPhotos) || 1) : null
            const lockedPhotosArray = values.lockedPhotos.split('\n').map(l => l.trim()).filter(l => l.length > 0)
            const extraMaxPhotosNum = values.extraEnabled ? (parseInt(values.extraMaxPhotos) || 0) : 0
            const printSizes = values.printEnabled ? parsePrintSizes(values.printSizes) : []
            const effectivePrintEnabled = values.printEnabled && globalPrintEnabled
            if (!values.selectionEnabled && !values.downloadEnabled && !values.extraEnabled && !effectivePrintEnabled) {
                setError(t('clientFeatureRequired'))
                showAdminToast(t('clientFeatureRequired'), 'danger')
                return
            }
            if (values.printEnabled && globalPrintEnabled && printSizes.length === 0) {
                form.setError('printSizes', { message: t('printSizesRequired') })
                setError(t('printSizesRequired'))
                showAdminToast(t('printSizesRequired'), 'danger')
                return
            }

            const projectId = isEditing && editProject ? editProject.id : generateShortId()
            const origin = window.location.origin
            const pathParts = window.location.pathname.split('/')
            const locale = pathParts[1] || 'id'
            const link = vendorSlug
                ? `${origin}/${locale}/client/${vendorSlug}/${projectId}`
                : `${origin}/${locale}/client/${projectId}`

            const projectPayload: any = {
                id: projectId,
                clientName: values.clientName,
                gdriveLink: values.gdriveLink,
                clientWhatsapp: values.clientWhatsapp,
                adminWhatsapp: values.adminWhatsapp,
                countryCode: values.countryCode,
                maxPhotos: maxPhotosNum,
                password: values.password,
                detectSubfolders: values.detectSubfolders,
                selectionEnabled: values.selectionEnabled,
                downloadEnabled: values.downloadEnabled,
                lockedPhotos: lockedPhotosArray.length > 0 ? lockedPhotosArray : undefined,
                extraEnabled: values.extraEnabled,
                extraMaxPhotos: values.extraEnabled ? extraMaxPhotosNum : null,
                printEnabled: effectivePrintEnabled,
                printSizes: effectivePrintEnabled ? printSizes : [],
                createdAt: isEditing && editProject ? editProject.createdAt : Date.now(),
                link: link,
                folderId: isEditing && editProject ? editProject.folderId : (currentFolderId || null)
            }

            // Only include expiry fields if user actually changed them (not '__keep__')
            if (values.expiryDays !== '__keep__') {
                const expiryDaysNum = values.expiryDays ? parseInt(values.expiryDays) : undefined
                projectPayload.expiresAt = expiryDaysNum ? Date.now() + (expiryDaysNum * 24 * 60 * 60 * 1000) : null
            }
            if (values.downloadExpiryDays !== '__keep__') {
                const downloadExpiryDaysNum = values.downloadExpiryDays ? parseInt(values.downloadExpiryDays) : undefined
                projectPayload.downloadExpiresAt = downloadExpiryDaysNum ? Date.now() + (downloadExpiryDaysNum * 24 * 60 * 60 * 1000) : null
            }
            if (values.extraExpiryDays !== '__keep__') {
                const extraExpiryDaysNum = values.extraEnabled && values.extraExpiryDays ? parseInt(values.extraExpiryDays) : undefined
                projectPayload.extraExpiresAt = extraExpiryDaysNum ? Date.now() + (extraExpiryDaysNum * 24 * 60 * 60 * 1000) : null
            }
            if (values.printExpiryDays !== '__keep__') {
                const printExpiryDaysNum = effectivePrintEnabled && values.printExpiryDays ? parseInt(values.printExpiryDays) : undefined
                projectPayload.printExpiresAt = printExpiryDaysNum ? Date.now() + (printExpiryDaysNum * 24 * 60 * 60 * 1000) : null
            }


            projectPayload.projectType = 'edit'

            if (isEditing && editProject) {
                const res = await fetch(`/api/projects/${editProject.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(projectPayload) })
                if (!res.ok) throw new Error("Failed to update project")
                showAdminToast(t('saveSuccess'), 'success')
                onEditComplete?.()
            } else {
                const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(projectPayload) })
                if (!res.ok) {
                    const errorData = await res.json()
                    if (res.status === 401) {
                        window.location.href = `/${locale}/dashboard/login`
                        return
                    }
                    if (res.status === 403 && errorData.upgradeRequired) {
                        setError(errorData.message)
                        setUpgradeRequired(true)
                        showAdminToast(errorData.message, 'danger')
                        return
                    }
                    throw new Error(errorData.message || "Failed to create project")
                }
                const savedProject = await res.json()
                setCurrentProject(savedProject)
                onProjectCreated?.(savedProject)
                setGeneratedLink(link)
                showAdminToast(t('saveSuccess'), 'success')
                import('@/lib/cache').then(({ preloadProjectPhotos }) => { preloadProjectPhotos(values.gdriveLink, values.detectSubfolders, 2000) })
            }
        } catch (error: any) {
            console.error(error)
            const message = error.message || t('saveFailed')
            setError(message)
            showAdminToast(message, 'danger')
        } finally {
            setIsSubmitting(false)
        }
    }

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

    const copyToClipboard = () => {
        if (!generatedLink) return
        copyText(generatedLink, () => {
            setCopied(true)
            showAdminToast(t('linkCopied'), 'success')
            setTimeout(() => setCopied(false), 2000)
        })
    }

    // Compile message using template (same logic as project-list)
    const compileMessage = (template: { id: string, en: string } | null, variables: Record<string, string>) => {
        const lang = locale as 'id' | 'en'
        const tmplText = template?.[lang] || ""
        if (tmplText.trim()) {
            let msg = tmplText
            Object.entries(variables).forEach(([key, val]) => {
                msg = msg.replace(new RegExp(`{{${key}}}`, 'g'), val)
            })
            msg = msg.replace(/{{(\w+)}}/g, '').replace(/\n{3,}/g, '\n\n').trim()
            return msg
        }
        return null // No template set
    }

    const buildClientMessage = () => {
        if (!generatedLink || !currentProject) return ''
        if (currentProject.selectionEnabled === false) {
            let message = `Halo ${currentProject.clientName},\n\nLink project Anda:\n${generatedLink}`
            if (currentProject.password) {
                message += `\n\n🔐 Password: ${currentProject.password}`
            }
            if (currentProject.downloadExpiresAt) {
                const diff = currentProject.downloadExpiresAt - Date.now()
                if (diff > 0) {
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                    if (days > 0) message += `\n📥 ${t('downloadValidFor')}: ${days} ${t('days')}`
                    else if (hours > 0) message += `\n📥 ${t('downloadValidFor')}: ${hours} ${t('hours')}`
                    else message += `\n📥 ${t('downloadValidFor')}: ${t('lessThanHour')}`
                }
            }
            return message
        }

        // Build variables for template
        const variables: Record<string, string> = {
            client_name: currentProject.clientName,
            link: generatedLink,
            count: (currentProject.maxPhotos ?? '').toString(),
            max_photos: (currentProject.maxPhotos ?? '').toString(),
            print_sizes: (currentProject.printSizes || []).map((size) => `${size.name}×${size.quota}`).join(', ')
        }

        if (currentProject.password) {
            variables.password = currentProject.password
        }
        if (currentProject.expiresAt) {
            const diff = currentProject.expiresAt - Date.now()
            if (diff > 0) {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24))
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                if (days > 0) variables.duration = `${days} ${t('days')}`
                else if (hours > 0) variables.duration = `${hours} ${t('hours')}`
                else variables.duration = t('lessThanHour')
            }
        }
        if (currentProject.downloadExpiresAt) {
            const diff = currentProject.downloadExpiresAt - Date.now()
            if (diff > 0) {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24))
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                if (days > 0) variables.download_duration = `${days} ${t('days')}`
                else if (hours > 0) variables.download_duration = `${hours} ${t('hours')}`
                else variables.download_duration = t('lessThanHour')
            }
        }
        if (currentProject.printExpiresAt) {
            const diff = currentProject.printExpiresAt - Date.now()
            if (diff > 0) {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24))
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                if (days > 0) variables.print_duration = `${days} ${t('days')}`
                else if (hours > 0) variables.print_duration = `${hours} ${t('hours')}`
                else variables.print_duration = t('lessThanHour')
            }
        }

        // Try custom template first
        const compiledMessage = compileMessage(initialTemplate, variables)
        if (compiledMessage) return compiledMessage

        // Fallback to hardcoded message
        let message = tc('waClientMessage', { name: currentProject.clientName, link: generatedLink, max: (currentProject.maxPhotos ?? '').toString() })
        if (variables.password) {
            message += `\n\n🔐 Password: ${variables.password}`
        }
        if (variables.duration) {
            message += `\n⏰ ${t('selectionValidFor')}: ${variables.duration}`
        }
        if (variables.download_duration) {
            message += `\n📥 ${t('downloadValidFor')}: ${variables.download_duration}`
        }
        if (variables.print_duration) {
            message += `\n🖨️ ${t('printDuration')}: ${variables.print_duration}`
        }
        return message
    }

    const sendToClient = () => {
        if (generatedLink && currentProject) {
            const message = buildClientMessage()
            window.open(`https://api.whatsapp.com/send/?phone=${currentProject.clientWhatsapp}&text=${encodeURIComponent(message)}`, '_blank')
        }
    }

    const copyTemplate = () => {
        if (generatedLink && currentProject) {
            const message = buildClientMessage()
            copyText(message, () => {
                setCopiedTemplate(true)
                showAdminToast(t('templateCopied'), 'success')
                setTimeout(() => setCopiedTemplate(false), 2000)
            })
        }
    }

    const createNewProject = () => {
        setGeneratedLink(null)
        setCurrentProject(null)
        form.reset({ clientName: "", gdriveLink: "", clientWhatsapp: "", adminWhatsapp: "", countryCode: "ID", maxPhotos: "", password: "", detectSubfolders: false, expiryDays: "", downloadExpiryDays: "", selectionEnabled: true, downloadEnabled: true, extraEnabled: false, extraMaxPhotos: "", extraExpiryDays: "", printEnabled: false, printSizes: "", printExpiryDays: "", lockedPhotos: "" })
        setCustomSelectionExpiryLabel(null)
        setCustomDownloadExpiryLabel(null)
        setCustomExtraExpiryLabel(null)
        setCustomPrintExpiryLabel(null)
        setSelectedPrintTemplateIdx(printTemplates.length === 0 ? 'custom' : -1)
        // Re-fetch settings so vendor slug and admin WA are fresh from DB
        loadProjectSettings({ applyDefaults: true })
    }

    const getKeepLabel = (fieldName: 'expiryDays' | 'downloadExpiryDays' | 'extraExpiryDays' | 'printExpiryDays') => {
        if (fieldName === 'expiryDays') {
            if (!editProject?.expiresAt) return `⏸️ — ${t('forever')} —`
            const days = Math.max(0, Math.ceil((editProject.expiresAt - Date.now()) / (24 * 60 * 60 * 1000)))
            return `⏸️ — ${days} ${t('days')} —`
        }
        if (fieldName === 'downloadExpiryDays') {
            if (!editProject?.downloadExpiresAt) return `⏸️ — ${t('forever')} —`
            const days = Math.max(0, Math.ceil((editProject.downloadExpiresAt - Date.now()) / (24 * 60 * 60 * 1000)))
            return `⏸️ — ${days} ${t('days')} —`
        }
        if (fieldName === 'extraExpiryDays') {
            if (!editProject?.extraExpiresAt) return `⏸️ — ${t('forever')} —`
            const days = Math.max(0, Math.ceil((editProject.extraExpiresAt - Date.now()) / (24 * 60 * 60 * 1000)))
            return `⏸️ — ${days} ${t('days')} —`
        }
        if (!editProject?.printExpiresAt) return `⏸️ — ${t('forever')} —`
        const days = Math.max(0, Math.ceil((editProject.printExpiresAt - Date.now()) / (24 * 60 * 60 * 1000)))
        return `⏸️ — ${days} ${t('days')} —`
    }

    const expiryOptions = [
        ...(isEditing ? [{ value: "__keep__", label: `⏸️ — ${t('noChange')} —` }] : []),
        { value: "", label: `♾️ ${t('forever')}` },
        { value: "1", label: `1 ${t('days')}` },
        { value: "3", label: `3 ${t('days')}` },
        { value: "5", label: `5 ${t('days')}` },
        { value: "7", label: `7 ${t('days')}` },
        { value: "14", label: `14 ${t('days')}` },
        { value: "30", label: `30 ${t('days')}` },
        { value: "custom", label: `✏️ ${t('custom')}` },
    ]

    const handleExpiryChange = (value: string, fieldName: 'expiryDays' | 'downloadExpiryDays' | 'extraExpiryDays' | 'printExpiryDays') => {
        if (value === 'custom') {
            setCustomExpiryTarget(fieldName)
            setCustomMonths("")
            setCustomDays("")
            setShowCustomExpiryDialog(true)
        } else {
            form.setValue(fieldName, value)
            if (fieldName === 'expiryDays') setCustomSelectionExpiryLabel(null)
            if (fieldName === 'downloadExpiryDays') setCustomDownloadExpiryLabel(null)
            if (fieldName === 'extraExpiryDays') setCustomExtraExpiryLabel(null)
            if (fieldName === 'printExpiryDays') setCustomPrintExpiryLabel(null)
        }
    }

    const selectionEnabled = form.watch('selectionEnabled')
    const downloadEnabled = form.watch('downloadEnabled')
    const extraEnabled = form.watch('extraEnabled')
    const printEnabled = form.watch('printEnabled')
    const printSizesValue = form.watch('printSizes')
    const selectedPrintTemplateName = typeof selectedPrintTemplateIdx === 'number' && selectedPrintTemplateIdx >= 0
        ? printTemplates[selectedPrintTemplateIdx]?.name || null
        : null
    const selectionTone = {
        active: "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/30",
        idle: "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/30",
        title: "text-green-800 dark:text-green-200",
    }
    const downloadTone = {
        active: "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30",
        idle: "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30",
        title: "text-blue-800 dark:text-blue-200",
    }
    const extraTone = {
        active: "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30",
        idle: "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30",
        divider: "border-amber-200/70 dark:border-amber-800/60",
        helper: "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30",
        title: "text-amber-700 dark:text-amber-300",
        highlight: "ring-2 ring-amber-400 bg-amber-50/70 dark:bg-amber-950/35",
    }
    const printTone = {
        active: "border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/30",
        idle: "border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/30",
        divider: "border-purple-200/70 dark:border-purple-800/60",
        helper: "border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/30",
        title: "text-purple-700 dark:text-purple-300",
        highlight: "ring-2 ring-purple-400 bg-purple-50/70 dark:bg-purple-950/35",
    }

    const confirmCustomExpiry = () => {
        const months = parseInt(customMonths) || 0
        const days = parseInt(customDays) || 0
        if (months <= 0 && days <= 0) return
        const totalDays = (months * 30) + days
        const parts: string[] = []
        if (months > 0) parts.push(`${months} ${t('customMonthsLabel')}`)
        if (days > 0) parts.push(`${days} ${t('customDaysLabel')}`)
        const label = parts.join(' ')
        form.setValue(customExpiryTarget, totalDays.toString())
        if (customExpiryTarget === 'expiryDays') setCustomSelectionExpiryLabel(label)
        if (customExpiryTarget === 'downloadExpiryDays') setCustomDownloadExpiryLabel(label)
        if (customExpiryTarget === 'extraExpiryDays') setCustomExtraExpiryLabel(label)
        if (customExpiryTarget === 'printExpiryDays') setCustomPrintExpiryLabel(label)
        setShowCustomExpiryDialog(false)
    }

    return (
        <div className="w-full">
            <Toast isOpen={toast.open} message={toast.message} type={toast.type} position="top-right" duration={1800} onClose={() => setToast((current) => ({ ...current, open: false }))} />
            {onBack && (<Button variant="ghost" onClick={onBack} className="mb-4 gap-2 cursor-pointer"><ArrowLeft className="h-4 w-4" />{t('backToList')}</Button>)}
            <h2 className="text-xl font-semibold mb-4">{isEditing ? `✏️ ${t('editProject')}` : t('createNew')}</h2>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <FormField control={form.control} name="clientName" render={({ field }) => (<FormItem><FormLabel>👤 {t('clientName')}</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                        <FormField control={form.control} name="gdriveLink" render={({ field }) => (<FormItem><FormLabel>📁 {t('gdriveLink')}</FormLabel><FormDescription>{t('gdrivePublicHint')}</FormDescription><FormControl><Input placeholder="https://drive.google.com/drive/folders/..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.12 }}>
                        <FormField control={form.control} name="detectSubfolders" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3"><div className="space-y-0.5"><FormLabel>📂 {t('detectSubfolders')}</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="cursor-pointer" /></FormControl></FormItem>)} />
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
                        <FormField control={form.control} name="clientWhatsapp" render={({ field }) => (<FormItem><FormLabel>📱 {t('waClientLabel')}</FormLabel><FormControl><PhoneInput value={field.value} onChange={(fullNumber, countryCode) => { field.onChange(fullNumber); form.setValue('countryCode', countryCode) }} placeholder="812xxxxxxxx" /></FormControl><FormMessage /></FormItem>)} />
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                        <FormField control={form.control} name="adminWhatsapp" render={({ field }) => (<FormItem><FormLabel>📲 {t('waAdminLabel')}</FormLabel><FormControl><PhoneInput value={field.value} onChange={(fullNumber) => { field.onChange(fullNumber) }} placeholder="812xxxxxxxx" /></FormControl><FormMessage /></FormItem>)} />
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
                        <FormField control={form.control} name="maxPhotos" render={({ field }) => (<FormItem><FormLabel>📸 {t('maxPhotos')}</FormLabel><FormControl><Input type="number" min="1" placeholder="5" autoComplete="off" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.32 }} className="rounded-xl border p-4 space-y-4">
                        <div>
                            <p className="text-sm font-semibold">🔗 {t('mainClientLinkMenu')}</p>
                            <p className="text-xs text-muted-foreground">{t('mainClientLinkMenuHint')}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <FormField
                                control={form.control}
                                name="selectionEnabled"
                                render={({ field }) => (
                                    <FormItem
                                        className={cn(
                                            "flex flex-row items-center justify-between rounded-lg border p-3 transition-colors",
                                            selectionEnabled ? selectionTone.active : selectionTone.idle
                                        )}
                                    >
                                        <div className="space-y-0.5">
                                            <FormLabel className={cn(selectionTone.title, selectionEnabled && "font-semibold")}>📸 {t('selectPhotos')}</FormLabel>
                                            <p className="text-xs text-muted-foreground">{t('selectPhotosFeatureHint')}</p>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} className="cursor-pointer" />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="downloadEnabled"
                                render={({ field }) => (
                                    <FormItem
                                        className={cn(
                                            "flex flex-row items-center justify-between rounded-lg border p-3 transition-colors",
                                            downloadEnabled ? downloadTone.active : downloadTone.idle
                                        )}
                                    >
                                        <div className="space-y-0.5">
                                            <FormLabel className={cn(downloadTone.title, downloadEnabled && "font-semibold")}>📥 {t('downloadPhotos')}</FormLabel>
                                            <p className="text-xs text-muted-foreground">{t('downloadPhotosFeatureHint')}</p>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} className="cursor-pointer" />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.34 }} className="rounded-xl border p-4 space-y-4">
                        <div>
                            <p className="text-sm font-semibold">⏰ {t('mainMenuDurationTitle')}</p>
                            <p className="text-xs text-muted-foreground">{t('mainMenuDurationHint')}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div
                                className={cn(
                                    "rounded-lg border p-3 transition-colors",
                                    selectionEnabled ? selectionTone.active : selectionTone.idle
                                )}
                            >
                                <FormField control={form.control} name="expiryDays" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className={cn(selectionTone.title, selectionEnabled && "font-semibold")}>⏰ {t('selectionDuration')}</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                {customSelectionExpiryLabel && (
                                                    <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer" onClick={() => { setCustomExpiryTarget('expiryDays'); setCustomMonths(''); setCustomDays(''); setShowCustomExpiryDialog(true) }}>
                                                        <span>✏️ {customSelectionExpiryLabel}</span>
                                                        <button type="button" className="text-muted-foreground hover:text-foreground ml-2" onClick={(e) => { e.stopPropagation(); form.setValue('expiryDays', ''); setCustomSelectionExpiryLabel(null) }}>✕</button>
                                                    </div>
                                                )}
                                                <select className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer ${customSelectionExpiryLabel ? 'hidden' : ''}`} value={customSelectionExpiryLabel ? 'custom' : field.value} onChange={(e) => handleExpiryChange(e.target.value, 'expiryDays')}>
                                                    {isEditing && <option value="__keep__">{getKeepLabel('expiryDays')}</option>}
                                                    {expiryOptions.filter(o => o.value !== '__keep__').map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                                                </select>
                                            </div>
                                        </FormControl>
                                        {isEditing && editProject?.expiresAt && remainingDays !== null && (<p className="text-xs text-muted-foreground mt-1">⏳ {t('remainingTime')}: {remainingDays} {t('days')}</p>)}
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            <div
                                className={cn(
                                    "rounded-lg border p-3 transition-colors",
                                    downloadEnabled ? downloadTone.active : downloadTone.idle
                                )}
                            >
                                <FormField control={form.control} name="downloadExpiryDays" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className={cn(downloadTone.title, downloadEnabled && "font-semibold")}>📥 {t('downloadDuration')}</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                {customDownloadExpiryLabel && (
                                                    <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer" onClick={() => { setCustomExpiryTarget('downloadExpiryDays'); setCustomMonths(''); setCustomDays(''); setShowCustomExpiryDialog(true) }}>
                                                        <span>✏️ {customDownloadExpiryLabel}</span>
                                                        <button type="button" className="text-muted-foreground hover:text-foreground ml-2" onClick={(e) => { e.stopPropagation(); form.setValue('downloadExpiryDays', ''); setCustomDownloadExpiryLabel(null) }}>✕</button>
                                                    </div>
                                                )}
                                                <select className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer ${customDownloadExpiryLabel ? 'hidden' : ''}`} value={customDownloadExpiryLabel ? 'custom' : field.value} onChange={(e) => handleExpiryChange(e.target.value, 'downloadExpiryDays')}>
                                                    {isEditing && <option value="__keep__">{getKeepLabel('downloadExpiryDays')}</option>}
                                                    {expiryOptions.filter(o => o.value !== '__keep__').map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                                                </select>
                                            </div>
                                        </FormControl>
                                        {isEditing && editProject?.downloadExpiresAt && remainingDownloadDays !== null && (<p className="text-xs text-muted-foreground mt-1">⏳ {t('remainingTime')}: {remainingDownloadDays} {t('days')}</p>)}
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </div>
                    </motion.div>
                    <motion.div
                        ref={extraSectionRef}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.38 }}
                        className={cn(
                            "rounded-xl border p-4 space-y-4 transition-all duration-500",
                            extraEnabled ? extraTone.active : extraTone.idle,
                            highlightedSection === 'extra' && extraTone.highlight
                        )}
                    >
                        <FormField
                            control={form.control}
                            name="extraEnabled"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start justify-between gap-4">
                                    <div className="space-y-1">
                                        <FormLabel className={cn("text-base font-semibold", extraTone.title)}>📷 {t('extraPhotoSectionTitle')}</FormLabel>
                                        <p className="text-xs text-muted-foreground">{t('extraPhotoSectionHint')}</p>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} className="mt-1 cursor-pointer" />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        {extraEnabled ? (
                            <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4", extraTone.divider)}>
                                <FormField control={form.control} name="extraMaxPhotos" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>➕ {t('extraPhotosCount')}</FormLabel>
                                        <FormControl><Input type="number" min="1" placeholder="5" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="extraExpiryDays" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>⏰ {t('extraDurationLabel')}</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                {customExtraExpiryLabel && (
                                                    <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer" onClick={() => { setCustomExpiryTarget('extraExpiryDays'); setCustomMonths(''); setCustomDays(''); setShowCustomExpiryDialog(true) }}>
                                                        <span>✏️ {customExtraExpiryLabel}</span>
                                                        <button type="button" className="text-muted-foreground hover:text-foreground ml-2" onClick={(e) => { e.stopPropagation(); form.setValue('extraExpiryDays', ''); setCustomExtraExpiryLabel(null) }}>✕</button>
                                                    </div>
                                                )}
                                                <select className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer ${customExtraExpiryLabel ? 'hidden' : ''}`} value={customExtraExpiryLabel ? 'custom' : field.value} onChange={(e) => handleExpiryChange(e.target.value, 'extraExpiryDays')}>
                                                    {isEditing && <option value="__keep__">{getKeepLabel('extraExpiryDays')}</option>}
                                                    {expiryOptions.filter(o => o.value !== '__keep__').map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                                                </select>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <div className="sm:col-span-2">
                                    <FormField control={form.control} name="lockedPhotos" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>🔒 {t('lockedPhotosLabel')}</FormLabel>
                                            <FormControl>
                                                <textarea
                                                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none"
                                                    placeholder={t('previouslySelectedHint')}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormDescription>{t('lockedPhotosHint')}</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </div>
                        ) : (
                            <p className={cn("rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground", extraTone.helper)}>
                                {t('extraPhotoSectionHelper')}
                            </p>
                        )}
                    </motion.div>
                    <motion.div
                        ref={printSectionRef}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className={cn(
                            "rounded-xl border p-4 space-y-4 transition-all duration-500",
                            printEnabled ? printTone.active : printTone.idle,
                            highlightedSection === 'print' && printTone.highlight
                        )}
                    >
                        <FormField
                            control={form.control}
                            name="printEnabled"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start justify-between gap-4">
                                    <div className="space-y-1">
                                        <FormLabel className={cn("text-base font-semibold", printTone.title)}>🖨️ {t('printPhotoSectionTitle')}</FormLabel>
                                        <p className="text-xs text-muted-foreground">
                                            {globalPrintEnabled ? t('printPhotoSectionHint') : t('printFeatureDisabledGlobal')}
                                        </p>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} className="mt-1 cursor-pointer" disabled={!globalPrintEnabled} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        {printEnabled && globalPrintEnabled ? (
                            <div className={cn("space-y-4 border-t pt-4", printTone.divider)}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormItem>
                                        <FormLabel>🖨️ {t('printTemplate')}</FormLabel>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                                            value={selectedPrintTemplateIdx === 'custom' ? 'custom' : selectedPrintTemplateIdx.toString()}
                                            onChange={(e) => handlePrintTemplateChange(e.target.value)}
                                        >
                                            {printTemplates.length > 0 && <option value="-1" disabled>— {t('printTemplate')} —</option>}
                                            {printTemplates.map((template, idx) => (
                                                <option key={`${template.name}-${idx}`} value={idx.toString()}>
                                                    {template.name || t('printTemplateName')} ({template.sizes.map((size) => `${size.name}×${size.quota}`).join(', ')})
                                                </option>
                                            ))}
                                            <option value="custom">{t('printTemplateCustom')}</option>
                                        </select>
                                    </FormItem>
                                    <FormField control={form.control} name="printExpiryDays" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>⏰ {t('printDurationLabel')}</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    {customPrintExpiryLabel && (
                                                        <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer" onClick={() => { setCustomExpiryTarget('printExpiryDays'); setCustomMonths(''); setCustomDays(''); setShowCustomExpiryDialog(true) }}>
                                                            <span>✏️ {customPrintExpiryLabel}</span>
                                                            <button type="button" className="text-muted-foreground hover:text-foreground ml-2" onClick={(e) => { e.stopPropagation(); form.setValue('printExpiryDays', ''); setCustomPrintExpiryLabel(null) }}>✕</button>
                                                        </div>
                                                    )}
                                                    <select className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer ${customPrintExpiryLabel ? 'hidden' : ''}`} value={customPrintExpiryLabel ? 'custom' : field.value} onChange={(e) => handleExpiryChange(e.target.value, 'printExpiryDays')}>
                                                        {isEditing && <option value="__keep__">{getKeepLabel('printExpiryDays')}</option>}
                                                        {expiryOptions.filter(o => o.value !== '__keep__').map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                                                    </select>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                {selectedPrintTemplateIdx === 'custom' ? (
                                    <FormField control={form.control} name="printSizes" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>🖨️ {t('printSizes')}</FormLabel>
                                            <FormControl><Input placeholder="4R:2, 5R:3" {...field} /></FormControl>
                                            <p className="text-xs text-muted-foreground">{t('printSizesHint')}</p>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                ) : printSizesValue ? (
                                    <div className="rounded-lg border bg-background/70 p-3">
                                        <p className="text-xs font-medium text-muted-foreground mb-1">🖨️ {t('printSizes')}</p>
                                        <p className="text-sm font-medium">{formatPrintSizesSummary(printSizesValue)}</p>
                                        {selectedPrintTemplateName && (
                                            <p className="mt-2 text-xs text-muted-foreground">
                                                {t('printSizesFromTemplateHint', { name: selectedPrintTemplateName })}
                                            </p>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        ) : (
                            <p className={cn("rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground", printTone.helper)}>
                                {globalPrintEnabled ? t('printPhotoSectionHelper') : t('printFeatureDisabledGlobal')}
                            </p>
                        )}
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.42 }} className="rounded-xl border p-4 space-y-3">
                        <div>
                            <p className="text-sm font-semibold">🔐 {t('password')}</p>
                            <p className="text-xs text-muted-foreground">{t('passwordHint')}</p>
                        </div>
                        <FormField control={form.control} name="password" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="sr-only">🔐 {t('password')}</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input type={showPassword ? "text" : "password"} placeholder={t('passwordPlaceholder')} autoComplete="new-password" {...field} />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </motion.div>


                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-lg bg-destructive/15 border border-destructive/30"
                        >
                            <p className="text-destructive text-sm font-medium mb-2">
                                ⚠️ {error}
                            </p>
                            {upgradeRequired && (
                                <Button size="sm" className="cursor-pointer" asChild>
                                    <a href={`/${window.location.pathname.split('/')[1]}/pricing`}>
                                        🚀 Upgrade ke Pro
                                    </a>
                                </Button>
                            )}
                        </motion.div>
                    )}

                    <Button type="submit" className="w-full cursor-pointer" disabled={!!generatedLink || !isFormValid || isSubmitting}>
                        {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEditing ? "Saving..." : "Generating..."}</>) : (isEditing ? `💾 ${t('saveChanges')}` : `✨ ${t('generate')}`)}
                    </Button>
                </form>
            </Form>

            <AnimatePresence>
                {generatedLink && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-8">
                        <Card className="bg-muted/50 border-primary/20">
                            <CardContent className="pt-6 space-y-4">
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-center">🎉 {t('linkCreated')}</h3>
                                    <Input value={generatedLink} readOnly className="bg-background text-sm text-center" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Action Buttons */}
                        <div className="mt-4 space-y-2">
                            {/* 1. WhatsApp to Client & Copy Template - Side by side */}
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button onClick={sendToClient} className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2 cursor-pointer">
                                    <MessageCircle className="h-4 w-4" />
                                    {t('sendToClient')}
                                </Button>
                                <Button variant="outline" className="flex-1 gap-2 cursor-pointer" onClick={copyTemplate}>
                                    {copiedTemplate ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    {copiedTemplate ? t('templateCopied') : t('copyTemplate')}
                                </Button>
                            </div>

                            {/* 2. Open Link & Copy Link - Side by side on desktop, stacked on mobile */}
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button variant="outline" className="flex-1 gap-2 cursor-pointer" onClick={() => window.open(generatedLink, '_blank')}>
                                    <ExternalLink className="h-4 w-4" /> {t('openLink')}
                                </Button>
                                <Button variant="outline" className="flex-1 gap-2 cursor-pointer" onClick={copyToClipboard}>
                                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    {copied ? t('copied') : t('copyLink')}
                                </Button>
                            </div>

                            {/* 3. Create New & Back to List - Side by side on desktop, stacked on mobile */}
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button variant="outline" className="flex-1 gap-2 cursor-pointer" onClick={createNewProject}>
                                    ✨ {t('createNew')}
                                </Button>
                                {onBack && (
                                    <Button variant="outline" className="flex-1 gap-2 cursor-pointer" onClick={onBack}>
                                        <ArrowLeft className="h-4 w-4" />
                                        {t('backToProjects')}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Custom Duration Popup Dialog */}
            {showCustomExpiryDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-background rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
                        <h3 className="text-lg font-semibold">✏️ {t('customDuration')}</h3>
                        <div className="flex gap-3">
                            <div className="flex-1 space-y-1">
                                <label className="text-sm font-medium">🗓️ {t('customMonthsLabel')}</label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={customMonths}
                                    onChange={(e) => setCustomMonths(e.target.value)}
                                    placeholder="0"
                                    autoFocus
                                />
                            </div>
                            <div className="flex-1 space-y-1">
                                <label className="text-sm font-medium">📅 {t('customDaysLabel')}</label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={customDays}
                                    onChange={(e) => setCustomDays(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" className="flex-1 cursor-pointer" onClick={() => setShowCustomExpiryDialog(false)}>{t('cancel')}</Button>
                            <Button type="button" className="flex-1 cursor-pointer" onClick={confirmCustomExpiry} disabled={(parseInt(customMonths) || 0) <= 0 && (parseInt(customDays) || 0) <= 0}>✓ OK</Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    )
}
