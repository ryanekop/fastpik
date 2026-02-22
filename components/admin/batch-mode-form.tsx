"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations, useLocale } from "next-intl"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
    ArrowLeft, Plus, Trash2, Check, AlertCircle, Loader2, Rows3, Settings2
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
    Form, FormControl, FormField, FormItem, FormMessage,
} from "@/components/ui/form"
import { generateShortId, type Project } from "@/lib/project-store"
import { createClient } from "@/lib/supabase/client"

interface BatchModeFormProps {
    onBack: () => void
    onProjectsCreated: (projects: Project[]) => void
    currentFolderId?: string | null
}

const projectSchema = z.object({
    clientName: z.string().min(1, "Required"),
    gdriveLink: z.string().url("Invalid URL").min(1, "Required"),
    clientWhatsapp: z.string().optional(),
    adminWhatsapp: z.string().optional(),
    password: z.string().optional(),
    maxPhotos: z.string().min(1),
    expiryDays: z.string().min(1),
    downloadExpiryDays: z.string().min(1),
    detectSubfolders: z.boolean().default(false),
})

const batchSchema = z.object({
    projects: z.array(projectSchema).min(1, "Add at least one project")
})

type BatchFormValues = z.infer<typeof batchSchema>

export function BatchModeForm({ onBack, onProjectsCreated, currentFolderId }: BatchModeFormProps) {
    const t = useTranslations('Admin')
    const locale = useLocale()
    const supabase = createClient()

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [globalError, setGlobalError] = useState<string | null>(null)
    const [upgradeRequired, setUpgradeRequired] = useState(false)
    const [showAdvanced, setShowAdvanced] = useState(false)

    const [defaults, setDefaults] = useState({
        defaultMaxPhotos: 10,
        defaultExpiryDays: 0,
        defaultDownloadExpiryDays: 0,
        defaultDetectSubfolders: false,
        defaultAdminWhatsapp: '',
        defaultCountryCode: 'ID',
        defaultPassword: '',
        vendorSlug: null as string | null,
    })

    const form = useForm<BatchFormValues>({
        resolver: zodResolver(batchSchema) as any,
        defaultValues: {
            projects: []
        },
    })

    const { fields, append, remove } = useFieldArray({
        name: "projects",
        control: form.control,
    })

    useEffect(() => {
        loadDefaults()
    }, [])

    const loadDefaults = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase
                .from('settings')
                .select('default_admin_whatsapp, vendor_name, default_max_photos, default_expiry_days, default_download_expiry_days, default_country_code, default_password')
                .eq('user_id', user.id)
                .maybeSingle()

            if (data) {
                const settings = {
                    defaultMaxPhotos: data.default_max_photos || 10,
                    defaultExpiryDays: data.default_expiry_days || 0,
                    defaultDownloadExpiryDays: data.default_download_expiry_days || 0,
                    defaultDetectSubfolders: false,
                    defaultAdminWhatsapp: data.default_admin_whatsapp || '',
                    defaultCountryCode: data.default_country_code || 'ID',
                    defaultPassword: data.default_password || '',
                    vendorSlug: data.vendor_name
                        ? data.vendor_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                        : null,
                }
                setDefaults(settings)

                // Add initial empty row using defaults if list is empty
                if (fields.length === 0) {
                    appendRow(settings)
                }
            } else if (fields.length === 0) {
                appendRow(defaults)
            }
        } catch (err) {
            if (fields.length === 0) appendRow(defaults)
        }
    }

    const appendRow = (settings: typeof defaults) => {
        append({
            clientName: "",
            gdriveLink: "",
            clientWhatsapp: "",
            adminWhatsapp: settings.defaultAdminWhatsapp || "",
            password: settings.defaultPassword || "",
            maxPhotos: settings.defaultMaxPhotos.toString(),
            expiryDays: settings.defaultExpiryDays.toString(),
            downloadExpiryDays: settings.defaultDownloadExpiryDays.toString(),
            detectSubfolders: settings.defaultDetectSubfolders,
        })
    }

    const handleAddRow = () => {
        appendRow(defaults)
    }

    const onSubmit = async (data: BatchFormValues) => {
        setIsSubmitting(true)
        setGlobalError(null)
        setUpgradeRequired(false)

        try {
            const origin = window.location.origin
            const pathParts = window.location.pathname.split('/')
            const loc = pathParts[1] || 'id'

            const payload: Project[] = data.projects.map(row => {
                const projectId = generateShortId()
                const link = defaults.vendorSlug
                    ? `${origin}/${loc}/client/${defaults.vendorSlug}/${projectId}`
                    : `${origin}/${loc}/client/${projectId}`

                const maxPhotos = parseInt(row.maxPhotos) || 0
                const expiryDays = parseInt(row.expiryDays) || 0
                const downloadExpiryDays = parseInt(row.downloadExpiryDays) || 0

                return {
                    id: projectId,
                    clientName: row.clientName,
                    gdriveLink: row.gdriveLink,
                    clientWhatsapp: row.clientWhatsapp || '',
                    adminWhatsapp: row.adminWhatsapp || defaults.defaultAdminWhatsapp,
                    countryCode: defaults.defaultCountryCode,
                    maxPhotos,
                    password: row.password || undefined,
                    detectSubfolders: row.detectSubfolders,
                    expiresAt: expiryDays > 0 ? Date.now() + (expiryDays * 24 * 60 * 60 * 1000) : undefined,
                    downloadExpiresAt: downloadExpiryDays > 0 ? Date.now() + (downloadExpiryDays * 24 * 60 * 60 * 1000) : undefined,
                    createdAt: Date.now(),
                    link,
                    folderId: currentFolderId || null,
                }
            })

            const res = await fetch('/api/projects/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projects: payload }),
            })

            if (!res.ok) {
                const errData = await res.json()
                if (res.status === 403 && errData.upgradeRequired) {
                    setGlobalError(errData.message)
                    setUpgradeRequired(true)
                    return
                }
                throw new Error(errData.message || 'Failed to create projects')
            }

            const result = await res.json()
            onProjectsCreated(result.projects)
        } catch (err: any) {
            setGlobalError(err.message || 'Terjadi kesalahan')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="w-full">
            <Button variant="ghost" onClick={onBack} className="mb-4 gap-2 cursor-pointer">
                <ArrowLeft className="h-4 w-4" />{t('backToList')}
            </Button>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Rows3 className="h-5 w-5 text-primary" />
                        {t('batchMode')}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('batchModeDesc')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowAdvanced(!showAdvanced)} className="cursor-pointer gap-2">
                        <Settings2 className="h-4 w-4" />
                        {showAdvanced ? 'Sembunyikan Opsi Lanjutan' : 'Tampilkan Opsi Lanjutan'}
                    </Button>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="border rounded-xl shadow-sm bg-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 border-b">
                                    <tr>
                                        <th className="font-medium p-3 text-left w-12 text-muted-foreground">No</th>
                                        <th className="font-medium p-3 text-left min-w-[200px]">{t('clientName')}*</th>
                                        <th className="font-medium p-3 text-left min-w-[250px]">{t('gdriveLink')}*</th>
                                        <th className="font-medium p-3 text-left min-w-[160px]">WA Klien</th>
                                        <th className="font-medium p-3 text-left min-w-[160px]">WA Admin</th>
                                        <th className="font-medium p-3 text-left min-w-[100px]">{t('maxPhotos')}*</th>
                                        {showAdvanced && (
                                            <>
                                                <th className="font-medium p-3 text-left min-w-[120px]">{t('password')}</th>
                                                <th className="font-medium p-3 text-left min-w-[120px]">{t('selectionDuration')} <span className="text-muted-foreground font-normal">(hari)</span></th>
                                                <th className="font-medium p-3 text-left min-w-[120px]">{t('downloadDuration')} <span className="text-muted-foreground font-normal">(hari)</span></th>
                                                <th className="font-medium p-3 text-left">{t('detectSubfolders')}</th>
                                            </>
                                        )}
                                        <th className="font-medium p-3 text-right w-12"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence initial={false}>
                                        {fields.map((field, index) => (
                                            <motion.tr
                                                key={field.id}
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="border-b last:border-0 group transition-colors hover:bg-muted/10"
                                            >
                                                <td className="p-3 text-muted-foreground align-top pt-5">
                                                    {index + 1}
                                                </td>
                                                <td className="p-3 align-top">
                                                    <FormField
                                                        control={form.control}
                                                        name={`projects.${index}.clientName`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <Input {...field} placeholder="Nama Klien..." className="bg-background" />
                                                                </FormControl>
                                                                <FormMessage className="text-xs" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </td>
                                                <td className="p-3 align-top">
                                                    <FormField
                                                        control={form.control}
                                                        name={`projects.${index}.gdriveLink`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <Input {...field} placeholder="https://drive.google.com/..." className="bg-background text-sm" />
                                                                </FormControl>
                                                                <FormMessage className="text-xs" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </td>
                                                <td className="p-3 align-top">
                                                    <FormField
                                                        control={form.control}
                                                        name={`projects.${index}.clientWhatsapp`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <Input {...field} placeholder="628123..." className="bg-background" />
                                                                </FormControl>
                                                                <FormMessage className="text-xs" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </td>
                                                <td className="p-3 align-top">
                                                    <FormField
                                                        control={form.control}
                                                        name={`projects.${index}.adminWhatsapp`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <Input {...field} placeholder="628123..." className="bg-background" />
                                                                </FormControl>
                                                                <FormMessage className="text-xs" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </td>
                                                <td className="p-3 align-top">
                                                    <FormField
                                                        control={form.control}
                                                        name={`projects.${index}.maxPhotos`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <Input type="number" {...field} min={1} className="bg-background" />
                                                                </FormControl>
                                                                <FormMessage className="text-xs" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </td>

                                                {showAdvanced && (
                                                    <>
                                                        <td className="p-3 align-top">
                                                            <FormField
                                                                control={form.control}
                                                                name={`projects.${index}.password`}
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormControl>
                                                                            <Input {...field} placeholder="..." className="bg-background" />
                                                                        </FormControl>
                                                                        <FormMessage className="text-xs" />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </td>
                                                        <td className="p-3 align-top">
                                                            <FormField
                                                                control={form.control}
                                                                name={`projects.${index}.expiryDays`}
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormControl>
                                                                            <Input type="number" {...field} min={0} className="bg-background" />
                                                                        </FormControl>
                                                                        <FormMessage className="text-xs" />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </td>
                                                        <td className="p-3 align-top">
                                                            <FormField
                                                                control={form.control}
                                                                name={`projects.${index}.downloadExpiryDays`}
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormControl>
                                                                            <Input type="number" {...field} min={0} className="bg-background" />
                                                                        </FormControl>
                                                                        <FormMessage className="text-xs" />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </td>
                                                        <td className="p-3 align-top pt-5 px-4 text-center">
                                                            <FormField
                                                                control={form.control}
                                                                name={`projects.${index}.detectSubfolders`}
                                                                render={({ field }) => (
                                                                    <FormItem className="flex justify-center">
                                                                        <FormControl>
                                                                            <Switch
                                                                                checked={field.value}
                                                                                onCheckedChange={field.onChange}
                                                                            />
                                                                        </FormControl>
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </td>
                                                    </>
                                                )}

                                                <td className="p-3 align-top pt-5">
                                                    {fields.length > 1 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => remove(index)}
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                                            title="Hapus Baris"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>

                        <div className="p-3 border-t bg-muted/20">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddRow}
                                className="gap-2 cursor-pointer border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors"
                            >
                                <Plus className="h-4 w-4" /> Tambah Baris
                            </Button>
                        </div>
                    </div>

                    {globalError && (
                        <div className="p-4 rounded-lg bg-destructive/15 border border-destructive/30">
                            <p className="text-destructive text-sm font-medium mb-2 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                {globalError}
                            </p>
                            {upgradeRequired && (
                                <Button size="sm" className="cursor-pointer" asChild>
                                    <a href={`/${locale}/pricing`}>
                                        {t('upgradeToPro')}
                                    </a>
                                </Button>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting} className="cursor-pointer min-w-24">
                            {t('cancel')}
                        </Button>
                        <Button type="submit" disabled={isSubmitting || fields.length === 0} className="cursor-pointer min-w-32">
                            {isSubmitting ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Menyimpan...</>
                            ) : (
                                <><Check className="h-4 w-4 mr-2" />Simpan {fields.length} Project</>
                            )}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    )
}
