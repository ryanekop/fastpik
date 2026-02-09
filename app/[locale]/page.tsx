"use client"

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import {
  Loader2, LogOut, Settings, LayoutDashboard, User, Crown,
  Link2, Images, Zap, Smartphone, Moon, Lock,
  FolderPlus, Share2, CheckCircle2, ArrowRight, Sparkles
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

const features = [
  { icon: Link2, titleKey: 'feature1Title', descKey: 'feature1Desc', color: 'text-blue-500' },
  { icon: Images, titleKey: 'feature2Title', descKey: 'feature2Desc', color: 'text-green-500' },
  { icon: Zap, titleKey: 'feature3Title', descKey: 'feature3Desc', color: 'text-yellow-500' },
  { icon: Smartphone, titleKey: 'feature4Title', descKey: 'feature4Desc', color: 'text-purple-500' },
  { icon: Moon, titleKey: 'feature5Title', descKey: 'feature5Desc', color: 'text-indigo-500' },
  { icon: Lock, titleKey: 'feature6Title', descKey: 'feature6Desc', color: 'text-red-500' },
]

const steps = [
  { icon: FolderPlus, titleKey: 'step1Title', descKey: 'step1Desc', step: '1' },
  { icon: Share2, titleKey: 'step2Title', descKey: 'step2Desc', step: '2' },
  { icon: CheckCircle2, titleKey: 'step3Title', descKey: 'step3Desc', step: '3' },
]

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
    <div className="flex flex-col min-h-screen font-[family-name:var(--font-geist-sans)]">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-sm">
        <Link href={`/${locale}`} className="font-bold text-xl tracking-tight flex items-center gap-2 hover:opacity-80 transition-opacity">
          📸 Fastpik
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />

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
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background via-muted/30 to-background py-20 sm:py-32">
        <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6 max-w-4xl mx-auto"
          >
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="h-3 w-3 mr-1" />
              {t('heroTagline')}
            </Badge>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight">
              {t('title')}
              <span className="block text-primary mt-2">{t('subtitle')}</span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('description')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              {user ? (
                <Button size="lg" asChild className="gap-2 cursor-pointer text-lg px-8">
                  <Link href={`/${locale}/dashboard`}>
                    🚀 {t('goToDashboard')} <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button size="lg" asChild className="gap-2 cursor-pointer text-lg px-8">
                    <Link href={`/${locale}/dashboard/login`}>
                      🚀 {t('startManaging')} <ArrowRight className="h-5 w-5" />
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

            <p className="text-sm text-muted-foreground pt-4">
              ✨ {t('trustedBy')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('featuresTitle')}</h2>
            <p className="text-muted-foreground text-lg">{t('featuresSubtitle')}</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.titleKey}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className={`h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4`}>
                        <Icon className={`h-6 w-6 ${feature.color}`} />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{t(feature.titleKey)}</h3>
                      <p className="text-muted-foreground">{t(feature.descKey)}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('workflowTitle')}</h2>
            <p className="text-muted-foreground text-lg">{t('workflowSubtitle')}</p>
          </motion.div>

          <div className="flex flex-col md:flex-row gap-8 justify-center items-center max-w-4xl mx-auto">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 }}
                  className="flex flex-col items-center text-center flex-1"
                >
                  <div className="relative">
                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-10 w-10 text-primary" />
                    </div>
                    <span className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                      {step.step}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{t(step.titleKey)}</h3>
                  <p className="text-muted-foreground text-sm">{t(step.descKey)}</p>

                  {index < steps.length - 1 && (
                    <ArrowRight className="hidden md:block h-6 w-6 text-muted-foreground absolute right-0 top-1/2 -translate-y-1/2" />
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section className="py-20 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('pricingTitle')}</h2>
            <p className="text-muted-foreground text-lg mb-8">{t('pricingSubtitle')}</p>

            <Button size="lg" variant="outline" asChild className="gap-2">
              <Link href={`/${locale}/pricing`}>
                👀 {t('pricingCta')} <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto bg-primary rounded-3xl p-8 sm:p-12 text-primary-foreground"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('ctaTitle')}</h2>
            <p className="text-primary-foreground/80 text-lg mb-8">{t('ctaSubtitle')}</p>

            <Button size="lg" variant="secondary" asChild className="gap-2 text-lg px-8">
              <Link href={user ? `/${locale}/dashboard` : `/${locale}/dashboard/login`}>
                🎉 {t('ctaButton')} <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t text-center text-sm text-muted-foreground">
        <p>
          {t('footerMadeWith')} <a href="https://instagram.com/ryanekopram" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@ryanekopram</a> & <a href="https://instagram.com/ryaneko.apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@ryaneko.apps</a>
        </p>
      </footer>
    </div>
  )
}
