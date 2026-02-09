'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLocale, useTranslations } from 'next-intl'
import { AdminShell } from '@/components/admin/admin-shell'
import { AvatarUpload } from '@/components/admin/avatar-upload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Save, KeyRound, Crown, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Profile {
    id: string
    full_name: string | null
    avatar_url: string | null
}

interface Subscription {
    tier: string
    status: string
    end_date: string | null
    trial_end_date: string | null
}

interface TrialInfo {
    projectCount: number
    projectLimit: number
    daysRemaining: number | null
}

export default function ProfilePage() {
    const router = useRouter()
    const supabase = createClient()
    const locale = useLocale()
    const t = useTranslations('Profile')
    const tAdmin = useTranslations('Admin')

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const [email, setEmail] = useState('')
    const [name, setName] = useState('')
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [subscription, setSubscription] = useState<Subscription | null>(null)
    const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null)

    useEffect(() => {
        const loadProfile = async () => {
            try {
                // Get current user
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    router.push(`/${locale}/dashboard/login`)
                    return
                }

                setEmail(user.email || '')
                setName(user.user_metadata?.full_name || user.email?.split('@')[0] || '')

                // Get profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                if (profile) {
                    setName(profile.full_name || name)
                    setAvatarUrl(profile.avatar_url)
                }

                // Get subscription
                const { data: sub } = await supabase
                    .from('subscriptions')
                    .select('tier, status, end_date, trial_end_date')
                    .eq('user_id', user.id)
                    .single()

                setSubscription(sub)

                // Get trial info (project count)
                const { count: projectCount } = await supabase
                    .from('projects')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)

                // Calculate trial days remaining
                let daysRemaining = null
                if (sub?.status === 'trial' && sub?.trial_end_date) {
                    const trialEnd = new Date(sub.trial_end_date)
                    const now = new Date()
                    daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
                }

                setTrialInfo({
                    projectCount: projectCount || 0,
                    projectLimit: 3,
                    daysRemaining
                })
            } catch (err) {
                console.error('Failed to load profile:', err)
            } finally {
                setLoading(false)
            }
        }

        loadProfile()
    }, [supabase, router, locale])

    const handleSave = async () => {
        setSaving(true)
        setError(null)
        setSuccess(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Update user metadata
            const { error: authError } = await supabase.auth.updateUser({
                data: { full_name: name }
            })

            if (authError) throw authError

            // Update or insert profile
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    full_name: name,
                    updated_at: new Date().toISOString()
                })

            if (profileError) throw profileError

            setSuccess(t('saveSuccess'))
        } catch (err: any) {
            setError(err.message || t('saveError'))
        } finally {
            setSaving(false)
        }
    }

    const handleAvatarUpload = async (dataUrl: string | null) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                avatar_url: dataUrl,
                updated_at: new Date().toISOString()
            })

        if (error) {
            throw new Error(t('avatarError'))
        }

        setAvatarUrl(dataUrl)
    }

    const handleResetPassword = async () => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/${locale}/dashboard/reset-password`
        })

        if (error) {
            setError(error.message)
        } else {
            setSuccess(t('resetEmailSent'))
        }
    }

    const getTierDisplay = (tier: string) => {
        const tiers: Record<string, string> = {
            'free': 'Free',
            'pro_monthly': 'Pro (1 ' + t('month') + ')',
            'pro_quarterly': 'Pro (3 ' + t('months') + ')',
            'pro_yearly': 'Pro (1 ' + t('year') + ')',
            'lifetime': 'Pro Lifetime 👑'
        }
        return tiers[tier] || tier
    }

    const getStatusBadge = () => {
        if (!subscription) {
            return <span className="px-2 py-1 rounded-full text-xs bg-muted">Free Trial</span>
        }

        const isLifetime = subscription.tier === 'lifetime'
        const isPro = subscription.tier.startsWith('pro_') || isLifetime

        if (isPro) {
            return (
                <span className="px-2 py-1 rounded-full text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium">
                    {isLifetime ? '👑 Lifetime' : '🔥 Pro'}
                </span>
            )
        }

        return <span className="px-2 py-1 rounded-full text-xs bg-muted">Free</span>
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return t('foreverAccess')
        return new Date(dateStr).toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })
    }

    const isLifetime = subscription?.tier === 'lifetime'
    const isPro = subscription?.tier?.startsWith('pro_') || isLifetime
    const isTrial = subscription?.status === 'trial' || !subscription

    if (loading) {
        return (
            <AdminShell>
                <div className="flex justify-center p-12">
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
                        {tAdmin('backToList')}
                    </Link>
                </div>

                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            👤 {t('title')}
                        </h1>
                        <p className="text-muted-foreground">{t('description')}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardContent className="pt-6 space-y-6">
                            {/* Avatar */}
                            <AvatarUpload
                                currentAvatar={avatarUrl}
                                name={name}
                                onUpload={handleAvatarUpload}
                            />

                            {/* Name */}
                            <div className="space-y-2">
                                <Label htmlFor="name">{t('name')}</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t('namePlaceholder')}
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email">{t('email')}</Label>
                                <Input
                                    id="email"
                                    value={email}
                                    disabled
                                    className="bg-muted"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t('emailHint')}
                                </p>
                            </div>

                            {/* Membership Status */}
                            <div className="space-y-2">
                                <Label>{t('membershipStatus')}</Label>
                                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            {getStatusBadge()}
                                            <span className="font-medium">
                                                {subscription ? getTierDisplay(subscription.tier) : 'Free Trial'}
                                            </span>
                                        </div>
                                        {subscription && subscription.end_date && (
                                            <p className="text-xs text-muted-foreground">
                                                {t('validUntil')}: {formatDate(subscription.end_date)}
                                            </p>
                                        )}
                                        {isLifetime && (
                                            <p className="text-xs text-muted-foreground">
                                                {t('foreverAccess')} ✨
                                            </p>
                                        )}
                                    </div>
                                    {!isLifetime && (
                                        <Button size="sm" asChild className="cursor-pointer">
                                            <Link href={`/${locale}/pricing`}>
                                                {subscription && isPro ? (
                                                    <>
                                                        <RefreshCw className="h-4 w-4 mr-2" />
                                                        {t('changePlan')}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Crown className="h-4 w-4 mr-2" />
                                                        {t('upgrade')}
                                                    </>
                                                )}
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Trial Info - Only show for trial users */}
                            {isTrial && trialInfo && (
                                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="font-medium text-yellow-800 dark:text-yellow-400">
                                                {t('trialInfo')}
                                            </p>
                                            <p className="text-sm text-yellow-700 dark:text-yellow-500">
                                                {t('projectUsage', {
                                                    used: trialInfo.projectCount,
                                                    limit: trialInfo.projectLimit
                                                })}
                                            </p>
                                            {trialInfo.daysRemaining !== null && (
                                                <p className="text-sm text-yellow-700 dark:text-yellow-500">
                                                    {t('daysRemaining', { days: trialInfo.daysRemaining })}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Messages */}
                            {error && (
                                <div className="p-3 bg-destructive/15 text-destructive text-sm rounded-md">
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="p-3 bg-green-500/15 text-green-600 dark:text-green-400 text-sm rounded-md">
                                    {success}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-col gap-3">
                                <Button onClick={handleSave} disabled={saving} className="cursor-pointer">
                                    {saving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {t('saving')}
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            {t('save')}
                                        </>
                                    )}
                                </Button>
                                <Button variant="outline" onClick={handleResetPassword} className="cursor-pointer">
                                    <KeyRound className="mr-2 h-4 w-4" />
                                    {t('resetPassword')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminShell>
    )
}
