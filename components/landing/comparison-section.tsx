"use client"

import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { Check, X } from "lucide-react"

const features = [
    { key: "linkSharing" },
    { key: "realtimeSelection" },
    { key: "downloadPhoto" },
    { key: "passwordProtection" },
    { key: "linkDuration" },
    { key: "responsiveDesign" },
    { key: "batchMode" },
    { key: "folderSystem" },
    { key: "whatsappTemplate" },
    { key: "extraPhotoSelect" },
    { key: "printPhotoSelect" },
    { key: "customDomain" },
    { key: "darkMode" },
    { key: "multiLanguage" },
]

// Column order: Fastpik, Vyash.id, Pickspace, Google Drive Manual
// true = YES, false = NO
const matrix: Record<string, boolean[]> = {
    linkSharing: [true, true, true, true],
    realtimeSelection: [true, true, true, false],
    downloadPhoto: [true, false, true, true],
    passwordProtection: [true, true, false, false],
    linkDuration: [true, false, false, false],
    responsiveDesign: [true, true, true, true],
    batchMode: [true, false, false, false],
    folderSystem: [true, false, false, true],
    whatsappTemplate: [true, false, false, false],
    extraPhotoSelect: [true, false, false, false],
    printPhotoSelect: [true, false, false, false],
    customDomain: [true, false, false, false],
    darkMode: [true, false, false, false],
    multiLanguage: [true, false, false, false],
}

const platforms = ["fastpik", "vyash", "clientSpace", "gdrive"] as const

function StatusIcon({ value }: { value: boolean }) {
    return value ? (
        <div className="h-7 w-7 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
            <Check className="h-4 w-4 text-emerald-500" strokeWidth={3} />
        </div>
    ) : (
        <div className="h-7 w-7 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <X className="h-4 w-4 text-red-400/70" strokeWidth={3} />
        </div>
    )
}

export function ComparisonSection() {
    const t = useTranslations("Index")

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
            >
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                    {t("comparisonTitle")}
                </h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                    {t("comparisonSubtitle")}
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 }}
                className="max-w-5xl mx-auto"
            >
                {/* Scrollable wrapper */}
                <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full" style={{ minWidth: "560px" }}>
                            {/* Header row */}
                            <thead>
                                <tr className="border-b bg-muted/30">
                                    {/* Sticky feature label */}
                                    <th
                                        className="text-left py-4 px-5 font-semibold text-sm text-muted-foreground sticky left-0 bg-background z-10 w-[180px] min-w-[140px]"
                                    >
                                        {t("compFeatureLabel")}
                                    </th>

                                    {platforms.map((p, i) => (
                                        <th key={p} className="py-4 px-3 text-center w-[130px] min-w-[100px]">
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: 0.2 + i * 0.08 }}
                                            >
                                                <span className={`font-bold text-sm ${p === "fastpik" ? "text-primary" : "text-foreground"}`}>
                                                    {t(`compPlatform_${p}` as any)}
                                                </span>
                                            </motion.div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {features.map((feature, rowIdx) => (
                                    <motion.tr
                                        key={feature.key}
                                        initial={{ opacity: 0, x: -10 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.1 + rowIdx * 0.04 }}
                                        className="border-b last:border-b-0 hover:bg-muted/20 transition-colors"
                                    >
                                        {/* Sticky feature name cell */}
                                        <td className="py-3.5 px-5 font-medium text-sm sticky left-0 bg-background z-10 border-r border-border/40">
                                            {t(`comp_${feature.key}` as any)}
                                        </td>

                                        {platforms.map((p, colIdx) => (
                                            <td
                                                key={p}
                                                className={`py-3.5 px-3 text-center ${p === "fastpik" ? "bg-primary/5" : ""}`}
                                            >
                                                <StatusIcon value={matrix[feature.key][colIdx]} />
                                            </td>
                                        ))}
                                    </motion.tr>
                                ))}

                                {/* Pricing row */}
                                <motion.tr
                                    initial={{ opacity: 0, x: -10 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.1 + features.length * 0.04 }}
                                    className="bg-muted/20"
                                >
                                    <td className="py-4 px-5 font-semibold text-sm sticky left-0 bg-muted z-10 border-r border-border/40">
                                        {t("compPricing")}
                                    </td>
                                    {platforms.map((p) => (
                                        <td
                                            key={p}
                                            className={`py-4 px-3 text-center text-xs font-medium ${p === "fastpik" ? "bg-primary/5 text-primary font-bold" : "text-muted-foreground"}`}
                                        >
                                            {t(`compPrice_${p}` as any)}
                                        </td>
                                    ))}
                                </motion.tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Swipe hint — only on small screens */}
                    <p className="text-center text-xs text-muted-foreground py-2.5 border-t sm:hidden">
                        ← Geser untuk melihat perbandingan →
                    </p>
                </div>
            </motion.div>
        </>
    )
}
