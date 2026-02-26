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
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center justify-center mb-3 animate-[bounce-in_0.5s_ease-out]">
                        <div className="w-16 h-16 rounded-2xl bg-foreground flex items-center justify-center shadow-lg">
                            <Globe className="h-8 w-8 text-background" />
                        </div>
                    </div>
                    <DialogTitle className="text-xl text-center">
                        🌐 {t('domainPromo.popupTitle')}
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        {t('domainPromo.popupDesc')}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                    {[
                        { icon: '🏷️', text: t('domainPromo.benefit1') },
                        { icon: '🔗', text: t('domainPromo.benefit2') },
                        { icon: '💼', text: t('domainPromo.benefit3') },
                    ].map((item, i) => (
                        <div
                            key={i}
                            className="flex items-start gap-3 text-sm animate-[fade-in-up_0.4s_ease-out_both]"
                            style={{ animationDelay: `${i * 100 + 200}ms` }}
                        >
                            <span className="text-base shrink-0">{item.icon}</span>
                            <span className="text-foreground/80">{item.text}</span>
                        </div>
                    ))}
                </div>

                <div className="rounded-lg bg-muted border p-3 text-center animate-[fade-in-up_0.4s_ease-out_0.6s_both]">
                    <p className="text-xs text-muted-foreground mb-1">{t('domainPromo.startingFrom')}</p>
                    <p className="text-2xl font-bold text-foreground">
                        Rp 200.000
                    </p>
                    <p className="text-xs text-muted-foreground">{t('domainPromo.setupFee')}</p>
                </div>

                <div className="flex items-center space-x-2 py-1">
                    <Checkbox id="dont-show-promo" checked={dontShowAgain} onCheckedChange={(c) => setDontShowAgain(!!c)} />
                    <Label htmlFor="dont-show-promo" className="text-sm font-normal text-muted-foreground cursor-pointer">
                        {t('domainPromo.dontShowAgain')}
                    </Label>
                </div>

                <DialogFooter className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto cursor-pointer">
                        {t('close')}
                    </Button>
                    <Button onClick={handleViewDetail} className="w-full sm:w-auto gap-2 cursor-pointer">
                        {t('domainPromo.viewDetail')}
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </DialogFooter>

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
