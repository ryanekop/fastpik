"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useTranslations } from "next-intl"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Copy, ArrowRight, Check, ArrowLeft, MessageCircle, Eye, EyeOff, Loader2, ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { PhoneInput } from "@/components/ui/phone-input"
import { generateShortId, type Project } from "@/lib/project-store"
import { createClient } from "@/lib/supabase/client"

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
    lockedPhotos: string
}

const formSchema = z.object({
    clientName: z.string().min(2, { message: "Nama klien minimal 2 karakter." }),
    gdriveLink: z.string().url({ message: "Masukkan URL yang valid." }),
    clientWhatsapp: z.string().min(10, { message: "Masukkan nomor WhatsApp yang valid." }),
    adminWhatsapp: z.string().min(10, { message: "Masukkan nomor WhatsApp admin yang valid." }),
    countryCode: z.string(),
    maxPhotos: z.string().min(1, { message: "Masukkan jumlah foto." }),
    password: z.string(),
    detectSubfolders: z.boolean(),
    expiryDays: z.string(),
    downloadExpiryDays: z.string(),
    lockedPhotos: z.string(),
})

interface CreateProjectFormProps {
    onBack?: () => void
    onProjectCreated?: (project: Project) => void
    editProject?: Project | null
    onEditComplete?: () => void
    currentFolderId?: string | null
}

