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

    // Message Templates State
    const [tmplLinkInitial, setTmplLinkInitial] = useState({ id: "", en: "" })
    const [tmplLinkExtra, setTmplLinkExtra] = useState({ id: "", en: "" })
    const [tmplResultInitial, setTmplResultInitial] = useState({ id: "", en: "" })
    const [tmplResultExtra, setTmplResultExtra] = useState({ id: "", en: "" })

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
                .single()

            if (data) {
                setDefaultAdminWhatsapp(data.default_admin_whatsapp || "")
                if (data.msg_tmpl_link_initial) setTmplLinkInitial(data.msg_tmpl_link_initial)
                if (data.msg_tmpl_link_extra) setTmplLinkExtra(data.msg_tmpl_link_extra)
                if (data.msg_tmpl_result_initial) setTmplResultInitial(data.msg_tmpl_result_initial)
                if (data.msg_tmpl_result_extra) setTmplResultExtra(data.msg_tmpl_result_extra)
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
                    msg_tmpl_link_initial: tmplLinkInitial,
                    msg_tmpl_link_extra: tmplLinkExtra,
                    msg_tmpl_result_initial: tmplResultInitial,
                    msg_tmpl_result_extra: tmplResultExtra,
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
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Message Templates Tab */}
                        <TabsContent value="templates" className="space-y-6">
                            <div className="space-y-6">
                                <MessageTemplateEditor
                                    title={t('tmplInitialLinkTitle')}
                                    description={t('tmplInitialLinkDesc')}
                                    variables={[
                                        { key: "client_name", label: t('varClientName') },
                                        { key: "link", label: t('varLink') },
                                        { key: "max_photos", label: t('varMaxPhotos') }
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
                                        { key: "count", label: t('varExtraCount') }
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
        </AdminShell>
    )
}

