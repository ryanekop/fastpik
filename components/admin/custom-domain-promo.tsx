"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useTranslations, useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { Globe, ArrowRight } from "lucide-react"

const DISMISS_KEY = 'fastpik_domain_promo_dismissed'
const DOMAIN_QUOTA_TOTAL = 10
const DOMAIN_QUOTA_USED = 8
const DOMAIN_QUOTA_REMAINING = 2
const DOMAIN_QUOTA_PROGRESS = (DOMAIN_QUOTA_USED / DOMAIN_QUOTA_TOTAL) * 100

export function CustomDomainPromo() {
    const t = useTranslations('Admin')
    const locale = useLocale()
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [dontShowAgain, setDontShowAgain] = useState(false)

    useEffect(() => {
        const dismissed = localStorage.getItem(DISMISS_KEY)
        if (dismissed === 'true') return

        const timer = setTimeout(() => setOpen(true), 500)
        return () => clearTimeout(timer)
    }, [])

    const handleClose = () => {
        setOpen(false)
        if (dontShowAgain) {
            localStorage.setItem(DISMISS_KEY, 'true')
        }
    }

    const handleViewDetail = () => {
        setOpen(false)
        if (dontShowAgain) {
            localStorage.setItem(DISMISS_KEY, 'true')
        }
        router.push(`/${locale}/dashboard/custom-domain`)
    }

    return (
        <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
            <DialogContent className="top-[calc(var(--global-announcement-height,0px)+env(safe-area-inset-top,0px)+0.5rem)] flex h-[calc(100dvh-var(--global-announcement-height,0px)-env(safe-area-inset-top,0px)-1rem)] max-h-[calc(100dvh-var(--global-announcement-height,0px)-env(safe-area-inset-top,0px)-1rem)] flex-col gap-0 translate-y-0 overflow-hidden p-4 sm:top-[50%] sm:h-auto sm:max-h-[85vh] sm:max-w-md sm:translate-y-[-50%] sm:p-6 [&>button]:right-3 [&>button]:top-3 sm:[&>button]:right-4 sm:[&>button]:top-4">
                <div className="flex min-h-0 flex-1 flex-col">
                    <DialogHeader className="shrink-0">
                        <div className="mb-2 flex items-center justify-center animate-[bounce-in_0.5s_ease-out] sm:mb-3">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground shadow-lg sm:h-16 sm:w-16">
                                <Globe className="h-7 w-7 text-background sm:h-8 sm:w-8" />
                            </div>
                        </div>
                        <DialogTitle className="text-center text-lg sm:text-xl">
                            🌐 {t('domainPromo.popupTitle')}
                        </DialogTitle>
                        <DialogDescription className="text-center text-sm sm:text-base">
                            {t('domainPromo.popupDesc')}
                        </DialogDescription>
                    </DialogHeader>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-1 pr-1 sm:space-y-3.5 sm:py-2">
                    <div className="space-y-2.5 sm:space-y-3">
                        {[
                            { icon: '🏷️', text: t('domainPromo.benefit1') },
                            { icon: '🔗', text: t('domainPromo.benefit2') },
                            { icon: '💼', text: t('domainPromo.benefit3') },
                        ].map((item, i) => (
                            <div
                                key={i}
                                className="flex items-start gap-2.5 text-[13px] animate-[fade-in-up_0.4s_ease-out_both] sm:gap-3 sm:text-sm"
                                style={{ animationDelay: `${i * 100 + 200}ms` }}
                            >
                                <span className="shrink-0 text-base">{item.icon}</span>
                                <span className="text-foreground/80">{item.text}</span>
                            </div>
                        ))}
                    </div>

                    <div className="animate-[fade-in-up_0.4s_ease-out_0.6s_both] rounded-lg border bg-muted p-3 text-center sm:p-3.5">
                        <p className="mb-1 text-xs text-muted-foreground">{t('domainPromo.startingFrom')}</p>
                        <p className="text-sm text-muted-foreground line-through">Rp 200.000</p>
                        <p className="text-xl font-bold text-foreground sm:text-2xl">
                            Rp 150.000
                        </p>
                        <p className="mt-1 text-xs font-semibold text-foreground/85">
                            {t('domainPromo.oneTimeAppliesBoth')}
                        </p>
                        <span className="mt-1 inline-block rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white animate-pulse">🔥 10 orang tercepat</span>
                        <p className="mt-1 text-xs text-muted-foreground">{t('domainPromo.setupFee')}</p>
                    </div>

                    <div className="rounded-lg border border-red-200/75 bg-red-50/70 px-3 py-2.5 dark:border-red-500/30 dark:bg-red-500/10">
                        <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-semibold sm:text-xs">
                            <span className="text-red-700 dark:text-red-200">
                                {t('domainPromo.quotaOwnedLabel', { count: DOMAIN_QUOTA_USED })}
                            </span>
                            <span className="text-right text-red-700 dark:text-red-200">
                                {t('domainPromo.quotaRemainingLabel', { count: DOMAIN_QUOTA_REMAINING })}
                            </span>
                        </div>
                        <div
                            className="h-2.5 w-full rounded-full bg-red-200/80 dark:bg-red-950/60"
                            role="progressbar"
                            aria-label={t('domainPromo.quotaProgressAria')}
                            aria-valuemin={0}
                            aria-valuemax={DOMAIN_QUOTA_TOTAL}
                            aria-valuenow={DOMAIN_QUOTA_USED}
                        >
                            <div
                                className="h-full rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.45)] animate-pulse [animation-duration:2.4s] [animation-timing-function:ease-in-out]"
                                style={{ width: `${DOMAIN_QUOTA_PROGRESS}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-3 shrink-0 border-t border-border/70 pt-3 sm:mt-4 sm:pt-4">
                    <div className="flex items-center space-x-2 py-0.5 sm:py-1">
                        <Checkbox id="dont-show-promo" checked={dontShowAgain} onCheckedChange={(c) => setDontShowAgain(!!c)} />
                        <Label htmlFor="dont-show-promo" className="cursor-pointer text-xs font-normal text-muted-foreground sm:text-sm">
                            {t('domainPromo.dontShowAgain')}
                        </Label>
                    </div>

                    <DialogFooter className="flex flex-col gap-2 sm:flex-row">
                        <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto cursor-pointer">
                            {t('close')}
                        </Button>
                        <Button onClick={handleViewDetail} className="w-full gap-2 sm:w-auto cursor-pointer">
                            {t('domainPromo.viewDetail')}
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </DialogFooter>
                </div>
                </div>

                <style jsx global>{`
                    @keyframes fade-in-up {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes bounce-in {
                        0% { opacity: 0; transform: scale(0.3); }
                        50% { transform: scale(1.05); }
                        70% { transform: scale(0.95); }
                        100% { opacity: 1; transform: scale(1); }
                    }
                `}</style>
            </DialogContent>
        </Dialog>
    )
}
