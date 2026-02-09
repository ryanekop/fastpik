"use client"

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { Check, Star, Zap, Crown, Infinity as InfinityIcon, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

// Map tier to plan nameKey
const tierToPlanMap: Record<string, string> = {
    'pro_monthly': 'plan1Month',
    'pro_quarterly': 'plan3Months',
    'pro_yearly': 'plan1Year',
    'lifetime': 'planLifetime'
}

export default function PricingPage() {
    const t = useTranslations('Pricing')
    const locale = useLocale()
    const supabase = createClient()
    const [currentTier, setCurrentTier] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadSubscription = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
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
                console.error('Failed to load subscription:', err)
            } finally {
                setLoading(false)
            }
        }
        loadSubscription()
    }, [supabase])

    const plans = [
        {
            nameKey: "plan1Month",
            price: "15rb",
            originalPrice: "45rb",
            durationKey: "perMonth",
            features: [
                "featureFullAccess",
                "featureUnlimitedProject",
                "featureUnlimitedPhotos",
                "featurePrioritySupport"
            ],
            link: "https://ryaneko.myr.id/m/fastpik-pro-access",
            popular: false,
            icon: Zap,
            isLifetime: false
        },
        {
            nameKey: "plan3Months",
            price: "39rb",
            originalPrice: "75rb",
            durationKey: "per3Months",
            features: [
                "featureSave15",
                "featureFullAccess",
                "featureUnlimitedProject",
                "featureUnlimitedPhotos",
                "featurePrioritySupport"
            ],
            link: "https://ryaneko.myr.id/m/fastpik-pro-access",
            popular: true,
            icon: Star,
            isLifetime: false
        },
        {
            nameKey: "plan1Year",
            price: "129rb",
            originalPrice: "275rb",
            durationKey: "perYear",
            features: [
                "featureSave50",
                "featureFullAccess",
                "featureUnlimitedProject",
                "featureUnlimitedPhotos",
                "featurePrioritySupport"
            ],
            link: "https://ryaneko.myr.id/m/fastpik-pro-access",
            popular: false,
            icon: Crown,
            isLifetime: false
        },
        {
            nameKey: "planLifetime",
            price: "349rb",
            originalPrice: "549rb",
            durationKey: "oneTime",
            features: [
                "featurePayOnce",
                "featureFullAccess",
                "featureUnlimitedProject",
                "featureUnlimitedPhotos",
                "featurePrioritySupport",
                "featureFutureUpdates"
            ],
            link: "https://ryaneko.myr.id/m/fastpik-pro-access",
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
                <Link href={`/${locale}`} className="font-bold text-xl tracking-tight flex items-center gap-2 hover:opacity-80 transition-opacity">
                    📸 Fastpik
                </Link>
                <div className="flex items-center gap-2">
                    <LanguageToggle />
                    <ThemeToggle />
                    <Button variant="outline" asChild>
                        <Link href={`/${locale}/dashboard/login`}>{t('loginButton')}</Link>
                    </Button>
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
                            {t('trialDescription', { count: 15, days: 3, projects: 3 })}
                        </p>
                    </div>
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
                                        <Badge className="bg-green-500 text-white px-3 py-1">✓ {t('currentPlan')}</Badge>
                                    </div>
                                )}
                                <CardHeader>
                                    <div className="flex items-center gap-2 mb-2">
                                        <plan.icon className={cn("h-5 w-5", plan.popular ? "text-primary" : "text-muted-foreground")} />
                                        <CardTitle className="text-xl">{t(plan.nameKey)}</CardTitle>
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-muted-foreground line-through">{plan.originalPrice}</span>
                                            <span className="text-3xl font-bold">{plan.price}</span>
                                        </div>
                                        <span className="text-muted-foreground text-sm mb-1">{t(plan.durationKey)}</span>
                                    </div>
                                    <CardDescription>
                                        {plan.isLifetime ? t('billingOnce') : t('billingAuto')}
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
            </main>

            <footer className="py-6 border-t text-center text-sm text-muted-foreground">
                <p>
                    Made with ❤️ from <a href="https://instagram.com/ryanekopram" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@ryanekopram</a> & <a href="https://instagram.com/ryaneko.apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@ryaneko.apps</a>
                </p>
            </footer>
        </div>
    )
}
