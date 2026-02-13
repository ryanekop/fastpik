"use client"

import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { createClient } from "@/lib/supabase/client"
import {
    Loader2, LogOut, Settings, LayoutDashboard, User, Crown
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { User as SupabaseUser } from "@supabase/supabase-js"
import { useTranslations } from 'next-intl'



export function LandingNav() {
    const t = useTranslations('Index')
    const locale = useLocale()
    const router = useRouter()
    const supabase = createClient()
    const [isAuthenticating, setIsAuthenticating] = useState(false)
    const [user, setUser] = useState<SupabaseUser | null>(null)
    const [userName, setUserName] = useState<string>("Admin")
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const handleAuthRedirect = async () => {
            if (typeof window !== 'undefined' && window.location.hash) {
                const hashParams = new URLSearchParams(window.location.hash.substring(1))
                const accessToken = hashParams.get('access_token')
                if (accessToken) {
                    setIsAuthenticating(true)
                    router.push(`/${locale}/auth/callback${window.location.hash}`)
                    return
                }
            }
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUser(user)
                const name = user.user_metadata?.full_name || user.email?.split('@')[0] || "Admin"
                setUserName(name)
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('avatar_url, full_name')
                    .eq('id', user.id)
                    .single()
                if (profile) {
                    setAvatarUrl(profile.avatar_url)
                    if (profile.full_name) setUserName(profile.full_name)
                }
            }
        }
        handleAuthRedirect()
    }, [locale, supabase, router])

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }

    const handleLogout = async () => {
        setLoading(true)
        await supabase.auth.signOut()
        setUser(null)
        setAvatarUrl(null)
        router.refresh()
        setLoading(false)
    }

    if (isAuthenticating) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-muted/40">
                <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground">Authenticating...</p>
                </div>
            </div>
        )
    }

    return (
        <>
            {user ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 w-9 rounded-full bg-muted flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors overflow-hidden p-0">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="absolute inset-0 w-full h-full object-cover rounded-full" />
                            ) : (
                                <span className="text-xs font-medium">{getInitials(userName)}</span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{userName}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {user.email || "admin@example.com"}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => router.push(`/${locale}/dashboard/profile`)} className="cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            <span>Profil</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/${locale}/dashboard`)} className="cursor-pointer">
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            <span>{t('dashboard')}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/${locale}/pricing`)} className="cursor-pointer">
                            <Crown className="mr-2 h-4 w-4" />
                            <span>Paket</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/${locale}/dashboard/settings`)} className="cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>{t('settings')}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} disabled={loading} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950 cursor-pointer">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>{loading ? 'Logging out...' : 'Log out'}</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <Button variant="outline" asChild>
                    <Link href={`/${locale}/dashboard/login`}>{t('loginAdmin')}</Link>
                </Button>
            )}
        </>
    )
}

// Hero CTA buttons that depend on auth state
export function HeroCTA() {
    const t = useTranslations('Index')
    const locale = useLocale()
    const supabase = createClient()
    const [user, setUser] = useState<SupabaseUser | null>(null)

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user)
        })
    }, [supabase])

    return (
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            {user ? (
                <Button size="lg" asChild className="gap-2 cursor-pointer text-lg px-8">
                    <Link href={`/${locale}/dashboard`}>
                        🚀 {t('goToDashboard')} <ArrowRightIcon />
                    </Link>
                </Button>
            ) : (
                <>
                    <Button size="lg" asChild className="gap-2 cursor-pointer text-lg px-8">
                        <Link href={`/${locale}/dashboard/login`}>
                            🚀 {t('startManaging')} <ArrowRightIcon />
                        </Link>
                    </Button>
                    <Button size="lg" variant="outline" asChild className="gap-2 cursor-pointer text-lg px-8">
                        <Link href={`/${locale}/pricing`}>
                            💰 {t('viewPricing')}
                        </Link>
                    </Button>
                </>
            )}
        </div>
    )
}

// Bottom CTA that depends on auth state
export function BottomCTA() {
    const t = useTranslations('Index')
    const locale = useLocale()
    const supabase = createClient()
    const [user, setUser] = useState<SupabaseUser | null>(null)

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user)
        })
    }, [supabase])

    return (
        <Button size="lg" variant="secondary" asChild className="gap-2 text-lg px-8">
            <Link href={user ? `/${locale}/dashboard` : `/${locale}/dashboard/login`}>
                🎉 {t('ctaButton')} <ArrowRightIcon />
            </Link>
        </Button>
    )
}

function ArrowRightIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
        </svg>
    )
}