export function CreateProjectForm({ onBack, onProjectCreated, editProject, onEditComplete, currentFolderId }: CreateProjectFormProps) {
    const t = useTranslations('Admin')
    const tc = useTranslations('Client')
    const supabase = createClient()
    const [generatedLink, setGeneratedLink] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [copiedTemplate, setCopiedTemplate] = useState(false)
    const [currentProject, setCurrentProject] = useState<Project | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [vendorSlug, setVendorSlug] = useState<string | null>(null)

    // Custom duration dialog states
    const [showCustomExpiryDialog, setShowCustomExpiryDialog] = useState(false)
    const [customExpiryTarget, setCustomExpiryTarget] = useState<'expiryDays' | 'downloadExpiryDays'>('expiryDays')
    const [customMonths, setCustomMonths] = useState("")
    const [customDays, setCustomDays] = useState("")
    const [customExpiryLabel, setCustomExpiryLabel] = useState<string | null>(null)
    const [customDownloadExpiryLabel, setCustomDownloadExpiryLabel] = useState<string | null>(null)

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
            lockedPhotos: editProject?.lockedPhotos?.join("\n") || "",
        },
    })

    // Load default admin WhatsApp from settings for new projects
    useEffect(() => {
        if (!isEditing) {
            loadDefaultSettings()
        }
    }, [isEditing])

    const loadDefaultSettings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase
                .from('settings')
                .select('default_admin_whatsapp, vendor_name')
                .eq('user_id', user.id)
                .maybeSingle()

            if (data?.default_admin_whatsapp) {
                form.setValue('adminWhatsapp', data.default_admin_whatsapp)
            }
            if (data?.vendor_name) {
                const slug = data.vendor_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                setVendorSlug(slug)
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

    const isFormValid = clientName.length >= 2 && gdriveLink.length > 0 && clientWhatsapp.length >= 10 && adminWhatsapp.length >= 10 && maxPhotos.length > 0 && parseInt(maxPhotos) > 0

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

    async function onSubmit(values: FormValues) {
        setIsSubmitting(true)
        setError(null)
        setUpgradeRequired(false)
        try {
            const maxPhotosNum = parseInt(values.maxPhotos) || 1
            const lockedPhotosArray = values.lockedPhotos.split('\n').map(l => l.trim()).filter(l => l.length > 0)

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
                lockedPhotos: lockedPhotosArray.length > 0 ? lockedPhotosArray : undefined,
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

            if (isEditing && editProject) {
                const res = await fetch(`/api/projects/${editProject.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(projectPayload) })
                if (!res.ok) throw new Error("Failed to update project")
                onEditComplete?.()
            } else {
                const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(projectPayload) })
                if (!res.ok) {
                    const errorData = await res.json()
                    if (res.status === 403 && errorData.upgradeRequired) {
                        setError(errorData.message)
                        setUpgradeRequired(true)
                        return
                    }
                    throw new Error(errorData.message || "Failed to create project")
                }
                const savedProject = await res.json()
                setCurrentProject(savedProject)
                onProjectCreated?.(savedProject)
                setGeneratedLink(link)
                import('@/lib/cache').then(({ preloadProjectPhotos }) => { preloadProjectPhotos(values.gdriveLink, values.detectSubfolders, 2000) })
            }
        } catch (error: any) {
            console.error(error)
            setError(error.message || 'Terjadi kesalahan')
        } finally {
            setIsSubmitting(false)
        }
    }

    const copyToClipboard = () => {
        if (!generatedLink) return
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(generatedLink)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } else {
            const textArea = document.createElement("textarea")
            textArea.value = generatedLink
            textArea.style.position = "fixed"
            textArea.style.left = "-9999px"
            document.body.appendChild(textArea)
            textArea.focus()
            textArea.select()
            try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch (err) { console.error('Failed to copy', err) }
            document.body.removeChild(textArea)
        }
    }

    const buildClientMessage = () => {
        if (!generatedLink || !currentProject) return ''
        let message = tc('waClientMessage', { name: currentProject.clientName, link: generatedLink, max: currentProject.maxPhotos.toString() })

        if (currentProject.password) {
            message += `\n\n🔐 Password: ${currentProject.password}`
        }
        if (currentProject.expiresAt) {
            const diff = currentProject.expiresAt - Date.now()
            if (diff > 0) {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24))
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                const durationText = days > 0 ? `${days} ${t('days')}` : hours > 0 ? `${hours} ${t('hours')}` : t('lessThanHour')
                message += `\n⏰ ${t('selectionValidFor')}: ${durationText}`
            }
        }
        if (currentProject.downloadExpiresAt) {
            const diff = currentProject.downloadExpiresAt - Date.now()
            if (diff > 0) {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24))
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                const durationText = days > 0 ? `${days} ${t('days')}` : hours > 0 ? `${hours} ${t('hours')}` : t('lessThanHour')
                message += `\n📥 ${t('downloadValidFor')}: ${durationText}`
            }
        }
        return message
    }

    const sendToClient = () => {
        if (generatedLink && currentProject) {
            const message = buildClientMessage()
            window.open(`https://wa.me/${currentProject.clientWhatsapp}?text=${encodeURIComponent(message)}`, '_blank')
        }
    }

    const copyTemplate = () => {
        if (generatedLink && currentProject) {
            const message = buildClientMessage()
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(message)
                setCopiedTemplate(true)
                setTimeout(() => setCopiedTemplate(false), 2000)
            } else {
                const textArea = document.createElement("textarea")
                textArea.value = message
                textArea.style.position = "fixed"
                textArea.style.left = "-9999px"
                document.body.appendChild(textArea)
                textArea.focus()
                textArea.select()
                try { document.execCommand('copy'); setCopiedTemplate(true); setTimeout(() => setCopiedTemplate(false), 2000) } catch (err) { console.error('Failed to copy', err) }
                document.body.removeChild(textArea)
            }
        }
    }

    const createNewProject = () => {
        setGeneratedLink(null)
        setCurrentProject(null)
        form.reset({ clientName: "", gdriveLink: "", clientWhatsapp: "", adminWhatsapp: "", countryCode: "ID", maxPhotos: "", password: "", detectSubfolders: false, expiryDays: "", downloadExpiryDays: "", lockedPhotos: "" })
        // Re-fetch settings so vendor slug and admin WA are fresh from DB
        loadDefaultSettings()
    }

    const getKeepLabel = (fieldName: 'expiryDays' | 'downloadExpiryDays') => {
        if (fieldName === 'expiryDays') {
            if (!editProject?.expiresAt) return `⏸️ — ${t('forever')} —`
            const days = Math.max(0, Math.ceil((editProject.expiresAt - Date.now()) / (24 * 60 * 60 * 1000)))
            return `⏸️ — ${days} ${t('days')} —`
        } else {
            if (!editProject?.downloadExpiresAt) return `⏸️ — ${t('forever')} —`
            const days = Math.max(0, Math.ceil((editProject.downloadExpiresAt - Date.now()) / (24 * 60 * 60 * 1000)))
            return `⏸️ — ${days} ${t('days')} —`
        }
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

    const handleExpiryChange = (value: string, fieldName: 'expiryDays' | 'downloadExpiryDays') => {
        if (value === 'custom') {
            setCustomExpiryTarget(fieldName)
            setCustomMonths("")
            setCustomDays("")
            setShowCustomExpiryDialog(true)
        } else {
            form.setValue(fieldName, value)
            if (fieldName === 'expiryDays') setCustomExpiryLabel(null)
            else setCustomDownloadExpiryLabel(null)
        }
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
        if (customExpiryTarget === 'expiryDays') setCustomExpiryLabel(label)
        else setCustomDownloadExpiryLabel(label)
        setShowCustomExpiryDialog(false)
    }

    return (
        <div className="w-full">
            {onBack && (<Button variant="ghost" onClick={onBack} className="mb-4 gap-2 cursor-pointer"><ArrowLeft className="h-4 w-4" />{t('backToList')}</Button>)}
            <h2 className="text-xl font-semibold mb-4">{isEditing ? `✏️ ${t('editProject')}` : t('createNew')}</h2>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <FormField control={form.control} name="clientName" render={({ field }) => (<FormItem><FormLabel>👤 {t('clientName')}</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                        <FormField control={form.control} name="gdriveLink" render={({ field }) => (<FormItem><FormLabel>📁 {t('gdriveLink')}</FormLabel><FormControl><Input placeholder="https://drive.google.com/drive/folders/..." {...field} /></FormControl><FormMessage /></FormItem>)} />
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
                        <FormField control={form.control} name="maxPhotos" render={({ field }) => (<FormItem><FormLabel>📸 {t('maxPhotos')}</FormLabel><FormControl><Input type="number" min="1" placeholder="5" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </motion.div>
                    <div className="grid grid-cols-2 gap-4">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.33 }}>
                            <FormField control={form.control} name="expiryDays" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>⏰ {t('selectionDuration')}</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            {customExpiryLabel && (
                                                <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer" onClick={() => { setCustomExpiryTarget('expiryDays'); setCustomMonths(''); setCustomDays(''); setShowCustomExpiryDialog(true) }}>
                                                    <span>✏️ {customExpiryLabel}</span>
                                                    <button type="button" className="text-muted-foreground hover:text-foreground ml-2" onClick={(e) => { e.stopPropagation(); form.setValue('expiryDays', ''); setCustomExpiryLabel(null) }}>✕</button>
                                                </div>
                                            )}
                                            <select className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer ${customExpiryLabel ? 'hidden' : ''}`} value={customExpiryLabel ? 'custom' : field.value} onChange={(e) => handleExpiryChange(e.target.value, 'expiryDays')}>
                                                {isEditing && <option value="__keep__">{getKeepLabel('expiryDays')}</option>}
                                                {expiryOptions.filter(o => o.value !== '__keep__').map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                                            </select>
                                        </div>
                                    </FormControl>
                                    {isEditing && editProject?.expiresAt && remainingDays !== null && (<p className="text-xs text-muted-foreground mt-1">⏳ {t('remainingTime')}: {remainingDays} {t('days')}</p>)}
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }}>
                            <FormField control={form.control} name="downloadExpiryDays" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>📥 {t('downloadDuration')}</FormLabel>
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
                        </motion.div>
                    </div>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
                        <FormField control={form.control} name="password" render={({ field }) => (
                            <FormItem>
                                <FormLabel>🔐 {t('password')}</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input type={showPassword ? "text" : "password"} placeholder={t('passwordPlaceholder')} {...field} />
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
