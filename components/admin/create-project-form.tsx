"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useTranslations } from "next-intl"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Copy, ArrowRight, Check, ArrowLeft, MessageCircle, Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { PhoneInput } from "@/components/ui/phone-input"
import { useProjectStore, generateShortId, type Project } from "@/lib/project-store"

// Define explicit form values type
type FormValues = {
    clientName: string
    gdriveLink: string
    clientWhatsapp: string
    adminWhatsapp: string
    countryCode: string
    maxPhotos: string // Keep as string to avoid undefined issues
    password: string
    detectSubfolders: boolean
    expiryDays: string
}

const formSchema = z.object({
    clientName: z.string().min(2, {
        message: "Nama klien minimal 2 karakter.",
    }),
    gdriveLink: z.string().url({
        message: "Masukkan URL yang valid.",
    }),
    clientWhatsapp: z.string().min(10, {
        message: "Masukkan nomor WhatsApp yang valid.",
    }),
    adminWhatsapp: z.string().min(10, {
        message: "Masukkan nomor WhatsApp admin yang valid.",
    }),
    countryCode: z.string(),
    maxPhotos: z.string().min(1, {
        message: "Masukkan jumlah foto.",
    }),
    password: z.string(),
    detectSubfolders: z.boolean(),
    expiryDays: z.string(),
})

interface CreateProjectFormProps {
    onBack?: () => void
    onProjectCreated?: (project: Project) => void
    editProject?: Project | null
    onEditComplete?: () => void
}

