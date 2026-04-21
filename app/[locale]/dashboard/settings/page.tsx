"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useTranslations, useLocale } from "next-intl"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PhoneInput } from "@/components/ui/phone-input"
import { Loader2, Save, ArrowLeft, Send, Search, Bot, ClipboardPaste, Settings, Plus, Trash2, Check, Copy } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { AdminShell } from "@/components/admin/admin-shell"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageTemplateEditor } from "@/components/admin/message-template-editor"
import { Switch } from "@/components/ui/switch"
import { PopupDialog, Toast } from "@/components/ui/popup-dialog"
import type { PrintTemplate } from "@/lib/supabase/settings"
import { useTenant } from "@/lib/tenant-context"
import { shouldHideTenantBranding } from "@/lib/tenant-branding"

type LocalizedText = { id: string; en: string }
type SeoFieldKey = "title" | "description" | "keywords"
const getErrorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback

export default function SettingsPage() {
    const t = useTranslations('Admin')
    const locale = useLocale()
    const supabase = createClient()
    const tenant = useTenant()
    const showAttribution = !shouldHideTenantBranding({
        id: tenant.id,
        domain: tenant.domain,
    })

    const [defaultAdminWhatsapp, setDefaultAdminWhatsapp] = useState("")
    const [vendorName, setVendorName] = useState("")
    const [clientChooseActionText, setClientChooseActionText] = useState<LocalizedText>({ id: "", en: "" })
    const [clientChooseActionTab, setClientChooseActionTab] = useState<'id' | 'en'>('id')
    const [dashboardDurationDisplay, setDashboardDurationDisplay] = useState<'selection' | 'download'>('selection')
    const [defaultMaxPhotos, setDefaultMaxPhotos] = useState("")
    const [defaultDetectSubfolders, setDefaultDetectSubfolders] = useState(false)
    const [defaultSelectionEnabled, setDefaultSelectionEnabled] = useState(true)
    const [defaultDownloadEnabled, setDefaultDownloadEnabled] = useState(true)
    const [defaultExtraEnabled, setDefaultExtraEnabled] = useState(false)
    const [defaultExtraMaxPhotos, setDefaultExtraMaxPhotos] = useState("")
    const [defaultExtraExpiryDays, setDefaultExtraExpiryDays] = useState("")
    const [defaultPrintSelectionEnabled, setDefaultPrintSelectionEnabled] = useState(false)
    const [defaultExpiryDays, setDefaultExpiryDays] = useState("")
    const [defaultDownloadExpiryDays, setDefaultDownloadExpiryDays] = useState("")
    const [defaultPassword, setDefaultPassword] = useState("")
    const [showCustomDefaultExpiryDialog, setShowCustomDefaultExpiryDialog] = useState(false)
    const [customDefaultExpiryTarget, setCustomDefaultExpiryTarget] = useState<'selection' | 'download' | 'extra' | 'print'>('selection')
    const [customDefaultMonths, setCustomDefaultMonths] = useState("")
    const [customDefaultDays, setCustomDefaultDays] = useState("")
    const [customDefaultExpiryLabel, setCustomDefaultExpiryLabel] = useState<string | null>(null)
    const [customDefaultDownloadExpiryLabel, setCustomDefaultDownloadExpiryLabel] = useState<string | null>(null)
    const [customDefaultExtraExpiryLabel, setCustomDefaultExtraExpiryLabel] = useState<string | null>(null)
    const [customDefaultPrintExpiryLabel, setCustomDefaultPrintExpiryLabel] = useState<string | null>(null)
    const [seoMetaTitle, setSeoMetaTitle] = useState("")
    const [seoMetaDescription, setSeoMetaDescription] = useState("")
    const [seoMetaKeywords, setSeoMetaKeywords] = useState("")
    const [activeSeoField, setActiveSeoField] = useState<SeoFieldKey>("title")
    const seoFieldRefs = useRef<{
        title: HTMLInputElement | null
        description: HTMLTextAreaElement | null
        keywords: HTMLInputElement | null
    }>({
        title: null,
        description: null,
        keywords: null,
    })

    // Print config state
    const [printEnabled, setPrintEnabled] = useState(false)
    const [printTemplates, setPrintTemplates] = useState<PrintTemplate[]>([])
    const [defaultPrintExpiryDays, setDefaultPrintExpiryDays] = useState("")
    const [expandedTemplate, setExpandedTemplate] = useState<number | null>(null)
    const [deleteTemplateIdx, setDeleteTemplateIdx] = useState<number | null>(null)

    // Message Templates State
    const [tmplLinkInitial, setTmplLinkInitial] = useState({ id: "", en: "" })
    const [tmplLinkInitialPrint, setTmplLinkInitialPrint] = useState({ id: "", en: "" })
    const [tmplLinkExtra, setTmplLinkExtra] = useState({ id: "", en: "" })
    const [tmplResultInitial, setTmplResultInitial] = useState({ id: "", en: "" })
    const [tmplResultExtra, setTmplResultExtra] = useState({ id: "", en: "" })
    const [tmplResultPrint, setTmplResultPrint] = useState({ id: "", en: "" })
    const [tmplRawRequest, setTmplRawRequest] = useState({ id: "", en: "" })
    const [tmplReminder, setTmplReminder] = useState({ id: "", en: "" })
    const [tmplReminderExtra, setTmplReminderExtra] = useState({ id: "", en: "" })
    const [tmplReminderPrint, setTmplReminderPrint] = useState({ id: "", en: "" })

    // Telegram Bot State
    const [telegramChatId, setTelegramChatId] = useState("")
    const [telegramReminderDays, setTelegramReminderDays] = useState<number[]>([7, 3])
    const [telegramReminderType, setTelegramReminderType] = useState<'both' | 'selection' | 'download'>('both')
    const [telegramLanguage, setTelegramLanguage] = useState<'id' | 'en'>('id')
    const [testingSend, setTestingSend] = useState(false)
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

    // ClientDesk integration state
    const [clientDeskIntegrationEnabled, setClientDeskIntegrationEnabled] = useState(false)
    const [clientDeskApiKeyId, setClientDeskApiKeyId] = useState("")
    const [clientDeskApiKeyHash, setClientDeskApiKeyHash] = useState("")
    const [clientDeskLastSyncAt, setClientDeskLastSyncAt] = useState<string | null>(null)
    const [clientDeskLastSyncStatus, setClientDeskLastSyncStatus] = useState<'idle' | 'success' | 'warning' | 'failed' | 'syncing'>('idle')
    const [clientDeskLastSyncMessage, setClientDeskLastSyncMessage] = useState("")
    const [generatedClientDeskApiKey, setGeneratedClientDeskApiKey] = useState<string | null>(null)
    const [generatingClientDeskApiKey, setGeneratingClientDeskApiKey] = useState(false)
    const [clientDeskApiKeyCopied, setClientDeskApiKeyCopied] = useState(false)

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ open: boolean; message: string; type: 'info' | 'success' | 'warning' | 'danger' }>({ open: false, message: "", type: "success" })

    const showAdminToast = (message: string, type: 'info' | 'success' | 'warning' | 'danger' = 'success') => {
        setToast({ open: true, message, type })
    }

    const loadSettings = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase
                .from('settings')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle()

            if (data) {
                setDefaultAdminWhatsapp(data.default_admin_whatsapp || "")
                setVendorName(data.vendor_name || "")
                setClientChooseActionText(data.client_choose_action_text || { id: "", en: "" })
                setDashboardDurationDisplay(data.dashboard_duration_display || 'selection')
                setDefaultMaxPhotos(data.default_max_photos?.toString() || "")
                setDefaultDetectSubfolders(Boolean(data.default_detect_subfolders))
                setDefaultSelectionEnabled(data.default_selection_enabled !== false)
                setDefaultDownloadEnabled(data.default_download_enabled !== false)
                setDefaultExtraEnabled(Boolean(data.default_extra_enabled))
                setDefaultExtraMaxPhotos(data.default_extra_max_photos?.toString() || "")
                setDefaultPrintSelectionEnabled(Boolean(data.default_print_selection_enabled))
                const standardOptions = ['', '1', '3', '5', '7', '14', '30']
                const formatCustomDuration = (days: number) => {
                    const months = Math.floor(days / 30)
                    const remainDays = days % 30
                    const parts: string[] = []
                    if (months > 0) parts.push(`${months} ${t('customMonthsLabel')}`)
                    if (remainDays > 0 || parts.length === 0) parts.push(`${remainDays > 0 ? remainDays : days} ${t('customDaysLabel')}`)
                    return parts.join(' ')
                }
                const expiryVal = data.default_expiry_days?.toString() || ""
                setDefaultExpiryDays(expiryVal)
                if (expiryVal && !standardOptions.includes(expiryVal)) {
                    setCustomDefaultExpiryLabel(formatCustomDuration(data.default_expiry_days))
                } else setCustomDefaultExpiryLabel(null)
                const dlExpiryVal = data.default_download_expiry_days?.toString() || ""
                setDefaultDownloadExpiryDays(dlExpiryVal)
                if (dlExpiryVal && !standardOptions.includes(dlExpiryVal)) {
                    setCustomDefaultDownloadExpiryLabel(formatCustomDuration(data.default_download_expiry_days))
                } else setCustomDefaultDownloadExpiryLabel(null)
                const extraExpiryVal = data.default_extra_expiry_days?.toString() || ""
                setDefaultExtraExpiryDays(extraExpiryVal)
                if (extraExpiryVal && !standardOptions.includes(extraExpiryVal)) {
                    setCustomDefaultExtraExpiryLabel(formatCustomDuration(data.default_extra_expiry_days))
                } else setCustomDefaultExtraExpiryLabel(null)
                setDefaultPassword(data.default_password || "")
                setSeoMetaTitle(data.seo_meta_title || "")
                setSeoMetaDescription(data.seo_meta_description || "")
                setSeoMetaKeywords(data.seo_meta_keywords || "")
                if (data.msg_tmpl_link_initial) setTmplLinkInitial(data.msg_tmpl_link_initial)
                if (data.msg_tmpl_link_initial_print) setTmplLinkInitialPrint(data.msg_tmpl_link_initial_print)
                if (data.msg_tmpl_link_extra) setTmplLinkExtra(data.msg_tmpl_link_extra)
                if (data.msg_tmpl_result_initial) setTmplResultInitial(data.msg_tmpl_result_initial)
                if (data.msg_tmpl_result_extra) setTmplResultExtra(data.msg_tmpl_result_extra)
                if (data.msg_tmpl_result_print) setTmplResultPrint(data.msg_tmpl_result_print)
                if (data.msg_tmpl_raw_request) setTmplRawRequest(data.msg_tmpl_raw_request)
                if (data.msg_tmpl_reminder) setTmplReminder(data.msg_tmpl_reminder)
                if (data.msg_tmpl_reminder_extra) setTmplReminderExtra(data.msg_tmpl_reminder_extra)
                if (data.msg_tmpl_reminder_print) setTmplReminderPrint(data.msg_tmpl_reminder_print)
                // Telegram
                setTelegramChatId(data.telegram_chat_id || "")
                if (data.telegram_reminder_days) setTelegramReminderDays(data.telegram_reminder_days.map((d: number | string) => Number(d)))
                if (data.telegram_reminder_type) setTelegramReminderType(data.telegram_reminder_type)
                if (data.telegram_language) setTelegramLanguage(data.telegram_language)
                // ClientDesk integration
                setClientDeskIntegrationEnabled(Boolean(data.clientdesk_integration_enabled))
                setClientDeskApiKeyId(data.clientdesk_api_key_id || "")
                setClientDeskApiKeyHash(data.clientdesk_api_key_hash || "")
                setClientDeskLastSyncAt(data.clientdesk_last_sync_at || null)
                setClientDeskLastSyncStatus((data.clientdesk_last_sync_status || 'idle') as 'idle' | 'success' | 'warning' | 'failed' | 'syncing')
                setClientDeskLastSyncMessage(data.clientdesk_last_sync_message || "")
                // Print
                setPrintEnabled(data.print_enabled || false)
                setPrintTemplates(data.print_templates || [])
                const printExpiryVal = data.default_print_expiry_days?.toString() || ""
                setDefaultPrintExpiryDays(printExpiryVal)
                if (printExpiryVal && !standardOptions.includes(printExpiryVal)) {
                    setCustomDefaultPrintExpiryLabel(formatCustomDuration(data.default_print_expiry_days))
                } else setCustomDefaultPrintExpiryLabel(null)
            }
        } catch (err) {
            console.error('Failed to load settings:', err)
        } finally {
            setLoading(false)
        }
    }, [supabase, t])

    useEffect(() => {
        loadSettings()
    }, [loadSettings])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setError(null)
        setSuccess(false)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Not authenticated")

            const { error: upsertError } = await supabase
                .from('settings')
                .upsert({
                    user_id: user.id,
                    default_admin_whatsapp: defaultAdminWhatsapp,
                    vendor_name: vendorName || null,
                    client_choose_action_text: clientChooseActionText,
                    dashboard_duration_display: dashboardDurationDisplay,
                    default_max_photos: defaultMaxPhotos ? parseInt(defaultMaxPhotos) : null,
                    default_detect_subfolders: defaultDetectSubfolders,
                    default_selection_enabled: defaultSelectionEnabled,
                    default_download_enabled: defaultDownloadEnabled,
                    default_extra_enabled: defaultExtraEnabled,
                    default_extra_max_photos: defaultExtraEnabled && defaultExtraMaxPhotos ? parseInt(defaultExtraMaxPhotos) : null,
                    default_extra_expiry_days: defaultExtraEnabled && defaultExtraExpiryDays ? parseInt(defaultExtraExpiryDays) : null,
                    default_print_selection_enabled: defaultPrintSelectionEnabled,
                    default_expiry_days: defaultExpiryDays ? parseInt(defaultExpiryDays) : null,
                    default_download_expiry_days: defaultDownloadExpiryDays ? parseInt(defaultDownloadExpiryDays) : null,
                    default_password: defaultPassword || null,
                    seo_meta_title: seoMetaTitle.trim() || null,
                    seo_meta_description: seoMetaDescription.trim() || null,
                    seo_meta_keywords: seoMetaKeywords.trim() || null,
                    msg_tmpl_link_initial: tmplLinkInitial,
                    msg_tmpl_link_initial_print: tmplLinkInitialPrint,
                    msg_tmpl_link_extra: tmplLinkExtra,
                    msg_tmpl_result_initial: tmplResultInitial,
                    msg_tmpl_result_extra: tmplResultExtra,
                    msg_tmpl_result_print: tmplResultPrint,
                    msg_tmpl_raw_request: tmplRawRequest,
                    msg_tmpl_reminder: tmplReminder,
                    msg_tmpl_reminder_extra: tmplReminderExtra,
                    msg_tmpl_reminder_print: tmplReminderPrint,
                    telegram_chat_id: telegramChatId || null,
                    telegram_reminder_days: telegramReminderDays,
                    telegram_reminder_type: telegramReminderType,
                    telegram_language: telegramLanguage,
                    clientdesk_integration_enabled: clientDeskIntegrationEnabled,
                    clientdesk_api_key_id: clientDeskApiKeyId || null,
                    clientdesk_api_key_hash: clientDeskApiKeyHash || null,
                    print_enabled: printEnabled,
                    print_templates: printTemplates,
                    default_print_expiry_days: defaultPrintExpiryDays ? parseInt(defaultPrintExpiryDays) : null,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                })

            if (upsertError) throw upsertError

            setSuccess(true)
            showAdminToast(t('settingsSaved'), 'success')
            setTimeout(() => setSuccess(false), 3000)
        } catch (err: unknown) {
            const message = getErrorMessage(err, t('saveFailed'))
            setError(message)
            showAdminToast(message, 'danger')
        } finally {
            setSaving(false)
        }
    }

    const hashApiKey = async (value: string) => {
        const encoded = new TextEncoder().encode(value)
        const digest = await crypto.subtle.digest('SHA-256', encoded)
        const bytes = Array.from(new Uint8Array(digest))
        return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('')
    }

    const randomHex = (size: number) => {
        const bytes = new Uint8Array(size)
        crypto.getRandomValues(bytes)
        return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('')
    }

    const handleGenerateClientDeskApiKey = async () => {
        setGeneratingClientDeskApiKey(true)
        setError(null)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                throw new Error("Not authenticated")
            }

            const keyId = `cdk_${randomHex(6)}`
            const secret = randomHex(24)
            const fullKey = `${keyId}.${secret}`
            const keyHash = await hashApiKey(fullKey)

            const { error: upsertError } = await supabase
                .from('settings')
                .upsert({
                    user_id: user.id,
                    clientdesk_integration_enabled: true,
                    clientdesk_api_key_id: keyId,
                    clientdesk_api_key_hash: keyHash,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'user_id'
                })

            if (upsertError) {
                throw upsertError
            }

            setClientDeskApiKeyId(keyId)
            setClientDeskApiKeyHash(keyHash)
            setClientDeskIntegrationEnabled(true)
            setGeneratedClientDeskApiKey(fullKey)
            setSuccess(true)
            showAdminToast(t('settingsSaved'), 'success')
            setTimeout(() => setSuccess(false), 3000)
        } catch (err: unknown) {
            console.error('Failed to generate ClientDesk API key:', err)
            const message = getErrorMessage(err, "Failed to generate API key")
            setError(message)
            showAdminToast(message, 'danger')
        } finally {
            setGeneratingClientDeskApiKey(false)
        }
    }

    const copyGeneratedClientDeskApiKey = async () => {
        if (!generatedClientDeskApiKey) return
        try {
            await navigator.clipboard.writeText(generatedClientDeskApiKey)
            setClientDeskApiKeyCopied(true)
            showAdminToast(t('copySuccess'), 'success')
            setTimeout(() => setClientDeskApiKeyCopied(false), 2000)
        } catch {
            setClientDeskApiKeyCopied(false)
            showAdminToast(t('copyFailed'), 'danger')
        }
    }

    const insertSeoToken = (token: string) => {
        const updateField = (field: SeoFieldKey, value: string) => {
            if (field === "title") setSeoMetaTitle(value)
            if (field === "description") setSeoMetaDescription(value)
            if (field === "keywords") setSeoMetaKeywords(value)
        }

        const getFieldValue = (field: SeoFieldKey) => {
            if (field === "title") return seoMetaTitle
            if (field === "description") return seoMetaDescription
            return seoMetaKeywords
        }

        const target = seoFieldRefs.current[activeSeoField]
        const current = getFieldValue(activeSeoField)
        const start = target?.selectionStart ?? current.length
        const end = target?.selectionEnd ?? current.length
        const nextValue = `${current.slice(0, start)}${token}${current.slice(end)}`
        updateField(activeSeoField, nextValue)

        const nextCursor = start + token.length
        setTimeout(() => {
            const activeTarget = seoFieldRefs.current[activeSeoField]
            if (activeTarget) {
                activeTarget.focus()
                activeTarget.setSelectionRange(nextCursor, nextCursor)
            }
        }, 0)
    }

    if (loading) {
        return (
            <AdminShell>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </AdminShell>
        )
    }

    return (
        <AdminShell>
            <Toast isOpen={toast.open} message={toast.message} type={toast.type} position="top-right" duration={1800} onClose={() => setToast((current) => ({ ...current, open: false }))} />
            <div className="max-w-4xl mx-auto pb-10">
                <div className="mb-6 flex items-center justify-between">
                    <Link href={`/${locale}/dashboard`} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t('backToList')}
                    </Link>
                </div>

                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Settings className="h-6 w-6" /> {t('settings')}
                        </h1>
                        <p className="text-muted-foreground">{t('settingsDescription')}</p>
                    </div>
                </div>

                <form onSubmit={handleSave}>
                    <Tabs defaultValue="general" className="w-full">
                        <TabsList className="mb-6 w-full overflow-x-auto flex justify-start">
                            <TabsTrigger value="general">{t('generalTab')}</TabsTrigger>
                            <TabsTrigger value="seo">{t('seoTab')}</TabsTrigger>
                            <TabsTrigger value="templates">{t('templatesTab')}</TabsTrigger>
                            <TabsTrigger value="print">{t('printTab')}</TabsTrigger>
                            <TabsTrigger value="clientdesk">{t('clientDeskTab')}</TabsTrigger>
                            <TabsTrigger value="telegram">{t('telegramTab')}</TabsTrigger>
                        </TabsList>

                        {/* General Settings Tab */}
                        <TabsContent value="general">
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('generalConfigTitle')}</CardTitle>
                                    <CardDescription>{t('generalConfigDesc')}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="defaultAdminWhatsapp">📲 {t('defaultAdminWhatsapp')}</Label>
                                        <PhoneInput
                                            value={defaultAdminWhatsapp}
                                            onChange={(fullNumber) => setDefaultAdminWhatsapp(fullNumber)}
                                            placeholder="812xxxxxxxx"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {t('defaultAdminWhatsappHint')}
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="vendorName">🏷️ {t('vendorName')}</Label>
                                        <Input
                                            id="vendorName"
                                            value={vendorName}
                                            onChange={(e) => setVendorName(e.target.value)}
                                            placeholder={t('vendorNamePlaceholder')}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {t('vendorNameHint')}
                                        </p>
                                        {vendorName && (
                                            <p className="text-xs text-primary font-mono bg-muted px-2 py-1 rounded">
                                                …/client/<span className="font-bold">{vendorName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}</span>/xxxxx
                                            </p>
                                        )}
                                        <a
                                            href={`/${locale}/dashboard/custom-domain`}
                                            className="flex items-center gap-2 text-xs text-primary hover:underline mt-1"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                                            {t('customDomainPromo')}
                                        </a>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <Label>{t('clientChooseActionText')}</Label>
                                            <p className="text-xs text-muted-foreground">
                                                {t('clientChooseActionTextHint')}
                                            </p>
                                        </div>
                                        <Tabs
                                            value={clientChooseActionTab}
                                            onValueChange={(value) => setClientChooseActionTab(value === 'en' ? 'en' : 'id')}
                                            className="w-full"
                                        >
                                            <TabsList className="grid w-full grid-cols-2">
                                                <TabsTrigger value="id">{t('languageIndonesian')}</TabsTrigger>
                                                <TabsTrigger value="en">{t('languageEnglish')}</TabsTrigger>
                                            </TabsList>

                                            <div className="mt-3">
                                                <TabsContent value="id" className="mt-0">
                                                    <Textarea
                                                        id="clientChooseActionTextId"
                                                        value={clientChooseActionText.id}
                                                        onChange={(e) => setClientChooseActionText((prev) => ({ ...prev, id: e.target.value }))}
                                                        placeholder={t('clientChooseActionTextPlaceholderId')}
                                                        className="min-h-32"
                                                    />
                                                </TabsContent>
                                                <TabsContent value="en" className="mt-0">
                                                    <Textarea
                                                        id="clientChooseActionTextEn"
                                                        value={clientChooseActionText.en}
                                                        onChange={(e) => setClientChooseActionText((prev) => ({ ...prev, en: e.target.value }))}
                                                        placeholder={t('clientChooseActionTextPlaceholderEn')}
                                                        className="min-h-32"
                                                    />
                                                </TabsContent>
                                            </div>
                                        </Tabs>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>⏱️ {t('dashboardDurationDisplay')}</Label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="dashboardDuration"
                                                    value="selection"
                                                    checked={dashboardDurationDisplay === 'selection'}
                                                    onChange={() => setDashboardDurationDisplay('selection')}
                                                    className="accent-primary cursor-pointer"
                                                />
                                                <span className="text-sm">🖼️ {t('dashboardDurationSelection')}</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="dashboardDuration"
                                                    value="download"
                                                    checked={dashboardDurationDisplay === 'download'}
                                                    onChange={() => setDashboardDurationDisplay('download')}
                                                    className="accent-primary cursor-pointer"
                                                />
                                                <span className="text-sm">📥 {t('dashboardDurationDownload')}</span>
                                            </label>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {t('dashboardDurationHint')}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Default Project Settings */}
                            <Card className="mt-6">
                                <CardHeader>
                                    <CardTitle>📋 {t('defaultProjectTitle')}</CardTitle>
                                    <CardDescription>{t('defaultProjectDesc')}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>📸 {t('defaultMaxPhotos')}</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={defaultMaxPhotos}
                                                onChange={(e) => setDefaultMaxPhotos(e.target.value)}
                                                placeholder="10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>🔐 {t('defaultPasswordLabel')}</Label>
                                            <Input
                                                value={defaultPassword}
                                                onChange={(e) => setDefaultPassword(e.target.value)}
                                                placeholder={t('defaultPasswordPlaceholder')}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="flex items-center justify-between rounded-lg border p-3">
                                            <Label className="cursor-pointer">🖼️ {t('selectPhotos')}</Label>
                                            <Switch
                                                checked={defaultSelectionEnabled}
                                                onCheckedChange={setDefaultSelectionEnabled}
                                                className="cursor-pointer"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between rounded-lg border p-3">
                                            <Label className="cursor-pointer">📥 {t('downloadPhotos')}</Label>
                                            <Switch
                                                checked={defaultDownloadEnabled}
                                                onCheckedChange={setDefaultDownloadEnabled}
                                                className="cursor-pointer"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between rounded-lg border p-3">
                                            <Label className="cursor-pointer">📷 {t('extraPhotoSectionTitle')}</Label>
                                            <Switch
                                                checked={defaultExtraEnabled}
                                                onCheckedChange={setDefaultExtraEnabled}
                                                className="cursor-pointer"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between rounded-lg border p-3">
                                            <Label className="cursor-pointer">🖨️ {t('printPhotoSectionTitle')}</Label>
                                            <Switch
                                                checked={defaultPrintSelectionEnabled}
                                                onCheckedChange={setDefaultPrintSelectionEnabled}
                                                disabled={!printEnabled}
                                                className="cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>⏰ {t('defaultSelectionDuration')}</Label>
                                            <div className="relative">
                                                {customDefaultExpiryLabel && (
                                                    <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer" onClick={() => { setCustomDefaultExpiryTarget('selection'); setCustomDefaultMonths(''); setCustomDefaultDays(''); setShowCustomDefaultExpiryDialog(true) }}>
                                                        <span>✏️ {customDefaultExpiryLabel}</span>
                                                        <button type="button" className="text-muted-foreground hover:text-foreground ml-2" onClick={(e) => { e.stopPropagation(); setDefaultExpiryDays(''); setCustomDefaultExpiryLabel(null) }}>✕</button>
                                                    </div>
                                                )}
                                                <select
                                                    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer ${customDefaultExpiryLabel ? 'hidden' : ''}`}
                                                    value={customDefaultExpiryLabel ? 'custom' : defaultExpiryDays}
                                                    onChange={(e) => {
                                                        if (e.target.value === 'custom') {
                                                            setCustomDefaultExpiryTarget('selection')
                                                            setCustomDefaultMonths('')
                                                            setCustomDefaultDays('')
                                                            setShowCustomDefaultExpiryDialog(true)
                                                        } else {
                                                            setDefaultExpiryDays(e.target.value)
                                                            setCustomDefaultExpiryLabel(null)
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
                                                    <option value="custom">✏️ {t('custom')}</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>📥 {t('defaultDownloadDuration')}</Label>
                                            <div className="relative">
                                                {customDefaultDownloadExpiryLabel && (
                                                    <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer" onClick={() => { setCustomDefaultExpiryTarget('download'); setCustomDefaultMonths(''); setCustomDefaultDays(''); setShowCustomDefaultExpiryDialog(true) }}>
                                                        <span>✏️ {customDefaultDownloadExpiryLabel}</span>
                                                        <button type="button" className="text-muted-foreground hover:text-foreground ml-2" onClick={(e) => { e.stopPropagation(); setDefaultDownloadExpiryDays(''); setCustomDefaultDownloadExpiryLabel(null) }}>✕</button>
                                                    </div>
                                                )}
                                                <select
                                                    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer ${customDefaultDownloadExpiryLabel ? 'hidden' : ''}`}
                                                    value={customDefaultDownloadExpiryLabel ? 'custom' : defaultDownloadExpiryDays}
                                                    onChange={(e) => {
                                                        if (e.target.value === 'custom') {
                                                            setCustomDefaultExpiryTarget('download')
                                                            setCustomDefaultMonths('')
                                                            setCustomDefaultDays('')
                                                            setShowCustomDefaultExpiryDialog(true)
                                                        } else {
                                                            setDefaultDownloadExpiryDays(e.target.value)
                                                            setCustomDefaultDownloadExpiryLabel(null)
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
                                                    <option value="custom">✏️ {t('custom')}</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    {defaultExtraEnabled && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-800 dark:bg-amber-950/20">
                                            <div className="space-y-2">
                                                <Label>➕ {t('extraPhotosCount')}</Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={defaultExtraMaxPhotos}
                                                    onChange={(e) => setDefaultExtraMaxPhotos(e.target.value)}
                                                    placeholder="5"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>⏰ {t('extraDurationLabel')}</Label>
                                                <div className="relative">
                                                    {customDefaultExtraExpiryLabel && (
                                                        <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer" onClick={() => { setCustomDefaultExpiryTarget('extra'); setCustomDefaultMonths(''); setCustomDefaultDays(''); setShowCustomDefaultExpiryDialog(true) }}>
                                                            <span>✏️ {customDefaultExtraExpiryLabel}</span>
                                                            <button type="button" className="text-muted-foreground hover:text-foreground ml-2" onClick={(e) => { e.stopPropagation(); setDefaultExtraExpiryDays(''); setCustomDefaultExtraExpiryLabel(null) }}>✕</button>
                                                        </div>
                                                    )}
                                                    <select
                                                        className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer ${customDefaultExtraExpiryLabel ? 'hidden' : ''}`}
                                                        value={customDefaultExtraExpiryLabel ? 'custom' : defaultExtraExpiryDays}
                                                        onChange={(e) => {
                                                            if (e.target.value === 'custom') {
                                                                setCustomDefaultExpiryTarget('extra')
                                                                setCustomDefaultMonths('')
                                                                setCustomDefaultDays('')
                                                                setShowCustomDefaultExpiryDialog(true)
                                                            } else {
                                                                setDefaultExtraExpiryDays(e.target.value)
                                                                setCustomDefaultExtraExpiryLabel(null)
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
                                                        <option value="custom">✏️ {t('custom')}</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {defaultPrintSelectionEnabled && printEnabled && (
                                        <div className="space-y-2 rounded-lg border border-purple-200 bg-purple-50/40 p-3 dark:border-purple-800 dark:bg-purple-950/20">
                                            <Label>⏰ {t('defaultPrintDuration')}</Label>
                                            <div className="relative">
                                                {customDefaultPrintExpiryLabel && (
                                                    <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer" onClick={() => { setCustomDefaultExpiryTarget('print'); setCustomDefaultMonths(''); setCustomDefaultDays(''); setShowCustomDefaultExpiryDialog(true) }}>
                                                        <span>✏️ {customDefaultPrintExpiryLabel}</span>
                                                        <button type="button" className="text-muted-foreground hover:text-foreground ml-2" onClick={(e) => { e.stopPropagation(); setDefaultPrintExpiryDays(''); setCustomDefaultPrintExpiryLabel(null) }}>✕</button>
                                                    </div>
                                                )}
                                                <select
                                                    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer ${customDefaultPrintExpiryLabel ? 'hidden' : ''}`}
                                                    value={customDefaultPrintExpiryLabel ? 'custom' : defaultPrintExpiryDays}
                                                    onChange={(e) => {
                                                        if (e.target.value === 'custom') {
                                                            setCustomDefaultExpiryTarget('print')
                                                            setCustomDefaultMonths('')
                                                            setCustomDefaultDays('')
                                                            setShowCustomDefaultExpiryDialog(true)
                                                        } else {
                                                            setDefaultPrintExpiryDays(e.target.value)
                                                            setCustomDefaultPrintExpiryLabel(null)
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
                                                    <option value="custom">✏️ {t('custom')}</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between rounded-lg border p-3">
                                        <Label className="cursor-pointer">📂 {t('detectSubfolders')}</Label>
                                        <Switch
                                            checked={defaultDetectSubfolders}
                                            onCheckedChange={setDefaultDetectSubfolders}
                                            className="cursor-pointer"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">{t('defaultProjectHint')}</p>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* SEO Settings Tab */}
                        <TabsContent value="seo">
                            <Card>
                                <CardHeader>
                                    <CardTitle>🔎 {t('seoClientTitle')}</CardTitle>
                                    <CardDescription>{t('seoClientDesc')}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="seoMetaTitle">{t('seoMetaTitleLabel')}</Label>
                                        <Input
                                            id="seoMetaTitle"
                                            value={seoMetaTitle}
                                            onChange={(e) => setSeoMetaTitle(e.target.value)}
                                            onFocus={() => setActiveSeoField("title")}
                                            placeholder={t('seoMetaTitlePlaceholder', {
                                                clientNameToken: "{{client_name}}",
                                                vendorNameToken: "{{vendor_name}}",
                                            })}
                                            ref={(node) => {
                                                seoFieldRefs.current.title = node
                                            }}
                                        />
                                        <p className="text-xs text-muted-foreground">{t('seoMetaTitleHint')}</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="seoMetaDescription">{t('seoMetaDescriptionLabel')}</Label>
                                        <Textarea
                                            id="seoMetaDescription"
                                            value={seoMetaDescription}
                                            onChange={(e) => setSeoMetaDescription(e.target.value)}
                                            onFocus={() => setActiveSeoField("description")}
                                            placeholder={t('seoMetaDescriptionPlaceholder', {
                                                vendorNameToken: "{{vendor_name}}",
                                            })}
                                            className="min-h-28"
                                            ref={(node) => {
                                                seoFieldRefs.current.description = node
                                            }}
                                        />
                                        <p className="text-xs text-muted-foreground">{t('seoMetaDescriptionHint')}</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="seoMetaKeywords">{t('seoMetaKeywordsLabel')}</Label>
                                        <Input
                                            id="seoMetaKeywords"
                                            value={seoMetaKeywords}
                                            onChange={(e) => setSeoMetaKeywords(e.target.value)}
                                            onFocus={() => setActiveSeoField("keywords")}
                                            placeholder={t('seoMetaKeywordsPlaceholder')}
                                            ref={(node) => {
                                                seoFieldRefs.current.keywords = node
                                            }}
                                        />
                                        <p className="text-xs text-muted-foreground">{t('seoMetaKeywordsHint')}</p>
                                    </div>

                                    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                                        <p className="text-sm font-medium">{t('seoVariableTitle')}</p>
                                        <p className="text-xs text-muted-foreground">{t('seoVariableHint')}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {["{{vendor_name}}", "{{tenant_name}}", "{{client_name}}", "{{project_id}}", "{{locale}}"].map((token) => (
                                                <Button
                                                    key={token}
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => insertSeoToken(token)}
                                                    className="cursor-pointer"
                                                >
                                                    {token}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-amber-300/60 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20 p-3">
                                        <p className="text-xs text-amber-800 dark:text-amber-200">
                                            {t('seoDefaultHint')}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Print Tab */}
                        <TabsContent value="print" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>🖨️ {t('printEnabled')}</CardTitle>
                                    <CardDescription>{t('printEnabledHint')}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="printEnabled">{t('printEnabled')}</Label>
                                        <Switch
                                            id="printEnabled"
                                            checked={printEnabled}
                                            onCheckedChange={setPrintEnabled}
                                            className="cursor-pointer"
                                        />
                                    </div>

                                    {printEnabled && (
                                        <>
                                            {/* Print Templates */}
                                            <div className="space-y-3">
                                                <Label>📝 {t('printTemplates')}</Label>
                                                <p className="text-xs text-muted-foreground">{t('printTemplatesHint')}</p>
                                                <div className="space-y-3">
                                                    {printTemplates.map((tmpl, tmplIdx) => {
                                                        const isExpanded = expandedTemplate === tmplIdx
                                                        const sizeSummary = tmpl.sizes.map(s => `${s.name}×${s.quota}`).join(', ')
                                                        return (
                                                            <div key={tmplIdx} className="rounded-lg border">
                                                                <div
                                                                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                                                                    onClick={() => setExpandedTemplate(isExpanded ? null : tmplIdx)}
                                                                >
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-medium text-sm truncate">
                                                                            {tmpl.name || t('printTemplateName')}
                                                                        </p>
                                                                        {sizeSummary && (
                                                                            <p className="text-xs text-muted-foreground truncate">{sizeSummary}</p>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={(e) => { e.stopPropagation(); setDeleteTemplateIdx(tmplIdx) }}
                                                                            className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                                {isExpanded && (
                                                                    <div className="p-3 pt-0 space-y-3 border-t">
                                                                        <div className="space-y-1">
                                                                            <Label className="text-xs">{t('printTemplateName')}</Label>
                                                                            <Input
                                                                                value={tmpl.name}
                                                                                onChange={(e) => {
                                                                                    const updated = [...printTemplates]
                                                                                    updated[tmplIdx] = { ...updated[tmplIdx], name: e.target.value }
                                                                                    setPrintTemplates(updated)
                                                                                }}
                                                                                placeholder="e.g. Paket Nikah"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label className="text-xs">{t('printSizes')}</Label>
                                                                            {tmpl.sizes.map((size, sizeIdx) => (
                                                                                <div key={sizeIdx} className="flex items-center gap-2">
                                                                                    <Input
                                                                                        value={size.name}
                                                                                        onChange={(e) => {
                                                                                            const updated = [...printTemplates]
                                                                                            const sizes = [...updated[tmplIdx].sizes]
                                                                                            sizes[sizeIdx] = { ...sizes[sizeIdx], name: e.target.value }
                                                                                            updated[tmplIdx] = { ...updated[tmplIdx], sizes }
                                                                                            setPrintTemplates(updated)
                                                                                        }}
                                                                                        placeholder={t('printSizeNamePlaceholder')}
                                                                                        className="flex-1"
                                                                                    />
                                                                                    <Input
                                                                                        type="number"
                                                                                        min="1"
                                                                                        value={size.quota}
                                                                                        onChange={(e) => {
                                                                                            const updated = [...printTemplates]
                                                                                            const sizes = [...updated[tmplIdx].sizes]
                                                                                            sizes[sizeIdx] = { ...sizes[sizeIdx], quota: parseInt(e.target.value) || 1 }
                                                                                            updated[tmplIdx] = { ...updated[tmplIdx], sizes }
                                                                                            setPrintTemplates(updated)
                                                                                        }}
                                                                                        className="w-20"
                                                                                    />
                                                                                    <span className="text-xs text-muted-foreground whitespace-nowrap">{t('printSizeQuota')}</span>
                                                                                    <Button
                                                                                        type="button" variant="ghost" size="icon"
                                                                                        onClick={() => {
                                                                                            const updated = [...printTemplates]
                                                                                            updated[tmplIdx] = { ...updated[tmplIdx], sizes: updated[tmplIdx].sizes.filter((_, i) => i !== sizeIdx) }
                                                                                            setPrintTemplates(updated)
                                                                                        }}
                                                                                        className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
                                                                                    >
                                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                                    </Button>
                                                                                </div>
                                                                            ))}
                                                                            <Button
                                                                                type="button" variant="outline" size="sm"
                                                                                onClick={() => {
                                                                                    const updated = [...printTemplates]
                                                                                    updated[tmplIdx] = { ...updated[tmplIdx], sizes: [...updated[tmplIdx].sizes, { name: '', quota: 1 }] }
                                                                                    setPrintTemplates(updated)
                                                                                }}
                                                                                className="gap-1.5 cursor-pointer"
                                                                            >
                                                                                <Plus className="h-3.5 w-3.5" />
                                                                                {t('addPrintSize')}
                                                                            </Button>
                                                                        </div>
                                                                        <Button
                                                                            type="button" variant="default" size="sm"
                                                                            onClick={() => setExpandedTemplate(null)}
                                                                            className="gap-1.5 cursor-pointer"
                                                                        >
                                                                            <Check className="h-3.5 w-3.5" />
                                                                            {t('saveTemplate')}
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                                <Button
                                                    type="button" variant="outline" size="sm"
                                                    onClick={() => {
                                                        setPrintTemplates([...printTemplates, { name: '', sizes: [{ name: '', quota: 1 }] }])
                                                        setExpandedTemplate(printTemplates.length)
                                                    }}
                                                    className="gap-2 cursor-pointer"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                    {t('addPrintTemplate')}
                                                </Button>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>⏰ {t('defaultPrintDuration')}</Label>
                                                <div className="relative">
                                                    {customDefaultPrintExpiryLabel && (
                                                        <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer" onClick={() => { setCustomDefaultExpiryTarget('print'); setCustomDefaultMonths(''); setCustomDefaultDays(''); setShowCustomDefaultExpiryDialog(true) }}>
                                                            <span>✏️ {customDefaultPrintExpiryLabel}</span>
                                                            <button type="button" className="text-muted-foreground hover:text-foreground ml-2" onClick={(e) => { e.stopPropagation(); setDefaultPrintExpiryDays(''); setCustomDefaultPrintExpiryLabel(null) }}>✕</button>
                                                        </div>
                                                    )}
                                                    <select
                                                        className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer ${customDefaultPrintExpiryLabel ? 'hidden' : ''}`}
                                                        value={customDefaultPrintExpiryLabel ? 'custom' : defaultPrintExpiryDays}
                                                        onChange={(e) => {
                                                            if (e.target.value === 'custom') {
                                                                setCustomDefaultExpiryTarget('print')
                                                                setCustomDefaultMonths('')
                                                                setCustomDefaultDays('')
                                                                setShowCustomDefaultExpiryDialog(true)
                                                            } else {
                                                                setDefaultPrintExpiryDays(e.target.value)
                                                                setCustomDefaultPrintExpiryLabel(null)
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
                                                        <option value="custom">✏️ {t('custom')}</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>


                            {/* Delete Template Confirmation */}
                            <PopupDialog
                                isOpen={deleteTemplateIdx !== null}
                                onClose={() => setDeleteTemplateIdx(null)}
                                onConfirm={() => {
                                    if (deleteTemplateIdx !== null) {
                                        setPrintTemplates(printTemplates.filter((_, i) => i !== deleteTemplateIdx))
                                        if (expandedTemplate === deleteTemplateIdx) setExpandedTemplate(null)
                                        setDeleteTemplateIdx(null)
                                    }
                                }}
                                title={t('confirmDeleteTemplate')}
                                message={t('confirmDeleteTemplateMsg')}
                                type="danger"
                                confirmText={t('delete')}
                                cancelText={t('cancel')}
                            />
                        </TabsContent>

                        {/* Message Templates Tab */}
                        <TabsContent value="templates" className="space-y-6">
                            <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4 text-sm text-green-800 dark:text-green-200 flex gap-3">
                                <span className="text-lg shrink-0">✅</span>
                                <p>{t('templateEmojiNotice')}</p>
                            </div>
                            <div className="space-y-6">
                                {/* === LINK TEMPLATES === */}
                                <MessageTemplateEditor
                                    title={t('tmplInitialLinkTitle')}
                                    description={t('tmplInitialLinkDesc')}
                                    variables={[
                                        { key: "client_name", label: t('varClientName') },
                                        { key: "link", label: t('varLink') },
                                        { key: "count", label: t('varMaxPhotos') },
                                        { key: "password", label: t('varPassword') },
                                        { key: "duration", label: t('varDuration') },
                                        { key: "download_duration", label: t('varDownloadDuration') },
                                        { key: "print_sizes", label: t('varPrintSizes') },
                                        { key: "print_duration", label: t('varPrintDuration') }
                                    ]}
                                    value={tmplLinkInitial}
                                    onChange={setTmplLinkInitial}
                                />

                                <MessageTemplateEditor
                                    title={t('tmplExtraLinkTitle')}
                                    description={t('tmplExtraLinkDesc')}
                                    colorScheme="yellow"
                                    variables={[
                                        { key: "client_name", label: t('varClientName') },
                                        { key: "link", label: t('varLink') },
                                        { key: "count", label: t('varExtraCount') },
                                        { key: "password", label: t('varPassword') },
                                        { key: "duration", label: t('varDuration') },
                                        { key: "download_duration", label: t('varDownloadDuration') }
                                    ]}
                                    value={tmplLinkExtra}
                                    onChange={setTmplLinkExtra}
                                />

                                {printEnabled && (
                                    <MessageTemplateEditor
                                        title={t('tmplPrintLinkTitle')}
                                        description={t('tmplPrintLinkDesc')}
                                        colorScheme="purple"
                                        variables={[
                                            { key: "client_name", label: t('varClientName') },
                                            { key: "link", label: t('varLink') },
                                            { key: "print_sizes", label: t('varPrintSizes') },
                                            { key: "print_duration", label: t('varPrintDuration') }
                                        ]}
                                        value={tmplLinkInitialPrint}
                                        onChange={setTmplLinkInitialPrint}
                                    />
                                )}

                                {/* === RESULT TEMPLATES === */}
                                <MessageTemplateEditor
                                    title={t('tmplInitialResultTitle')}
                                    description={t('tmplInitialResultDesc')}
                                    variables={[
                                        { key: "client_name", label: t('varClientName') },
                                        { key: "count", label: t('varSelectedCount') },
                                        { key: "list", label: t('varPhotoList') }
                                    ]}
                                    value={tmplResultInitial}
                                    onChange={setTmplResultInitial}
                                />

                                <MessageTemplateEditor
                                    title={t('tmplExtraResultTitle')}
                                    description={t('tmplExtraResultDesc')}
                                    colorScheme="yellow"
                                    variables={[
                                        { key: "client_name", label: t('varClientName') },
                                        { key: "count", label: t('varExtraCount') },
                                        { key: "list", label: t('varPhotoList') }
                                    ]}
                                    value={tmplResultExtra}
                                    onChange={setTmplResultExtra}
                                />

                                {printEnabled && (
                                    <MessageTemplateEditor
                                        title={t('tmplPrintResultTitle')}
                                        description={t('tmplPrintResultDesc')}
                                        colorScheme="purple"
                                        variables={[
                                            { key: "client_name", label: t('varClientName') },
                                            { key: "print_sizes", label: t('varPrintSizes') },
                                            { key: "list", label: t('varPhotoList') }
                                        ]}
                                        value={tmplResultPrint}
                                        onChange={setTmplResultPrint}
                                    />
                                )}

                                <MessageTemplateEditor
                                    title={t('tmplRawRequestTitle')}
                                    description={t('tmplRawRequestDesc')}
                                    colorScheme="green"
                                    variables={[
                                        { key: "client_name", label: t('varClientName') },
                                        { key: "selected_count", label: t('varSelectedCount') },
                                        { key: "selected_list", label: t('varSelectedList') },
                                        { key: "project_link", label: t('varProjectLink') }
                                    ]}
                                    value={tmplRawRequest}
                                    onChange={setTmplRawRequest}
                                />

                                {/* === REMINDER === */}
                                <MessageTemplateEditor
                                    title={t('tmplReminderTitle')}
                                    description={t('tmplReminderDesc')}
                                    variables={[
                                        { key: "client_name", label: t('varClientName') },
                                        { key: "link", label: t('varLink') },
                                        { key: "count", label: t('varMaxPhotos') },
                                        { key: "password", label: t('varPassword') },
                                        { key: "duration", label: t('varDuration') },
                                        { key: "download_duration", label: t('varDownloadDuration') }
                                    ]}
                                    value={tmplReminder}
                                    onChange={setTmplReminder}
                                />

                                <MessageTemplateEditor
                                    title={t('tmplReminderExtraTitle')}
                                    description={t('tmplReminderExtraDesc')}
                                    colorScheme="yellow"
                                    variables={[
                                        { key: "client_name", label: t('varClientName') },
                                        { key: "link", label: t('varLink') },
                                        { key: "count", label: t('varExtraCount') },
                                        { key: "password", label: t('varPassword') },
                                        { key: "duration", label: t('varDuration') },
                                        { key: "download_duration", label: t('varDownloadDuration') }
                                    ]}
                                    value={tmplReminderExtra}
                                    onChange={setTmplReminderExtra}
                                />

                                {printEnabled && (
                                    <MessageTemplateEditor
                                        title={t('tmplReminderPrintTitle')}
                                        description={t('tmplReminderPrintDesc')}
                                        colorScheme="purple"
                                        variables={[
                                            { key: "client_name", label: t('varClientName') },
                                            { key: "link", label: t('varLink') },
                                            { key: "print_sizes", label: t('varPrintSizes') },
                                            { key: "print_duration", label: t('varPrintDuration') },
                                            { key: "password", label: t('varPassword') }
                                        ]}
                                        value={tmplReminderPrint}
                                        onChange={setTmplReminderPrint}
                                    />
                                )}
                            </div>
                        </TabsContent>

                        {/* ClientDesk Integration Tab */}
                        <TabsContent value="clientdesk">
                            <Card>
                                <CardHeader>
                                    <CardTitle>🔗 {t('clientDeskTitle')}</CardTitle>
                                    <CardDescription>{t('clientDeskDesc')}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="flex items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium">{t('clientDeskEnable')}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {t('clientDeskEnableHint')}
                                            </p>
                                        </div>
                                        <Switch
                                            checked={clientDeskIntegrationEnabled}
                                            onCheckedChange={setClientDeskIntegrationEnabled}
                                            className="cursor-pointer"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t('clientDeskStatus')}</Label>
                                        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                                            {clientDeskIntegrationEnabled && clientDeskApiKeyId
                                                ? `✅ ${t('clientDeskConnected')}`
                                                : `⚪ ${t('clientDeskNotConnected')}`}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t('clientDeskApiKey')}</Label>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleGenerateClientDeskApiKey}
                                                disabled={generatingClientDeskApiKey}
                                                className="cursor-pointer"
                                            >
                                                {generatingClientDeskApiKey
                                                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    : null}
                                                {clientDeskApiKeyId ? t('clientDeskRegenerateKey') : t('clientDeskGenerateKey')}
                                            </Button>
                                            {clientDeskApiKeyId && (
                                                <span className="text-xs text-muted-foreground">
                                                    {t('clientDeskKeyId')}: <span className="font-mono">{clientDeskApiKeyId}</span>
                                                </span>
                                            )}
                                        </div>
                                        {generatedClientDeskApiKey && (
                                            <div className="rounded-md border border-amber-300 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/30 p-3 space-y-2">
                                                <p className="text-xs font-medium">{t('clientDeskKeyGenerated')}</p>
                                                <div className="flex items-center gap-2">
                                                    <Input value={generatedClientDeskApiKey} readOnly />
                                                    <Button type="button" variant="outline" size="icon" onClick={copyGeneratedClientDeskApiKey} className="cursor-pointer">
                                                        {clientDeskApiKeyCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-muted-foreground">{t('clientDeskKeyWarning')}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t('clientDeskLastSync')}</Label>
                                        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm space-y-1">
                                            <p className="text-xs text-muted-foreground">
                                                {clientDeskLastSyncAt
                                                    ? `${new Date(clientDeskLastSyncAt).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US')}`
                                                    : t('clientDeskNeverSynced')}
                                            </p>
                                            <p className="text-sm">
                                                {t('clientDeskSyncStatus')}: <span className="font-medium">{clientDeskLastSyncStatus}</span>
                                            </p>
                                            {clientDeskLastSyncMessage && (
                                                <p className="text-xs text-muted-foreground">{clientDeskLastSyncMessage}</p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Telegram Bot Tab */}
                        <TabsContent value="telegram">
                            <Card>
                                <CardHeader>
                                    <CardTitle>🤖 {t('telegramConfigTitle')}</CardTitle>
                                    <CardDescription>{t('telegramConfigDesc')}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Setup Guide */}
                                    <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/20 p-4 mb-6">
                                        <p className="text-sm font-medium mb-4 text-center">Cara Setup Bot Telegram</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            {/* Step 1 */}
                                            <a href="https://t.me/userinfo3bot" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center text-center group">
                                                <div className="relative mb-2">
                                                    <div className="w-16 h-16 rounded-full bg-background border-2 border-muted-foreground/20 flex items-center justify-center group-hover:border-primary transition-colors">
                                                        <Search className="w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors" />
                                                    </div>
                                                    <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center">1</span>
                                                </div>
                                                <p className="text-sm font-semibold">Dapatkan Chat ID</p>
                                                <p className="text-xs text-muted-foreground mt-1">Buka <span className="text-primary underline">@userinfo3bot</span> → klik Start → copy angka Id</p>
                                            </a>
                                            {/* Step 2 */}
                                            <a href="https://t.me/FastpikReminder_bot" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center text-center group">
                                                <div className="relative mb-2">
                                                    <div className="w-16 h-16 rounded-full bg-background border-2 border-muted-foreground/20 flex items-center justify-center group-hover:border-primary transition-colors">
                                                        <Bot className="w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors" />
                                                    </div>
                                                    <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center">2</span>
                                                </div>
                                                <p className="text-sm font-semibold">Start Bot Fastpik</p>
                                                <p className="text-xs text-muted-foreground mt-1">Buka <span className="text-primary underline">@FastpikReminder_bot</span> → klik Start</p>
                                            </a>
                                            {/* Step 3 */}
                                            <div className="flex flex-col items-center text-center">
                                                <div className="relative mb-2">
                                                    <div className="w-16 h-16 rounded-full bg-background border-2 border-muted-foreground/20 flex items-center justify-center">
                                                        <ClipboardPaste className="w-7 h-7 text-muted-foreground" />
                                                    </div>
                                                    <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center">3</span>
                                                </div>
                                                <p className="text-sm font-semibold">Paste Chat ID</p>
                                                <p className="text-xs text-muted-foreground mt-1">Masukkan Chat ID di kolom bawah lalu klik Test Kirim</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Chat ID Input */}
                                    <div className="space-y-2">
                                        <Label htmlFor="telegramChatId">💬 {t('telegramChatId')}</Label>
                                        <Input
                                            id="telegramChatId"
                                            value={telegramChatId}
                                            onChange={(e) => setTelegramChatId(e.target.value)}
                                            placeholder={t('telegramChatIdPlaceholder')}
                                        />
                                    </div>

                                    {/* Reminder Type */}
                                    <div className="space-y-2">
                                        <Label>🔔 {t('telegramReminderType')}</Label>
                                        <div className="flex flex-col gap-2">
                                            {(['both', 'selection', 'download'] as const).map((type) => (
                                                <label key={type} className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="telegramReminderType"
                                                        value={type}
                                                        checked={telegramReminderType === type}
                                                        onChange={() => setTelegramReminderType(type)}
                                                        className="accent-primary cursor-pointer"
                                                    />
                                                    <span className="text-sm">
                                                        {type === 'both' && `📸📥 ${t('telegramReminderBoth')}`}
                                                        {type === 'selection' && `📸 ${t('telegramReminderSelection')}`}
                                                        {type === 'download' && `📥 ${t('telegramReminderDownload')}`}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Reminder Days */}
                                    <div className="space-y-2">
                                        <Label>📅 {t('telegramReminderDays')}</Label>
                                        <div className="flex flex-wrap gap-3">
                                            {[1, 3, 5, 7, 14].map((day) => (
                                                <label key={day} className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={telegramReminderDays.includes(day)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setTelegramReminderDays([...telegramReminderDays, day].sort((a, b) => b - a))
                                                            } else {
                                                                setTelegramReminderDays(telegramReminderDays.filter(d => d !== day))
                                                            }
                                                        }}
                                                        className="accent-primary cursor-pointer rounded"
                                                    />
                                                    <span className="text-sm font-medium">
                                                        {t('telegramDaysBefore', { days: day })}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {t('telegramReminderDaysHint')}
                                        </p>
                                    </div>

                                    {/* Notification Language */}
                                    <div className="space-y-2">
                                        <Label>🌐 {t('telegramLanguage')}</Label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="telegramLanguage"
                                                    value="id"
                                                    checked={telegramLanguage === 'id'}
                                                    onChange={() => setTelegramLanguage('id')}
                                                    className="accent-primary cursor-pointer"
                                                />
                                                <span className="text-sm">🇮🇩 Indonesia</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="telegramLanguage"
                                                    value="en"
                                                    checked={telegramLanguage === 'en'}
                                                    onChange={() => setTelegramLanguage('en')}
                                                    className="accent-primary cursor-pointer"
                                                />
                                                <span className="text-sm">🇬🇧 English</span>
                                            </label>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {t('telegramLanguageHint')}
                                        </p>
                                    </div>

                                    {/* Test Send Button */}
                                    <div className="pt-2 border-t">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="cursor-pointer"
                                            disabled={testingSend || !telegramChatId}
                                            onClick={async () => {
                                                if (!telegramChatId) {
                                                    setTestResult({ success: false, message: t('telegramNoChatId') })
                                                    return
                                                }
                                                setTestingSend(true)
                                                setTestResult(null)
                                                try {
                                                    const res = await fetch('/api/telegram/test', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ chat_id: telegramChatId })
                                                    })
                                                    const data = await res.json()
                                                    if (res.ok && data.success) {
                                                        setTestResult({ success: true, message: t('telegramTestSuccess') })
                                                    } else {
                                                        setTestResult({ success: false, message: data.error || t('telegramTestError') })
                                                    }
                                                } catch {
                                                    setTestResult({ success: false, message: t('telegramTestError') })
                                                } finally {
                                                    setTestingSend(false)
                                                    setTimeout(() => setTestResult(null), 5000)
                                                }
                                            }}
                                        >
                                            {testingSend ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    {t('telegramTestSending')}
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="mr-2 h-4 w-4" />
                                                    {t('telegramTestButton')}
                                                </>
                                            )}
                                        </Button>
                                        {testResult && (
                                            <p className={`mt-2 text-sm font-medium ${testResult.success ? 'text-green-600' : 'text-destructive'}`}>
                                                {testResult.message}
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>

                    <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
                        <Button type="submit" size="lg" disabled={saving} className="w-full sm:w-auto cursor-pointer hover:bg-primary/90">
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('saving')}
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    {t('saveAllChanges')}
                                </>
                            )}
                        </Button>
                        {error && (
                            <span className="text-sm text-destructive font-medium">
                                {error}
                            </span>
                        )}
                        {success && (
                            <span className="text-sm text-green-600 font-medium animate-pulse">
                                ✅ {t('settingsSaved')}
                            </span>
                        )}
                    </div>
                </form>

                {showAttribution ? (
                    <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
                        <p>{t('footer')} <a href="https://instagram.com/ryanekopram" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@ryanekopram</a> & <a href="https://instagram.com/ryanekoapps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@ryanekoapps</a></p>
                    </div>
                ) : null}
            </div>

            {showCustomDefaultExpiryDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-background rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
                        <h3 className="text-lg font-semibold">✏️ {t('customDuration')}</h3>
                        <div className="flex gap-3">
                            <div className="flex-1 space-y-1">
                                <label className="text-sm font-medium">🗓️ {t('customMonthsLabel')}</label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={customDefaultMonths}
                                    onChange={(e) => setCustomDefaultMonths(e.target.value)}
                                    placeholder="0"
                                    autoFocus
                                />
                            </div>
                            <div className="flex-1 space-y-1">
                                <label className="text-sm font-medium">📅 {t('customDaysLabel')}</label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={customDefaultDays}
                                    onChange={(e) => setCustomDefaultDays(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1 cursor-pointer" onClick={() => setShowCustomDefaultExpiryDialog(false)}>{t('cancel')}</Button>
                            <Button className="flex-1 cursor-pointer" onClick={() => {
                                const months = parseInt(customDefaultMonths) || 0
                                const days = parseInt(customDefaultDays) || 0
                                if (months <= 0 && days <= 0) return
                                const totalDays = (months * 30) + days
                                const parts: string[] = []
                                if (months > 0) parts.push(`${months} ${t('customMonthsLabel')}`)
                                if (days > 0) parts.push(`${days} ${t('customDaysLabel')}`)
                                if (customDefaultExpiryTarget === 'selection') {
                                    setDefaultExpiryDays(totalDays.toString())
                                    setCustomDefaultExpiryLabel(parts.join(' '))
                                } else if (customDefaultExpiryTarget === 'download') {
                                    setDefaultDownloadExpiryDays(totalDays.toString())
                                    setCustomDefaultDownloadExpiryLabel(parts.join(' '))
                                } else if (customDefaultExpiryTarget === 'extra') {
                                    setDefaultExtraExpiryDays(totalDays.toString())
                                    setCustomDefaultExtraExpiryLabel(parts.join(' '))
                                } else {
                                    setDefaultPrintExpiryDays(totalDays.toString())
                                    setCustomDefaultPrintExpiryLabel(parts.join(' '))
                                }
                                setShowCustomDefaultExpiryDialog(false)
                            }} disabled={(parseInt(customDefaultMonths) || 0) <= 0 && (parseInt(customDefaultDays) || 0) <= 0}>✓ OK</Button>
                        </div>
                    </div>
                </div>
            )}
        </AdminShell>
    )
}
