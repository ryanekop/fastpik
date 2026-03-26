"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useTranslations } from "next-intl"
import { Rocket, Sparkles, Wrench } from "lucide-react"

interface ChangelogItem {
    category: string
    items: string[]
}

interface Changelog {
    id: string
    version: string
    releaseDate: string
    changes: ChangelogItem[]
}

interface WhatsNewPopupProps {
    latestChangelog: Changelog | null
}

export function WhatsNewPopup({ latestChangelog }: WhatsNewPopupProps) {
    const t = useTranslations('Admin')
    const [open, setOpen] = useState(false)
    const [dontShowAgain, setDontShowAgain] = useState(false)

    useEffect(() => {
        if (!latestChangelog) return

        const seenVersion = localStorage.getItem('fastpik_seen_version')
        if (seenVersion !== latestChangelog.version) {
            // Delay slightly for better UX
            const timer = setTimeout(() => setOpen(true), 1000)
            return () => clearTimeout(timer)
        }
    }, [latestChangelog])

    const handleClose = () => {
        setOpen(false)
        if (dontShowAgain && latestChangelog) {
            localStorage.setItem('fastpik_seen_version', latestChangelog.version)
        }
    }

    if (!latestChangelog) return null

    const getIcon = (category: string) => {
        const catLower = category.toLowerCase()
        if (catLower.includes('feature') || catLower.includes('fitur') || catLower.includes('new')) return <Sparkles className="h-4 w-4 text-amber-500" />
        if (catLower.includes('fix') || catLower.includes('perbaikan')) return <Wrench className="h-4 w-4 text-blue-500" />
        return <Rocket className="h-4 w-4 text-green-500" />
    }

    return (
        <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
            <DialogContent className="top-[calc(var(--global-announcement-height,0px)+env(safe-area-inset-top,0px)+0.5rem)] max-h-[calc(100dvh-var(--global-announcement-height,0px)-env(safe-area-inset-top,0px)-1rem)] translate-y-0 overflow-hidden p-4 sm:top-[50%] sm:max-h-[85vh] sm:max-w-md sm:translate-y-[-50%] sm:p-6 [&>button]:right-3 [&>button]:top-3 sm:[&>button]:right-4 sm:[&>button]:top-4">
                <DialogHeader className="mb-0 gap-1">
                    <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">v{latestChangelog.version}</Badge>
                        <span className="text-xs text-muted-foreground" suppressHydrationWarning>{new Date(latestChangelog.releaseDate).toLocaleDateString()}</span>
                    </div>
                    <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                        🎉 {t('whatsNew')}
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                        Update terbaru Fastpik telah hadir! Berikut adalah penambahan dan perbaikan yang kami lakukan.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[min(270px,40dvh)] rounded-md border bg-muted/20 p-3 pr-3 sm:h-[300px] sm:p-4 sm:pr-4">
                    <div className="space-y-6">
                        {latestChangelog.changes.map((group, idx) => (
                            <div key={idx} className="space-y-3">
                                <h4 className="font-semibold text-sm flex items-center gap-2 uppercase tracking-wide text-muted-foreground">
                                    {getIcon(group.category)}
                                    {group.category}
                                </h4>
                                <ul className="space-y-2">
                                    {group.items.map((item, itemIdx) => (
                                        <li key={itemIdx} className="text-sm flex items-start gap-2 leading-relaxed">
                                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <div className="flex items-center space-x-2 py-1 sm:py-2">
                    <Checkbox id="dont-show" checked={dontShowAgain} onCheckedChange={(c) => setDontShowAgain(!!c)} />
                    <Label htmlFor="dont-show" className="cursor-pointer text-xs font-normal text-muted-foreground sm:text-sm">
                        {t('dontShowAgain')}
                    </Label>
                </div>

                <DialogFooter className="sm:justify-between gap-2">
                    <Button onClick={handleClose} className="w-full">
                        {t('close')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
