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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Save, KeyRound, Crown, ArrowLeft } from 'lucide-react'
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
}

export default function ProfilePage() {
    const router = useRouter()
    const supabase = createClient()
    const locale = useLocale()
    const t = useTranslations('Profile')

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const [email, setEmail] = useState('')
    const [name, setName] = useState('')
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [subscription, setSubscription] = useState<Subscription | null>(null)

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
                    .select('tier, status, end_date')
                    .eq('user_id', user.id)
                    .single()

                setSubscription(sub)
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

            setSuccess('Profil berhasil disimpan!')
        } catch (err: any) {
            setError(err.message || 'Gagal menyimpan profil')
        } finally {
            setSaving(false)
        }
    }

    const handleAvatarUpload = async (dataUrl: string) => {
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
            throw new Error('Gagal menyimpan foto profil')
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
            setSuccess('Link reset password telah dikirim ke email Anda.')
        }
    }

    const getTierDisplay = (tier: string) => {
        const tiers: Record<string, string> = {
            'free': 'Free',
            'pro_monthly': 'Pro (1 Bulan)',
            'pro_quarterly': 'Pro (3 Bulan)',
            'pro_yearly': 'Pro (1 Tahun)',
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
        if (!dateStr) return 'Selamanya'
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })
    }

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
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={`/${locale}/dashboard`}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Kembali
                        </Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">👤 Profil Saya</CardTitle>
                        <CardDescription>Kelola informasi akun Anda</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Avatar */}
                        <AvatarUpload
                            currentAvatar={avatarUrl}
                            name={name}
                            onUpload={handleAvatarUpload}
                        />

                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">Nama</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Nama Anda"
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                value={email}
                                disabled
                                className="bg-muted"
                            />
                            <p className="text-xs text-muted-foreground">
                                Email tidak dapat diubah
                            </p>
                        </div>

                        {/* Membership Status */}
                        <div className="space-y-2">
                            <Label>Status Membership</Label>
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
                                            Berlaku sampai: {formatDate(subscription.end_date)}
                                        </p>
                                    )}
                                    {subscription?.tier === 'lifetime' && (
                                        <p className="text-xs text-muted-foreground">
                                            Akses selamanya ✨
                                        </p>
                                    )}
                                </div>
                                {(!subscription || subscription.tier === 'free') && (
                                    <Button size="sm" asChild>
                                        <Link href={`/${locale}/pricing`}>
                                            <Crown className="h-4 w-4 mr-2" />
                                            Upgrade
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>

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
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Simpan Perubahan
                                    </>
                                )}
                            </Button>
                            <Button variant="outline" onClick={handleResetPassword}>
                                <KeyRound className="mr-2 h-4 w-4" />
                                Reset Password
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminShell>
    )
}
