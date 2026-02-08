"use client"

import { useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from "framer-motion"
import { createClient } from "@/lib/supabase/client"

export default function Home() {
  const t = useTranslations('Index')
  const locale = useLocale()
  const router = useRouter()
  const supabase = createClient()

  // Check for auth tokens in URL hash (from invite, recovery, magiclink)
  // If found, redirect to auth/callback to process them
  useEffect(() => {
    const handleAuthRedirect = async () => {
      // Check if there are auth tokens in the URL hash
      if (typeof window !== 'undefined' && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const type = hashParams.get('type')

        // If there's an access token, redirect to auth/callback with the hash
        if (accessToken) {
          router.push(`/${locale}/auth/callback${window.location.hash}`)
          return
        }
      }

      // Otherwise, check if user is already logged in and redirect to dashboard
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push(`/${locale}/dashboard`)
      }
    }
    handleAuthRedirect()
  }, [locale])

  return (
    <div className="flex flex-col min-h-screen font-[family-name:var(--font-geist-sans)]">
      <header className="flex items-center justify-between p-4 border-b">
        <Link href={`/${locale}`} className="font-bold text-xl tracking-tight flex items-center gap-2 hover:opacity-80 transition-opacity">
          📸 Fastpik
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          <Button variant="outline" asChild>
            <Link href={`/${locale}/dashboard/login`}>{t('loginAdmin')}</Link>
          </Button>
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
            <Button size="lg" asChild className="gap-2 cursor-pointer hover:opacity-90 transition-opacity">
              <Link href={`/${locale}/dashboard/login`}>
                {t('startManaging')} 🚀
              </Link>
            </Button>
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
