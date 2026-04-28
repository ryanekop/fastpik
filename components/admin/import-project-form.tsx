"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations, useLocale } from "next-intl"
import {
    ArrowLeft, Upload, FileSpreadsheet, Download, Check, X,
    AlertCircle, CheckCircle2, Loader2, ArrowRight
} from "lucide-react"
import * as XLSX from "xlsx"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { generateShortId, type Project } from "@/lib/project-store"
import { createClient } from "@/lib/supabase/client"

interface ImportProjectFormProps {
    onBack: () => void
    onProjectsImported: (projects: Project[]) => void
    currentFolderId?: string | null
}

interface ParsedRow {
    clientName: string
    gdriveLink: string
    clientWhatsapp: string
    password: string
    maxPhotos: string
    expiryDays: string
    downloadExpiryDays: string
    detectSubfolders: string
    projectType: string
    printSizes: string
    valid: boolean
    errors: string[]
}

interface DefaultSettings {
    defaultMaxPhotos: number
    defaultExpiryDays: number
    defaultDownloadExpiryDays: number
    defaultSelectionEnabled: boolean
    defaultDownloadEnabled: boolean
    defaultExtraEnabled: boolean
    defaultExtraMaxPhotos: number
    defaultExtraExpiryDays: number
    defaultDetectSubfolders: boolean
    defaultAdminWhatsapp: string
    defaultCountryCode: string
    defaultPassword: string
    vendorSlug: string | null
    printEnabled: boolean
    defaultPrintSelectionEnabled: boolean
    defaultPrintExpiryDays: number
    defaultPrintSizes: string
}

