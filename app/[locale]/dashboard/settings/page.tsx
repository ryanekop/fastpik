"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useTranslations, useLocale } from "next-intl"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PhoneInput } from "@/components/ui/phone-input"
import { Loader2, Save, ArrowLeft, MessageSquare } from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { AdminShell } from "@/components/admin/admin-shell"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageTemplateEditor } from "@/components/admin/message-template-editor"

export default function SettingsPage() {
    const t = useTranslations('Admin')
    const locale = useLocale()
    const router = useRouter()
    const supabase = createClient()

    const [defaultAdminWhatsapp, setDefaultAdminWhatsapp] = useState("")
    const [vendorName, setVendorName] = useState("")
    const [dashboardDurationDisplay, setDashboardDurationDisplay] = useState<'selection' | 'download'>('selection')
    const [defaultMaxPhotos, setDefaultMaxPhotos] = useState("")
    const [defaultExpiryDays, setDefaultExpiryDays] = useState("")
    const [defaultDownloadExpiryDays, setDefaultDownloadExpiryDays] = useState("")
    const [defaultPassword, setDefaultPassword] = useState("")
    const [showCustomDefaultExpiryDialog, setShowCustomDefaultExpiryDialog] = useState(false)
    const [customDefaultExpiryTarget, setCustomDefaultExpiryTarget] = useState<'selection' | 'download'>('selection')
    const [customDefaultMonths, setCustomDefaultMonths] = useState("")
    const [customDefaultDays, setCustomDefaultDays] = useState("")
    const [customDefaultExpiryLabel, setCustomDefaultExpiryLabel] = useState<string | null>(null)
    const [customDefaultDownloadExpiryLabel, setCustomDefaultDownloadExpiryLabel] = useState<string | null>(null)

    // Message Templates State
    const [tmplLinkInitial, setTmplLinkInitial] = useState({ id: "", en: "" })
    const [tmplLinkExtra, setTmplLinkExtra] = useState({ id: "", en: "" })
    const [tmplResultInitial, setTmplResultInitial] = useState({ id: "", en: "" })
    const [tmplResultExtra, setTmplResultExtra] = useState({ id: "", en: "" })
    const [tmplReminder, setTmplReminder] = useState({ id: "", en: "" })

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('settings')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle()

            if (data) {
                setDefaultAdminWhatsapp(data.default_admin_whatsapp || "")
                setVendorName(data.vendor_name || "")
                setDashboardDurationDisplay(data.dashboard_duration_display || 'selection')
                setDefaultMaxPhotos(data.default_max_photos?.toString() || "")
                setDefaultExpiryDays(data.default_expiry_days?.toString() || "")
                setDefaultDownloadExpiryDays(data.default_download_expiry_days?.toString() || "")
                setDefaultPassword(data.default_password || "")
                if (data.msg_tmpl_link_initial) setTmplLinkInitial(data.msg_tmpl_link_initial)
                if (data.msg_tmpl_link_extra) setTmplLinkExtra(data.msg_tmpl_link_extra)
                if (data.msg_tmpl_result_initial) setTmplResultInitial(data.msg_tmpl_result_initial)
                if (data.msg_tmpl_result_extra) setTmplResultExtra(data.msg_tmpl_result_extra)
                if (data.msg_tmpl_reminder) setTmplReminder(data.msg_tmpl_reminder)
            }
        } catch (err) {
            console.error('Failed to load settings:', err)
        } finally {
            setLoading(false)
        }
    }

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
                    dashboard_duration_display: dashboardDurationDisplay,
                    default_max_photos: defaultMaxPhotos ? parseInt(defaultMaxPhotos) : null,
                    default_expiry_days: defaultExpiryDays ? parseInt(defaultExpiryDays) : null,
                    default_download_expiry_days: defaultDownloadExpiryDays ? parseInt(defaultDownloadExpiryDays) : null,
                    default_password: defaultPassword || null,
                    msg_tmpl_link_initial: tmplLinkInitial,
                    msg_tmpl_link_extra: tmplLinkExtra,
                    msg_tmpl_result_initial: tmplResultInitial,
                    msg_tmpl_result_extra: tmplResultExtra,
                    msg_tmpl_reminder: tmplReminder,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                })

            if (upsertError) throw upsertError

            setSuccess(true)
            setTimeout(() => setSuccess(false), 3000)
        } catch (err: any) {
            setError(err.message || "Failed to save settings")
        } finally {
            setSaving(false)
        }
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
                            ⚙️ {t('settings')}
                        </h1>
                        <p className="text-muted-foreground">{t('settingsDescription')}</p>
                    </div>
                </div>

                <form onSubmit={handleSave}>
                    <Tabs defaultValue="general" className="w-full">
                        <TabsList className="mb-6">
                            <TabsTrigger value="general">{t('generalTab')}</TabsTrigger>
                            <TabsTrigger value="templates">{t('templatesTab')}</TabsTrigger>
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
                                    <p className="text-xs text-muted-foreground">{t('defaultProjectHint')}</p>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Message Templates Tab */}
                        <TabsContent value="templates" className="space-y-6">
                            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-800 dark:text-amber-200 flex gap-3">
                                <span className="text-lg shrink-0">⚠️</span>
                                <p>{t('templateEmojiNotice')}</p>
                            </div>
                            <div className="space-y-6">
                                <MessageTemplateEditor
                                    title={t('tmplInitialLinkTitle')}
                                    description={t('tmplInitialLinkDesc')}
                                    variables={[
                                        { key: "client_name", label: t('varClientName') },
                                        { key: "link", label: t('varLink') },
                                        { key: "count", label: t('varMaxPhotos') },
                                        { key: "password", label: t('varPassword') },
                                        { key: "duration", label: t('varDuration') },
                                        { key: "download_duration", label: t('varDownloadDuration') }
                                    ]}
                                    value={tmplLinkInitial}
                                    onChange={setTmplLinkInitial}
                                />

                                <MessageTemplateEditor
                                    title={t('tmplExtraLinkTitle')}
                                    description={t('tmplExtraLinkDesc')}
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
                                    variables={[
                                        { key: "client_name", label: t('varClientName') },
                                        { key: "count", label: t('varExtraCount') },
                                        { key: "list", label: t('varPhotoList') }
                                    ]}
                                    value={tmplResultExtra}
                                    onChange={setTmplResultExtra}
                                />

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
                            </div>
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

                <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
                    <p>{t('footer')} <a href="https://instagram.com/ryanekopram" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@ryanekopram</a> & <a href="https://instagram.com/ryaneko.apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@ryaneko.apps</a></p>
                </div>
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
                                } else {
                                    setDefaultDownloadExpiryDays(totalDays.toString())
                                    setCustomDefaultDownloadExpiryLabel(parts.join(' '))
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

