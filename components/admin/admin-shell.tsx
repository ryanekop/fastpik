"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { LogOut, Settings, User, LayoutDashboard, Crown, History } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { useTranslations, useLocale } from "next-intl"
import Link from "next/link"
import Image from "next/image"
import { WhatsNewPopup } from "./whats-new-popup"

interface Subscription {
    tier: string
    status: string
}

interface AdminShellProps {
    children: React.ReactNode
    latestChangelog?: any // Using any to avoid complex type import issues, or duplicate interface
}

export function AdminShell({ children, latestChangelog }: AdminShellProps) {
    const router = useRouter()
    const supabase = createClient()
    const t = useTranslations('Admin')
    const locale = useLocale()

    const [loading, setLoading] = useState(false)
    const [userEmail, setUserEmail] = useState<string | null>(null)
    const [userName, setUserName] = useState<string>("Admin")
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [subscription, setSubscription] = useState<Subscription | null>(null)

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUserEmail(user.email || null)
                // Extract name from email if no display name
                const name = user.user_metadata?.full_name || user.email?.split('@')[0] || "Admin"
                setUserName(name)

                // Get profile for avatar
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('avatar_url, full_name')
                    .eq('id', user.id)
                    .single()

                if (profile) {
                    setAvatarUrl(profile.avatar_url)
                    if (profile.full_name) setUserName(profile.full_name)
                }

                // Get subscription
                const { data: sub } = await supabase
                    .from('subscriptions')
                    .select('tier, status')
                    .eq('user_id', user.id)
                    .single()

                setSubscription(sub)
            }
        }
        getUser()
    }, [supabase])

    const handleLogout = async () => {
        setLoading(true)
        await supabase.auth.signOut()
        router.refresh()
        router.push(`/${locale}/dashboard/login`)
    }

    // Get initials from name
    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }

    const getMembershipBadge = () => {
        if (!subscription) return null

        const isLifetime = subscription.tier === 'lifetime'
        const isPro = subscription.tier.startsWith('pro_') || isLifetime

        if (isPro) {
            return (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium">
                    {isLifetime ? '👑' : '🔥'} Pro
                </span>
            )
        }
        return null
    }

    return (
        <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6 shadow-sm">
                <Link href={`/${locale}`} className="flex items-center gap-3 font-bold text-lg hover:opacity-80 transition-opacity cursor-pointer">
                    <Image src="/fastpik-logo.png" alt="Fastpik" width={28} height={28} className="rounded-md" />
                    Fastpik
                </Link>
                <div className="ml-auto flex items-center gap-4">
                    <LanguageToggle />
                    <ThemeToggle />
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
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium leading-none">{userName}</p>
                                        {getMembershipBadge()}
                                    </div>
                                    <p className="text-xs leading-none text-muted-foreground">
                                        {userEmail || "admin@example.com"}
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
                                <span>Dashboard</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/${locale}/pricing`)} className="cursor-pointer">
                                <Crown className="mr-2 h-4 w-4" />
                                <span>Paket</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/${locale}/dashboard/settings`)} className="cursor-pointer">
                                <Settings className="mr-2 h-4 w-4" />
                                <span>{t('settings')}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/${locale}/dashboard/changelog`)} className="cursor-pointer">
                                <History className="mr-2 h-4 w-4" />
                                <span>{t('changelog')}</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950 cursor-pointer">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>
            <main className="flex-1 p-6 md:p-8 bg-muted/20">
                <div className="mx-auto max-w-3xl">
                    {children}
                </div>
            </main>
            {latestChangelog && <WhatsNewPopup latestChangelog={latestChangelog} />}
        </div>
    )
}

