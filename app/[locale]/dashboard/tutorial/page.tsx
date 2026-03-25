"use client"

import { useTranslations, useLocale } from "next-intl"
import { ArrowLeft, FolderPlus, Share2, CheckCircle2, Settings, FileSpreadsheet, Lightbulb, BookOpen } from "lucide-react"
import Link from "next/link"
import { AdminShell } from "@/components/admin/admin-shell"
import { Card, CardContent } from "@/components/ui/card"
import { useTenant } from "@/lib/tenant-context"
import { shouldHideTenantBranding } from "@/lib/tenant-branding"

const tutorialSteps = [
    {
        titleKey: "step1Title",
        descKey: "step1Desc",
        detailKeys: ["step1Detail1", "step1Detail2", "step1Detail3", "step1Detail4", "step1Detail5", "step1Detail6"],
        icon: FolderPlus,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
    },
    {
        titleKey: "step2Title",
        descKey: "step2Desc",
        detailKeys: ["step2Detail1", "step2Detail2", "step2Detail3", "step2Detail4"],
        icon: Share2,
        color: "text-green-500",
        bgColor: "bg-green-500/10",
    },
    {
        titleKey: "step3Title",
        descKey: "step3Desc",
        detailKeys: ["step3Detail1", "step3Detail2", "step3Detail3", "step3Detail4"],
        icon: CheckCircle2,
        color: "text-purple-500",
        bgColor: "bg-purple-500/10",
    },
    {
        titleKey: "step4Title",
        descKey: "step4Desc",
        detailKeys: ["step4Detail1", "step4Detail2", "step4Detail3", "step4Detail4"],
        icon: Settings,
        color: "text-orange-500",
        bgColor: "bg-orange-500/10",
    },
    {
        titleKey: "step5Title",
        descKey: "step5Desc",
        detailKeys: ["step5Detail1", "step5Detail2", "step5Detail3", "step5Detail4"],
        icon: FileSpreadsheet,
        color: "text-cyan-500",
        bgColor: "bg-cyan-500/10",
    },
] as const

export default function TutorialPage() {
    const t = useTranslations("Tutorial")
    const admin = useTranslations("Admin")
    const locale = useLocale()
    const tenant = useTenant()
    const showAttribution = !shouldHideTenantBranding({
        id: tenant.id,
        domain: tenant.domain,
    })

    return (
        <AdminShell>
            <div className="max-w-4xl mx-auto pb-10">
                {/* Back */}
                <div className="mb-6">
                    <Link
                        href={`/${locale}/dashboard`}
                        className="inline-flex items-center text-sm text-muted-foreground hover:text-primary"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t("backToDashboard")}
                    </Link>
                </div>

                {/* Title */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <BookOpen className="h-6 w-6" /> {t("pageTitle")}
                    </h1>
                    <p className="text-muted-foreground">
                        {t("pageDescription")}
                    </p>
                </div>

                {/* Steps */}
                <div className="space-y-6">
                    {tutorialSteps.map((step, index) => {
                        const IconComp = step.icon
                        return (
                            <Card
                                key={step.titleKey}
                                className="overflow-hidden"
                            >
                                <CardContent className="p-0">
                                    <div className="flex flex-col sm:flex-row">
                                        {/* Step number + icon */}
                                        <div
                                            className={`${step.bgColor} flex items-center justify-center p-6 sm:p-8 sm:min-w-[140px]`}
                                        >
                                            <div className="relative">
                                                <IconComp
                                                    className={`h-12 w-12 ${step.color}`}
                                                />
                                                <span className="absolute -top-2 -right-3 h-7 w-7 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-sm">
                                                    {index + 1}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-6 flex-1">
                                            <h3 className="text-lg font-semibold mb-1">
                                                {t(step.titleKey)}
                                            </h3>
                                            <p className="text-muted-foreground text-sm mb-4">
                                                {t(step.descKey)}
                                            </p>
                                            <ul className="space-y-2">
                                                {step.detailKeys.map(
                                                    (detailKey, dIdx) => (
                                                        <li
                                                            key={detailKey}
                                                            className="flex items-start gap-3 text-sm"
                                                        >
                                                            <span className="shrink-0 h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                                                                {dIdx + 1}
                                                            </span>
                                                            <span className="pt-0.5">
                                                                {t(
                                                                    detailKey as any
                                                                )}
                                                            </span>
                                                        </li>
                                                    )
                                                )}
                                            </ul>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>

                {/* Tip */}
                <div className="mt-8 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/20 p-5 flex gap-4">
                    <div className="shrink-0">
                        <Lightbulb className="h-6 w-6 text-amber-500" />
                    </div>
                    <div>
                        <p className="font-semibold text-sm mb-1">
                            💡 {t("tip")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {t("tipContent")}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                {showAttribution ? (
                    <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
                        <p>
                            {admin("footer")}{" "}
                            <a
                                href="https://instagram.com/ryanekopram"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                            >
                                @ryanekopram
                            </a>{" "}
                            &{" "}
                            <a
                                href="https://instagram.com/ryanekoapps"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                            >
                                @ryanekoapps
                            </a>
                        </p>
                    </div>
                ) : null}
            </div>
        </AdminShell>
    )
}
