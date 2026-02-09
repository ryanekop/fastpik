"use client"

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { Loader2, LogOut, Settings, LayoutDashboard, User, Crown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { User as SupabaseUser } from "@supabase/supabase-js"

export default function Home() {
  const t = useTranslations('Index')
  const locale = useLocale()
  const router = useRouter()
  const supabase = createClient()
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [userName, setUserName] = useState<string>("Admin")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Check for auth tokens in URL hash (from invite, recovery, magiclink)
  // If found, redirect to auth/callback to process them
  useEffect(() => {
    const handleAuthRedirect = async () => {
      // Check if there are auth tokens in the URL hash
      if (typeof window !== 'undefined' && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')

        // If there's an access token, show loading and redirect to auth/callback
        if (accessToken) {
          setIsAuthenticating(true)
          router.push(`/${locale}/auth/callback${window.location.hash}`)
          return
        }
      }

      // Check if user is logged in (but don't redirect, just update state)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
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
      }
    }
    handleAuthRedirect()
  }, [locale, supabase, router])

  // Get initials from name
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

  // Show loading screen when processing auth tokens
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
    <div className="flex flex-col min-h-screen font-[family-name:var(--font-geist-sans)]">
      <header className="flex items-center justify-between p-4 border-b">
        <Link href={`/${locale}`} className="font-bold text-xl tracking-tight flex items-center gap-2 hover:opacity-80 transition-opacity">
          📸 Fastpik
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />

          {user ? (
            // Show profile dropdown when logged in
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
            // Show login button when not logged in
            <Button variant="outline" asChild>
              <Link href={`/${locale}/dashboard/login`}>{t('loginAdmin')}</Link>
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 gap-8 bg-muted/20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 max-w-2xl"
        >
          <h1 className="text-5xl font-extrabold tracking-tight lg:text-7xl">
            {t('title')}
          </h1>
          <p className="text-xl text-muted-foreground">
            {t('description')}
          </p>
          <div className="pt-4">
            {user ? (
              <Button size="lg" asChild className="gap-2 cursor-pointer hover:opacity-90 transition-opacity">
                <Link href={`/${locale}/dashboard`}>
                  {t('goToDashboard')} 🚀
                </Link>
              </Button>
            ) : (
              <Button size="lg" asChild className="gap-2 cursor-pointer hover:opacity-90 transition-opacity">
                <Link href={`/${locale}/dashboard/login`}>
                  {t('startManaging')} 🚀
                </Link>
              </Button>
            )}
          </div>
        </motion.div>
      </main>

      <footer className="py-6 border-t text-center text-sm text-muted-foreground">
        <p>
          Made with ❤️ from <a href="https://instagram.com/ryanekopram" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@ryanekopram</a> & <a href="https://instagram.com/ryaneko.apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@ryaneko.apps</a>
        </p>
      </footer>
    </div>
  )
}