export function ImportProjectForm({ onBack, onProjectsImported, currentFolderId }: ImportProjectFormProps) {
    const t = useTranslations('Admin')
    const locale = useLocale()
    const supabase = createClient()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [step, setStep] = useState<'upload' | 'preview' | 'confirm'>('upload')
    const [rows, setRows] = useState<ParsedRow[]>([])
    const [isDragging, setIsDragging] = useState(false)
    const [fileName, setFileName] = useState<string | null>(null)
    const [isImporting, setIsImporting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [upgradeRequired, setUpgradeRequired] = useState(false)
    const [defaults, setDefaults] = useState<DefaultSettings>({
        defaultMaxPhotos: 10,
        defaultExpiryDays: 0,
        defaultDownloadExpiryDays: 0,
        defaultSelectionEnabled: true,
        defaultDownloadEnabled: true,
        defaultExtraEnabled: false,
        defaultExtraMaxPhotos: 0,
        defaultExtraExpiryDays: 0,
        defaultDetectSubfolders: false,
        defaultAdminWhatsapp: '',
        defaultCountryCode: 'ID',
        defaultPassword: '',
        vendorSlug: null,
        printEnabled: false,
        defaultPrintSelectionEnabled: false,
        defaultPrintExpiryDays: 0,
        defaultPrintSizes: '',
    })

    // Load default settings
    useEffect(() => {
        loadDefaults()
    }, [])

    const loadDefaults = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase
                .from('settings')
                .select('default_admin_whatsapp, vendor_name, default_max_photos, default_detect_subfolders, default_expiry_days, default_download_expiry_days, default_selection_enabled, default_download_enabled, default_extra_enabled, default_extra_max_photos, default_extra_expiry_days, default_country_code, default_password, print_enabled, default_print_selection_enabled, default_print_expiry_days, print_templates')
                .eq('user_id', user.id)
                .maybeSingle()

            if (data) {
                const firstPrintTemplate = Array.isArray(data.print_templates) ? data.print_templates[0] : null
                const defaultPrintSizes = Array.isArray(firstPrintTemplate?.sizes)
                    ? firstPrintTemplate.sizes
                        .map((size: { name?: string; quota?: number }) => `${(size.name || '').trim()}:${Math.max(1, Number(size.quota) || 1)}`)
                        .filter((entry: string) => !entry.startsWith(':'))
                        .join(', ')
                    : ''
                setDefaults({
                    defaultMaxPhotos: data.default_max_photos || 10,
                    defaultExpiryDays: data.default_expiry_days || 0,
                    defaultDownloadExpiryDays: data.default_download_expiry_days || 0,
                    defaultSelectionEnabled: data.default_selection_enabled !== false,
                    defaultDownloadEnabled: data.default_download_enabled !== false,
                    defaultExtraEnabled: Boolean(data.default_extra_enabled),
                    defaultExtraMaxPhotos: data.default_extra_max_photos || 0,
                    defaultExtraExpiryDays: data.default_extra_expiry_days || 0,
                    defaultDetectSubfolders: Boolean(data.default_detect_subfolders),
                    defaultAdminWhatsapp: data.default_admin_whatsapp || '',
                    defaultCountryCode: data.default_country_code || 'ID',
                    defaultPassword: data.default_password || '',
                    vendorSlug: data.vendor_name
                        ? data.vendor_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                        : null,
                    printEnabled: data.print_enabled || false,
                    defaultPrintSelectionEnabled: Boolean(data.default_print_selection_enabled),
                    defaultPrintExpiryDays: data.default_print_expiry_days || 0,
                    defaultPrintSizes,
                })
            }
        } catch (err) {
            console.log('No default settings found')
        }
    }

    const isValidUrl = (str: string) => {
        try { new URL(str); return true } catch { return false }
    }

    const parseFile = useCallback((file: File) => {
        setFileName(file.name)
        setError(null)

        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: 'array' })
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
                const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: '' })

                if (jsonData.length === 0) {
                    setError(t('importNoData'))
                    return
                }

                const parsed: ParsedRow[] = jsonData.map((row) => {
                    const clientName = String(row.clientName || row['Client Name'] || row['Nama Klien'] || '').trim()
                    const gdriveLink = String(row.gdriveLink || row['Google Drive Link'] || row['Link GDrive'] || '').trim()
                    const clientWhatsapp = String(row.clientWhatsapp || row['WhatsApp'] || row['No WA'] || '').trim()
                    const password = String(row.password || row['Password'] || '').trim()
                    const maxPhotos = String(row.maxPhotos || row['Max Photos'] || row['Jumlah Foto'] || '').trim()
                    const expiryDays = String(row.expiryDays || row['Expiry Days'] || row['Durasi (Hari)'] || '').trim()
                    const downloadExpiryDays = String(row.downloadExpiryDays || row['Download Expiry Days'] || row['Durasi Download (Hari)'] || '').trim()
                    const detectSubfolders = String(row.detectSubfolders || row['Detect Subfolders'] || row['Deteksi Subfolder'] || '').trim().toLowerCase()
                    const projectType = String(row.projectType || row['Project Type'] || row['Tipe Proyek'] || '').trim().toLowerCase()
                    const printSizes = String(row.printSizes || row['Print Sizes'] || row['Ukuran Cetak'] || '').trim()

                    const errors: string[] = []
                    if (!clientName) errors.push(t('importRequiredField') + ': clientName')
                    if (!gdriveLink) errors.push(t('importRequiredField') + ': gdriveLink')
                    if (gdriveLink && !isValidUrl(gdriveLink)) errors.push(t('importInvalidUrl'))

                    return {
                        clientName,
                        gdriveLink,
                        clientWhatsapp,
                        password,
                        maxPhotos,
                        expiryDays,
                        downloadExpiryDays,
                        detectSubfolders,
                        projectType,
                        printSizes,
                        valid: errors.length === 0,
                        errors,
                    }
                })

                setRows(parsed)
                setStep('preview')
            } catch (err) {
                console.error('Parse error:', err)
                setError(t('importParseError'))
            }
        }
        reader.readAsArrayBuffer(file)
    }, [t])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.csv') || file.name.endsWith('.xls'))) {
            parseFile(file)
        }
    }, [parseFile])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) parseFile(file)
    }

    const downloadTemplate = () => {
        const templateData = [
            {
                clientName: 'Andi & Sari',
                gdriveLink: 'https://drive.google.com/drive/folders/example1',
                clientWhatsapp: '6281234567890',
                password: 'wedding2026',
                maxPhotos: 20,
                expiryDays: 7,
                downloadExpiryDays: 14,
                detectSubfolders: '',
            },
            {
                clientName: 'Budi & Citra',
                gdriveLink: 'https://drive.google.com/drive/folders/example2',
                clientWhatsapp: '6289876543210',
                password: '',
                maxPhotos: 15,
                expiryDays: 14,
                downloadExpiryDays: 30,
                detectSubfolders: 'yes',
                projectType: '',
                printSizes: '',
            },
            {
                clientName: 'Dani & Eva',
                gdriveLink: 'https://drive.google.com/drive/folders/example3',
                clientWhatsapp: '6281111222333',
                password: '',
                maxPhotos: '',
                expiryDays: 7,
                downloadExpiryDays: '',
                detectSubfolders: '',
                projectType: 'print',
                printSizes: '4R:2, 5R:3',
            },
        ]

        const ws = XLSX.utils.json_to_sheet(templateData)
        // Set column widths
        ws['!cols'] = [
            { wch: 20 }, // clientName
            { wch: 50 }, // gdriveLink
            { wch: 20 }, // clientWhatsapp
            { wch: 15 }, // password
            { wch: 12 }, // maxPhotos
            { wch: 12 }, // expiryDays
            { wch: 18 }, // downloadExpiryDays
            { wch: 16 }, // detectSubfolders
            { wch: 12 }, // projectType
            { wch: 20 }, // printSizes
        ]
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Projects')
        XLSX.writeFile(wb, 'template_fastpik.xlsx')
    }

    const validRows = rows.filter(r => r.valid)
    const invalidRows = rows.filter(r => !r.valid)

    const handleImport = async () => {
        setIsImporting(true)
        setError(null)
        setUpgradeRequired(false)

        try {
            const origin = window.location.origin
            const pathParts = window.location.pathname.split('/')
            const loc = pathParts[1] || 'id'

            const projects: Project[] = validRows.map(row => {
                const projectId = generateShortId()
                const maxPhotos = defaults.defaultSelectionEnabled
                    ? (parseInt(row.maxPhotos) || defaults.defaultMaxPhotos)
                    : null
                const expiryDaysNum = row.expiryDays ? parseInt(row.expiryDays) : defaults.defaultExpiryDays
                const downloadExpiryDaysNum = row.downloadExpiryDays ? parseInt(row.downloadExpiryDays) : defaults.defaultDownloadExpiryDays
                const detectSub = row.detectSubfolders ? ['true', 'yes', '1', 'ya'].includes(row.detectSubfolders) : defaults.defaultDetectSubfolders
                const link = defaults.vendorSlug
                    ? `${origin}/${loc}/client/${defaults.vendorSlug}/${projectId}`
                    : `${origin}/${loc}/client/${projectId}`

                const isPrint = row.projectType === 'print'
                const effectivePrintEnabled = defaults.printEnabled && (isPrint || defaults.defaultPrintSelectionEnabled)
                // Parse printSizes from format "4R:2, 5R:3" → [{ name: '4R', quota: 2 }, ...]
                const printSizesSource = row.printSizes || (effectivePrintEnabled ? defaults.defaultPrintSizes : '')
                let parsedPrintSizes: { name: string, quota: number }[] = []
                if (effectivePrintEnabled && printSizesSource) {
                    parsedPrintSizes = printSizesSource.split(',').map(s => {
                        const [name, quota] = s.trim().split(':')
                        return { name: name?.trim() || '', quota: parseInt(quota?.trim()) || 1 }
                    }).filter(s => s.name)
                }
                const printExpiryDays = defaults.defaultPrintExpiryDays || expiryDaysNum
                const extraExpiryDays = defaults.defaultExtraExpiryDays || 0

                const project: Project = {
                    id: projectId,
                    clientName: row.clientName,
                    gdriveLink: row.gdriveLink,
                    clientWhatsapp: row.clientWhatsapp || '',
                    adminWhatsapp: defaults.defaultAdminWhatsapp,
                    countryCode: defaults.defaultCountryCode,
                    maxPhotos: defaults.defaultSelectionEnabled && !isPrint ? maxPhotos : null,
                    password: row.password || defaults.defaultPassword || undefined,
                    detectSubfolders: detectSub,
                    selectionEnabled: defaults.defaultSelectionEnabled,
                    downloadEnabled: defaults.defaultDownloadEnabled,
                    expiresAt: expiryDaysNum > 0 ? Date.now() + (expiryDaysNum * 24 * 60 * 60 * 1000) : undefined,
                    downloadExpiresAt: downloadExpiryDaysNum > 0 ? Date.now() + (downloadExpiryDaysNum * 24 * 60 * 60 * 1000) : undefined,
                    extraEnabled: defaults.defaultExtraEnabled,
                    extraMaxPhotos: defaults.defaultExtraEnabled ? Math.max(1, defaults.defaultExtraMaxPhotos || 1) : null,
                    extraExpiresAt: defaults.defaultExtraEnabled && extraExpiryDays > 0 ? Date.now() + (extraExpiryDays * 24 * 60 * 60 * 1000) : undefined,
                    createdAt: Date.now(),
                    link,
                    folderId: currentFolderId || null,
                    ...(effectivePrintEnabled ? {
                        projectType: isPrint ? 'print' as const : 'edit' as const,
                        printEnabled: true,
                        printSizes: parsedPrintSizes,
                        printExpiresAt: printExpiryDays > 0 ? Date.now() + (printExpiryDays * 24 * 60 * 60 * 1000) : undefined,
                    } : {}),
                }
                return project
            })

            const res = await fetch('/api/projects/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projects }),
            })

            if (!res.ok) {
                const errData = await res.json()
                if (res.status === 403 && errData.upgradeRequired) {
                    setError(errData.message)
                    setUpgradeRequired(true)
                    return
                }
                throw new Error(errData.message || 'Failed to import projects')
            }

            const result = await res.json()
            onProjectsImported(result.projects)
        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan')
        } finally {
            setIsImporting(false)
        }
    }

    const removeRow = (index: number) => {
        setRows(prev => prev.filter((_, i) => i !== index))
    }

    return (
        <div className="w-full">
            <Button variant="ghost" onClick={onBack} className="mb-4 gap-2 cursor-pointer">
                <ArrowLeft className="h-4 w-4" />{t('backToList')}
            </Button>

            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                {t('importTitle')}
            </h2>

            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
                <span className={step === 'upload' ? 'text-primary font-medium' : 'text-green-600'}>
                    {step !== 'upload' ? <Check className="h-4 w-4 inline" /> : '1.'} {t('importUploadStep')}
                </span>
                <ArrowRight className="h-3 w-3" />
                <span className={step === 'preview' ? 'text-primary font-medium' : step === 'confirm' ? 'text-green-600' : ''}>
                    {step === 'confirm' ? <Check className="h-4 w-4 inline" /> : '2.'} {t('importPreviewStep')}
                </span>
                <ArrowRight className="h-3 w-3" />
                <span className={step === 'confirm' ? 'text-primary font-medium' : ''}>
                    3. {t('importConfirmStep')}
                </span>
            </div>

            <AnimatePresence mode="wait">
                {/* Step 1: Upload */}
                {step === 'upload' && (
                    <motion.div
                        key="upload"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                    >
                        <Button variant="outline" className="w-full gap-2 cursor-pointer border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950/30" onClick={downloadTemplate}>
                            <Download className="h-4 w-4" />
                            {t('importDownloadTemplate')}
                        </Button>

                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${isDragging
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50 hover:bg-muted/30'
                                }`}
                        >
                            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                            <p className="font-medium">{t('importDragDrop')}</p>
                            <p className="text-sm text-muted-foreground mt-1">{t('importOr')}</p>
                            <Button variant="outline" className="mt-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}>
                                {t('importChooseFile')}
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.csv,.xls"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                {error}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Step 2: Preview */}
                {step === 'preview' && (
                    <motion.div
                        key="preview"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                    >
                        {/* Stats */}
                        <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1.5 text-green-600">
                                <CheckCircle2 className="h-4 w-4" />
                                {t('importValidRows', { count: validRows.length })}
                            </span>
                            {invalidRows.length > 0 && (
                                <span className="flex items-center gap-1.5 text-destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    {t('importInvalidRows', { count: invalidRows.length })}
                                </span>
                            )}
                            <span className="text-muted-foreground ml-auto">{fileName}</span>
                        </div>

                        {/* Table */}
                        <div className="border rounded-lg overflow-auto max-h-[400px]">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 sticky top-0">
                                    <tr>
                                        <th className="text-left p-3 font-medium">No</th>
                                        <th className="text-left p-3 font-medium">clientName</th>
                                        <th className="text-left p-3 font-medium">gdriveLink</th>
                                        <th className="text-left p-3 font-medium">clientWhatsapp</th>
                                        <th className="text-left p-3 font-medium">password</th>
                                        <th className="text-left p-3 font-medium">maxPhotos</th>
                                        <th className="text-left p-3 font-medium">expiryDays</th>
                                        <th className="text-left p-3 font-medium">downloadExpiryDays</th>
                                        <th className="text-left p-3 font-medium">detectSubfolders</th>
                                        {defaults.printEnabled && (
                                            <>
                                                <th className="text-left p-3 font-medium">projectType</th>
                                                <th className="text-left p-3 font-medium">printSizes</th>
                                            </>
                                        )}
                                        <th className="text-left p-3 font-medium w-8"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, i) => (
                                        <tr
                                            key={i}
                                            className={`border-t transition-colors ${row.valid
                                                ? 'hover:bg-muted/30'
                                                : 'bg-destructive/5 hover:bg-destructive/10'
                                                }`}
                                        >
                                            <td className="p-3 text-muted-foreground">{i + 1}</td>
                                            <td className="p-3 font-medium max-w-[200px] truncate">{row.clientName || <span className="text-destructive italic">{t('importEmpty')}</span>}</td>
                                            <td className="p-3 max-w-[200px] truncate text-muted-foreground">{row.gdriveLink || <span className="text-destructive italic">{t('importEmpty')}</span>}</td>
                                            <td className="p-3">{row.clientWhatsapp || <span className="text-muted-foreground italic">-</span>}</td>
                                            <td className="p-3">{row.password || <span className="text-muted-foreground italic">-</span>}</td>
                                            <td className="p-3">{row.maxPhotos || <span className="text-muted-foreground italic">{defaults.defaultSelectionEnabled ? defaults.defaultMaxPhotos : '-'}</span>}</td>
                                            <td className="p-3">{row.expiryDays || <span className="text-muted-foreground italic">{defaults.defaultExpiryDays || '∞'}</span>}</td>
                                            <td className="p-3">{row.downloadExpiryDays || <span className="text-muted-foreground italic">{defaults.defaultDownloadExpiryDays || '∞'}</span>}</td>
                                            <td className="p-3">{row.detectSubfolders || <span className="text-muted-foreground italic">{defaults.defaultDetectSubfolders ? 'yes' : 'no'}</span>}</td>
                                            {defaults.printEnabled && (
                                                <>
                                                    <td className="p-3">{row.projectType ? <span className={row.projectType === 'print' ? 'text-purple-600 font-medium' : ''}>{row.projectType}</span> : <span className="text-muted-foreground italic">edit</span>}</td>
                                                    <td className="p-3">{row.printSizes || <span className="text-muted-foreground italic">-</span>}</td>
                                                </>
                                            )}
                                            <td className="p-3">
                                                <button onClick={() => removeRow(i)} className="text-muted-foreground hover:text-destructive cursor-pointer">
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Error details */}
                        {invalidRows.length > 0 && (
                            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-sm space-y-1">
                                <p className="font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                                    <AlertCircle className="h-4 w-4" />
                                    {t('importInvalidNote')}
                                </p>
                                <p className="text-amber-700 dark:text-amber-400 text-xs">
                                    {t('importInvalidNoteDesc')}
                                </p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => { setStep('upload'); setRows([]); setFileName(null) }} className="cursor-pointer">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                {t('importReupload')}
                            </Button>
                            <Button
                                onClick={() => setStep('confirm')}
                                disabled={validRows.length === 0}
                                className="flex-1 cursor-pointer"
                            >
                                {t('importContinue')}
                                <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                        </div>
                    </motion.div>
                )}

                {/* Step 3: Confirm */}
                {step === 'confirm' && (
                    <motion.div
                        key="confirm"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                    >
                        <Card>
                            <CardContent className="pt-6 space-y-4">
                                <div className="text-center space-y-2">
                                    <FileSpreadsheet className="h-12 w-12 mx-auto text-primary" />
                                    <h3 className="text-lg font-semibold">
                                        {t('importConfirmTitle', { count: validRows.length })}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {t('importConfirmDesc')}
                                    </p>
                                </div>

                                {/* Summary */}
                                <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">{t('importTotalProjects')}</span>
                                        <span className="font-medium">{validRows.length}</span>
                                    </div>
                                    {invalidRows.length > 0 && (
                                        <div className="flex justify-between text-amber-600">
                                            <span>{t('importSkipped')}</span>
                                            <span>{invalidRows.length}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">{t('importFolder')}</span>
                                        <span className="font-medium">{currentFolderId ? t('importCurrentFolder') : t('importRootFolder')}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Error */}
                        {error && (
                            <div className="p-4 rounded-lg bg-destructive/15 border border-destructive/30">
                                <p className="text-destructive text-sm font-medium mb-2 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    {error}
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

                        {/* Actions */}
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setStep('preview')} className="cursor-pointer" disabled={isImporting}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                {t('importBack')}
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={isImporting || validRows.length === 0}
                                className="flex-1 cursor-pointer"
                            >
                                {isImporting ? (
                                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('importImporting')}</>
                                ) : (
                                    <><Check className="h-4 w-4 mr-2" />{t('importButton', { count: validRows.length })}</>
                                )}
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