export function CreateProjectForm({ onBack, onProjectCreated, editProject, onEditComplete }: CreateProjectFormProps) {
    const t = useTranslations('Admin')
    const tc = useTranslations('Client')
    const [generatedLink, setGeneratedLink] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [currentProject, setCurrentProject] = useState<Project | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const { addProject, updateProject } = useProjectStore()

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
            expiryDays: "",
        },
    })

    // Watch form values to determine if form is valid
    const clientName = form.watch("clientName")
    const gdriveLink = form.watch("gdriveLink")
    const clientWhatsapp = form.watch("clientWhatsapp")
    const adminWhatsapp = form.watch("adminWhatsapp")
    const maxPhotos = form.watch("maxPhotos")

    const isFormValid = clientName.length >= 2 &&
        gdriveLink.length > 0 &&
        clientWhatsapp.length >= 10 &&
        adminWhatsapp.length >= 10 &&
        maxPhotos.length > 0 &&
        parseInt(maxPhotos) > 0

    // Calculate remaining days on client-side only to avoid hydration mismatch
    const [remainingDays, setRemainingDays] = useState<number | null>(null)

    useEffect(() => {
        if (editProject?.expiresAt) {
            setRemainingDays(Math.max(0, Math.ceil((editProject.expiresAt - Date.now()) / (24 * 60 * 60 * 1000))))
        }
    }, [editProject?.expiresAt])

    function onSubmit(values: FormValues) {
        const maxPhotosNum = parseInt(values.maxPhotos) || 1
        const expiryDaysNum = values.expiryDays ? parseInt(values.expiryDays) : undefined

        // Create project data for URL encoding
        const projectData = {
            clientName: values.clientName,
            gdriveLink: values.gdriveLink,
            whatsapp: values.adminWhatsapp, // Admin WhatsApp for receiving selections
            maxPhotos: maxPhotosNum,
            password: values.password,
            detectSubfolders: values.detectSubfolders,
        }

        const json = JSON.stringify(projectData)
        const encodedData = btoa(unescape(encodeURIComponent(json)))

        // Construct link with locale
        const origin = window.location.origin
        const pathParts = window.location.pathname.split('/')
        const locale = pathParts[1] || 'id'
        const link = `${origin}/${locale}/client/${encodeURIComponent(encodedData)}`

        if (isEditing && editProject) {
            // Update existing project
            const updatedProject: Project = {
                ...editProject,
                clientName: values.clientName,
                gdriveLink: values.gdriveLink,
                clientWhatsapp: values.clientWhatsapp,
                adminWhatsapp: values.adminWhatsapp,
                countryCode: values.countryCode,
                maxPhotos: maxPhotosNum,
                password: values.password,
                detectSubfolders: values.detectSubfolders,
                // Update expiresAt if new duration is selected
                expiresAt: expiryDaysNum
                    ? Date.now() + (expiryDaysNum * 24 * 60 * 60 * 1000)
                    : editProject.expiresAt, // Keep existing if not changed
                link,
            }
            updateProject(editProject.id, updatedProject)
            onEditComplete?.()
        } else {
            // Create new project
            const id = generateShortId()
            const project: Project = {
                id,
                clientName: values.clientName,
                gdriveLink: values.gdriveLink,
                clientWhatsapp: values.clientWhatsapp,
                adminWhatsapp: values.adminWhatsapp,
                countryCode: values.countryCode,
                maxPhotos: maxPhotosNum,
                password: values.password,
                detectSubfolders: values.detectSubfolders,
                expiresAt: expiryDaysNum
                    ? Date.now() + (expiryDaysNum * 24 * 60 * 60 * 1000)
                    : undefined,
                createdAt: Date.now(),
                link,
            }
            addProject(project)
            setCurrentProject(project)
            onProjectCreated?.(project)
            setGeneratedLink(link)

            // Preload photos to cache after 2-second delay (avoids rate limiting)
            import('@/lib/cache').then(({ preloadProjectPhotos }) => {
                preloadProjectPhotos(values.gdriveLink, values.detectSubfolders, 2000)
            })
        }
    }

    const copyToClipboard = () => {
        if (!generatedLink) return

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(generatedLink)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } else {
            // Fallback for non-secure context (local network)
            const textArea = document.createElement("textarea")
            textArea.value = generatedLink
            textArea.style.position = "fixed"
            textArea.style.left = "-9999px"
            document.body.appendChild(textArea)
            textArea.focus()
            textArea.select()
            try {
                document.execCommand('copy')
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
            } catch (err) {
                console.error('Failed to copy', err)
            }
            document.body.removeChild(textArea)
        }
    }

    const sendToClient = () => {
        if (generatedLink && currentProject) {
            const message = tc('waClientMessage', {
                name: currentProject.clientName,
                link: generatedLink,
                max: currentProject.maxPhotos.toString()
            })
            window.open(`https://wa.me/${currentProject.clientWhatsapp}?text=${encodeURIComponent(message)}`, '_blank')
        }
    }

    const createNewProject = () => {
        setGeneratedLink(null)
        setCurrentProject(null)
        form.reset({
            clientName: "",
            gdriveLink: "",
            clientWhatsapp: "",
            adminWhatsapp: "",
            countryCode: "ID",
            maxPhotos: "",
            password: "",
            detectSubfolders: false,
            expiryDays: "",
        })
    }

    const expiryOptions = [
        { value: "", label: `♾️ ${t('forever')}` },
        { value: "1", label: `1 ${t('days')}` },
        { value: "3", label: `3 ${t('days')}` },
        { value: "7", label: `7 ${t('days')}` },
        { value: "14", label: `14 ${t('days')}` },
        { value: "30", label: `30 ${t('days')}` },
    ]

    return (
        <div className="w-full max-w-lg mx-auto">
            {onBack && (
                <Button variant="ghost" onClick={onBack} className="mb-4 gap-2 cursor-pointer">
                    <ArrowLeft className="h-4 w-4" />
                    {t('backToList')}
                </Button>
            )}

            <h2 className="text-xl font-semibold mb-4">
                {isEditing ? `✏️ ${t('editProject')}` : t('createNew')}
            </h2>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <FormField
                            control={form.control}
                            name="clientName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>👤 {t('clientName')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder="John Doe" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                        <FormField
                            control={form.control}
                            name="gdriveLink"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>📁 {t('gdriveLink')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://drive.google.com/drive/folders/..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
                        <FormField
                            control={form.control}
                            name="clientWhatsapp"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>📱 {t('waClientLabel')}</FormLabel>
                                    <FormControl>
                                        <PhoneInput
                                            value={field.value}
                                            onChange={(fullNumber, countryCode) => {
                                                field.onChange(fullNumber)
                                                form.setValue('countryCode', countryCode)
                                            }}
                                            placeholder="812xxxxxxxx"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                        <FormField
                            control={form.control}
                            name="adminWhatsapp"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>📲 {t('waAdminLabel')}</FormLabel>
                                    <FormControl>
                                        <PhoneInput
                                            value={field.value}
                                            onChange={(fullNumber) => {
                                                field.onChange(fullNumber)
                                            }}
                                            placeholder="812xxxxxxxx"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </motion.div>

                    <div className="grid grid-cols-2 gap-4">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
                            <FormField
                                control={form.control}
                                name="maxPhotos"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>📸 {t('maxPhotos')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min="1"
                                                placeholder="5"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
                            <FormField
                                control={form.control}
                                name="expiryDays"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>⏰ {t('linkDuration')}</FormLabel>
                                        <FormControl>
                                            <select
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                                                value={field.value}
                                                onChange={field.onChange}
                                            >
                                                {expiryOptions.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </FormControl>
                                        {isEditing && editProject?.expiresAt && remainingDays !== null && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                ⏳ {t('remainingTime')}: {remainingDays} {t('days')}
                                            </p>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </motion.div>
                    </div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>🔐 {t('password')}</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder={t('passwordPlaceholder')}
                                                {...field}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
                        <FormField
                            control={form.control}
                            name="detectSubfolders"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">
                                            📂 {t('detectSubfolders')}
                                        </FormLabel>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            className="cursor-pointer"
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </motion.div>

                    <Button
                        type="submit"
                        className="w-full cursor-pointer"
                        disabled={!!generatedLink || !isFormValid}
                    >
                        {isEditing ? `💾 ${t('saveChanges')}` : `✨ ${t('generate')}`}
                    </Button>
                </form>
            </Form>

            <AnimatePresence>
                {generatedLink && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-8"
                    >
                        <Card className="bg-muted/50 border-primary/20">
                            <CardContent className="pt-6 space-y-4">
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-center">🎉 {t('linkCreated')}</h3>
                                    <div className="flex items-center gap-2">
                                        <Input value={generatedLink} readOnly className="bg-background text-sm" />
                                        <Button size="icon" variant="outline" onClick={copyToClipboard} className="cursor-pointer">
                                            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                                <Button onClick={sendToClient} className="w-full bg-green-600 hover:bg-green-700 text-white gap-2 cursor-pointer">
                                    {/* Removed emoji 📲 here */}
                                    <MessageCircle className="h-4 w-4" />
                                    {t('sendToClient')}
                                </Button>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Button variant="outline" className="flex-1 cursor-pointer" onClick={() => window.open(generatedLink, '_blank')}>
                                        🔗 {t('openLink')} <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                    <Button variant="secondary" className="flex-1 cursor-pointer" onClick={createNewProject}>
                                        {t('createNew')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
