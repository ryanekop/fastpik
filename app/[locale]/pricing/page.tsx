"use client"

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import Image from 'next/image'
import { Check, Star, Zap, Crown, Infinity as InfinityIcon, LogOut, Settings, LayoutDashboard, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { User as SupabaseUser } from "@supabase/supabase-js"
import { useTenant } from "@/lib/tenant-context"

// Map tier to plan nameKey
const tierToPlanMap: Record<string, string> = {
    'pro_monthly': 'plan1Month',
    'pro_quarterly': 'plan3Months',
    'pro_yearly': 'plan1Year',
    'lifetime': 'planLifetime'
}

type PricingMode = "single" | "bundle"

const FASTPIK_CHECKOUT_LINK = "https://ryaneko.myr.id/m/fastpik-pro-access"
const BUNDLE_CHECKOUT_LINK = "https://ryaneko.myr.id/m/bundling-client-desk-fastpik/"

export default function PricingPage() {
    const t = useTranslations('Pricing')
    const tIndex = useTranslations('Index')
    const locale = useLocale()
    const router = useRouter()
    const supabase = createClient()
    const [currentTier, setCurrentTier] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<SupabaseUser | null>(null)
    const [userName, setUserName] = useState<string>("Admin")
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [pricingMode, setPricingMode] = useState<PricingMode>("single")
    const tenant = useTenant()

    useEffect(() => {
        const loadData = async () => {
            try {
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

                    // Get subscription
                    const { data: sub } = await supabase
                        .from('subscriptions')
                        .select('tier, status')
                        .eq('user_id', user.id)
                        .single()

                    if (sub && sub.status === 'active') {
                        setCurrentTier(sub.tier)
                    }
                }
            } catch (err) {
                console.error('Failed to load data:', err)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [supabase])

    // Get initials from name
    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        setUser(null)
        setAvatarUrl(null)
        router.refresh()
    }

    const fastpikCoreFeatures = [
        "featureFullAccess",
        "featureUnlimitedProject",
        "featureUnlimitedPhotos",
        "featurePrioritySupport"
    ]

    const bundleExtraFeatures = pricingMode === "bundle"
        ? ["featureBundleAllClientDesk", "featureBundleSyncClientDesk"]
        : []

    const plans = [
        {
            nameKey: "plan1Month",
            price: pricingMode === "bundle" ? "49rb" : "15rb",
            originalPrice: pricingMode === "bundle" ? null : "45rb",
            durationKey: "perMonth",
            features: pricingMode === "bundle" ? [
                "featureBundleIncludesBoth",
                ...bundleExtraFeatures,
                ...fastpikCoreFeatures
            ] : [
                "coffeePrice",
                ...fastpikCoreFeatures
            ],
            link: pricingMode === "bundle" ? BUNDLE_CHECKOUT_LINK : FASTPIK_CHECKOUT_LINK,
            popular: false,
            icon: Zap,
            isLifetime: false
        },
        {
            nameKey: "plan3Months",
            price: pricingMode === "bundle" ? "125rb" : "39rb",
            originalPrice: pricingMode === "bundle" ? null : "75rb",
            durationKey: "per3Months",
            features: [
                pricingMode === "bundle" ? "featureBundlePerMonth3" : "featureSave15",
                ...bundleExtraFeatures,
                ...fastpikCoreFeatures
            ],
            link: pricingMode === "bundle" ? BUNDLE_CHECKOUT_LINK : FASTPIK_CHECKOUT_LINK,
            popular: false,
            icon: Star,
            isLifetime: false
        },
        {
            nameKey: "plan1Year",
            price: pricingMode === "bundle" ? "399rb" : "129rb",
            originalPrice: pricingMode === "bundle" ? null : "275rb",
            durationKey: "perYear",
            features: [
                pricingMode === "bundle" ? "featureBundlePerMonth12" : "featureSave50",
                ...bundleExtraFeatures,
                ...fastpikCoreFeatures
            ],
            link: pricingMode === "bundle" ? BUNDLE_CHECKOUT_LINK : FASTPIK_CHECKOUT_LINK,
            popular: true,  // Changed to true - 1 Year is now popular
            icon: Crown,
            isLifetime: false
        },
        {
            nameKey: "planLifetime",
            price: pricingMode === "bundle" ? "749rb" : "349rb",
            originalPrice: pricingMode === "bundle" ? null : "549rb",
            durationKey: "oneTime",
            features: pricingMode === "bundle" ? [
                "featurePayOnce",
                ...bundleExtraFeatures,
                "featureBundleIncludesBoth",
                ...fastpikCoreFeatures,
                "featureFutureUpdates"
            ] : [
                "featurePayOnce",
                ...fastpikCoreFeatures,
                "featureFutureUpdates"
            ],
            link: pricingMode === "bundle" ? BUNDLE_CHECKOUT_LINK : FASTPIK_CHECKOUT_LINK,
            popular: false,
            icon: InfinityIcon,
            isLifetime: true
        }
    ]

    // Check if a plan is the current plan
    const isCurrentPlan = (planNameKey: string) => {
        if (!currentTier) return false
        return tierToPlanMap[currentTier] === planNameKey
    }

    return (
        <div className="flex flex-col min-h-screen font-[family-name:var(--font-geist-sans)]">
            <header className="flex items-center justify-between p-4 border-b">
                <Link href={`/${locale}`} className="font-bold text-xl tracking-tight flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <Image src={tenant.logoUrl} alt={tenant.name} width={28} height={28} className="rounded-md" />
                    {tenant.name}
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
                                    <span>{tIndex('dashboard')}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/${locale}/pricing`)} className="cursor-pointer">
                                    <Crown className="mr-2 h-4 w-4" />
                                    <span>Paket</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/${locale}/dashboard/settings`)} className="cursor-pointer">
                                    <Settings className="mr-2 h-4 w-4" />
                                    <span>{tIndex('settings')}</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950 cursor-pointer">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        // Show login button when not logged in
                        <Button variant="outline" asChild>
                            <Link href={`/${locale}/dashboard/login`}>{t('loginButton')}</Link>
                        </Button>
                    )}
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-16">
                <div className="text-center space-y-4 mb-16">
                    <Badge variant="secondary" className="mb-4">{t('specialOffer')}</Badge>
                    <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
                        {t('pageTitle').split('Fastpik Pro')[0]}
                        <span className="text-primary">Fastpik Pro</span>
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        {t('pageDescription')}
                    </p>

                    <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 max-w-3xl mx-auto mt-8">
                        <h3 className="font-bold text-yellow-600 dark:text-yellow-400 flex items-center justify-center gap-2">
                            <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                            {t('trialTitle')}
                        </h3>
                        <p className="text-muted-foreground mt-2">
                            {t('trialDescription', { days: 5, projects: 3 })}
                        </p>
                    </div>
                </div>

                <div className="mb-10 flex flex-col items-center gap-3">
                    <div className="inline-flex items-center rounded-full border bg-muted p-1">
                        <button
                            type="button"
                            onClick={() => setPricingMode("single")}
                            className={cn(
                                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                                pricingMode === "single"
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {t("modeSingleLabel")}
                        </button>
                        <button
                            type="button"
                            onClick={() => setPricingMode("bundle")}
                            className={cn(
                                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                                pricingMode === "bundle"
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {t("modeBundleLabel")}
                        </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {t("crossProductHint")}{" "}
                        <a
                            href={`https://clientdesk.ryanekoapp.web.id/${locale}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline"
                        >
                            {t("crossProductLinkLabel")}
                        </a>
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
                    {plans.map((plan) => {
                        const isCurrent = isCurrentPlan(plan.nameKey)
                        return (
                            <Card key={plan.nameKey} className={cn(
                                "flex flex-col relative",
                                plan.popular ? "border-primary shadow-lg scale-105 z-10" : "border-border",
                                isCurrent && "ring-2 ring-green-500 border-green-500"
                            )}>
                                {plan.popular && !isCurrent && (
                                    <div className="absolute -top-4 left-0 right-0 flex justify-center">
                                        <Badge className="bg-primary text-primary-foreground px-3 py-1">{t('mostPopular')}</Badge>
                                    </div>
                                )}
                                {isCurrent && (
                                    <div className="absolute -top-4 left-0 right-0 flex justify-center">
                                        <Badge className="bg-green-500 text-white px-3 py-1 flex items-center gap-1.5">
                                            <Check className="h-3.5 w-3.5" />
                                            {t('currentPlan')}
                                        </Badge>
                                    </div>
                                )}
                                <CardHeader>
                                    <div className="flex items-center gap-2 mb-2">
                                        <plan.icon className={cn("h-5 w-5", plan.popular ? "text-primary" : "text-muted-foreground")} />
                                        <CardTitle className="text-xl">{t(plan.nameKey)}</CardTitle>
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <div className="flex flex-col">
                                            {plan.originalPrice ? (
                                                <span className="text-xs text-muted-foreground line-through">{plan.originalPrice}</span>
                                            ) : null}
                                            <span className="text-3xl font-bold">{plan.price}</span>
                                        </div>
                                        <span className="text-muted-foreground text-sm mb-1">{t(plan.durationKey)}</span>
                                    </div>
                                    <CardDescription>
                                        {plan.isLifetime ? t('billingOnce') : t('billingManualRenew')}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <ul className="space-y-3">
                                        {plan.features.map((featureKey) => (
                                            <li key={featureKey} className="flex items-center gap-2">
                                                <Check className="h-4 w-4 text-green-500 shrink-0" />
                                                <span className="text-sm text-muted-foreground">{t(featureKey)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <CardFooter>
                                    {isCurrent ? (
                                        <Button className="w-full" variant="outline" disabled>
                                            <Check className="h-4 w-4 mr-2" />
                                            {t('currentPlan')}
                                        </Button>
                                    ) : (
                                        <Button className="w-full cursor-pointer" variant={plan.popular ? "default" : "outline"} asChild>
                                            <a href={plan.link} target="_blank" rel="noopener noreferrer">
                                                {t('selectPlan')}
                                            </a>
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>

                <div className="mt-16 text-center">
                    <p className="text-muted-foreground text-sm">
                        {t('paymentNote')}
                        <br />
                        {t('paymentMethods')}
                    </p>
                </div>

                {/* CTA Register Section — shown to guest users only */}
                {!user && !loading && (
                    <div className="mt-16 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-10 text-center max-w-2xl mx-auto space-y-5">
                        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full border border-primary/20">
                            <Star className="h-4 w-4 fill-primary text-primary" />
                            Gratis 5 Hari, Tanpa Kartu Kredit
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight">
                            Coba Fastpik Pro Sekarang — Gratis!
                        </h2>
                        <p className="text-muted-foreground">
                            Buat akun dalam 30 detik dan langsung nikmati semua fitur Pro selama <strong>5 hari penuh</strong>. Tidak perlu kartu kredit, tidak ada syarat tersembunyi.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                            <Button size="lg" className="gap-2 text-base font-semibold px-8" asChild>
                                <Link href={`/${locale}/dashboard/register`}>
                                    🚀 Buat Akun Gratis
                                </Link>
                            </Button>
                            <Button size="lg" variant="outline" className="gap-2 text-base" asChild>
                                <Link href={`/${locale}/dashboard/login`}>
                                    Sudah punya akun? Login
                                </Link>
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground pt-1">
                            ✅ Trial 5 hari &nbsp;·&nbsp; ✅ Akses penuh semua fitur &nbsp;·&nbsp; ✅ Tanpa kartu kredit
                        </p>
                    </div>
                )}
            </main>

            <footer className="py-6 border-t text-center text-sm text-muted-foreground">
                <p>
                    {tenant.footerText ? (
                        <span dangerouslySetInnerHTML={{ __html: tenant.footerText }} />
                    ) : (
                        <>
                            Made with ❤️ from <a href="https://instagram.com/ryanekopram" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@ryanekopram</a> & <a href="https://instagram.com/ryanekoapps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@ryanekoapps</a>
                        </>
                    )}
                </p>
            </footer>
        </div>
    )
}
