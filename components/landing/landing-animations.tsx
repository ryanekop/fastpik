"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { useTranslations } from 'next-intl'
import {
    Link2, Zap, Download, Timer, Smartphone, Lock,
    FolderPlus, Share2, CheckCircle2, Printer, Globe2,
    Check, MessageCircle, Send, Eye, MousePointer2
} from "lucide-react"

const features = [
    { icon: Link2, titleKey: 'feature1Title', descKey: 'feature1Desc', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: Zap, titleKey: 'feature3Title', descKey: 'feature3Desc', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { icon: Download, titleKey: 'feature7Title', descKey: 'feature7Desc', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { icon: Printer, titleKey: 'feature20Title', descKey: 'feature20Desc', color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { icon: Timer, titleKey: 'feature11Title', descKey: 'feature11Desc', color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { icon: Smartphone, titleKey: 'feature4Title', descKey: 'feature4Desc', color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { icon: Lock, titleKey: 'feature6Title', descKey: 'feature6Desc', color: 'text-red-500', bg: 'bg-red-500/10' },
    { icon: Globe2, titleKey: 'feature21Title', descKey: 'feature21Desc', color: 'text-emerald-600', bg: 'bg-emerald-600/10' },
]

const steps = [
    { icon: FolderPlus, titleKey: 'step1Title', descKey: 'step1Desc', step: '1' },
    { icon: Share2, titleKey: 'step2Title', descKey: 'step2Desc', step: '2' },
    { icon: CheckCircle2, titleKey: 'step3Title', descKey: 'step3Desc', step: '3' },
]

export function AnimatedHero({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-4xl space-y-6 text-center lg:mx-0 lg:max-w-2xl lg:text-left"
        >
            {children}
        </motion.div>
    )
}

const demoPhotos = [
    { name: "DSC_1024.JPG", tone: "from-sky-200 via-cyan-100 to-slate-200", selected: true, selectedAt: 0.16 },
    { name: "DSC_1031.JPG", tone: "from-amber-200 via-orange-100 to-rose-200", selected: false },
    { name: "DSC_1042.JPG", tone: "from-emerald-200 via-teal-100 to-lime-100", selected: true, selectedAt: 0.32 },
    { name: "DSC_1057.JPG", tone: "from-violet-200 via-fuchsia-100 to-pink-100", selected: false },
    { name: "DSC_1068.JPG", tone: "from-rose-200 via-pink-100 to-orange-100", selected: true, selectedAt: 0.48 },
    { name: "DSC_1080.JPG", tone: "from-indigo-200 via-blue-100 to-cyan-100", selected: true, selectedAt: 0.64 },
]

const selectedPhotoNames = demoPhotos.filter((photo) => photo.selected).map((photo) => photo.name)
const cursorPath = {
    left: ["18%", "18%", "18%", "82%", "82%", "50%", "50%", "82%", "82%", "82%", "18%"],
    top: ["45%", "45%", "45%", "45%", "45%", "75%", "75%", "75%", "75%", "75%", "45%"],
    scale: [1, 1, 0.84, 1, 0.84, 1, 0.84, 1, 0.84, 1, 1],
}
const cursorTimes = [0, 0.12, 0.16, 0.28, 0.32, 0.44, 0.48, 0.6, 0.64, 0.88, 1]

function selectionTimes(selectedAt = 0) {
    return [0, Math.max(0, selectedAt - 0.04), selectedAt + 0.04, 0.82, 0.92, 1]
}

function clickRingTimes(selectedAt = 0) {
    return [0, Math.max(0, selectedAt - 0.03), selectedAt, selectedAt + 0.08, selectedAt + 0.16, 1]
}

export function LandingHeroDemo() {
    const shouldReduceMotion = useReducedMotion()
    const loopTransition = shouldReduceMotion
        ? { duration: 0 }
        : { duration: 12, repeat: Infinity, ease: "easeInOut" as const }
    const finalOpacity = shouldReduceMotion ? 1 : undefined
    const finalY = shouldReduceMotion ? 0 : undefined

    return (
        <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="relative hidden w-full max-w-[37rem] justify-self-end lg:block"
            aria-hidden="true"
        >
            <div className="absolute -inset-5 rounded-[1.5rem] bg-gradient-to-br from-primary/10 via-background to-muted/70 blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border bg-card/95 shadow-2xl">
                <div className="flex items-center justify-between border-b bg-muted/35 px-4 py-2.5">
                    <div>
                        <p className="text-[10px] font-medium uppercase text-muted-foreground">
                            Live photo selection
                        </p>
                        <p className="text-xs font-semibold">Fastpik Demo</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-red-400" />
                        <span className="h-2 w-2 rounded-full bg-yellow-400" />
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    </div>
                </div>

                <div className="relative grid gap-3 p-4">
                    <div className="relative rounded-xl border bg-background p-3 shadow-sm">
                        <div className="mb-2.5 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold">Gallery Klien</p>
                                <p className="text-[11px] text-muted-foreground">Nadia Graduation - pilih 5 foto</p>
                            </div>
                            <motion.span
                                animate={
                                    shouldReduceMotion
                                        ? { opacity: 1 }
                                        : { opacity: [0.55, 1, 0.55] }
                                }
                                transition={loopTransition}
                                className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
                            >
                                Klien sedang memilih
                            </motion.span>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5">
                            {demoPhotos.map((photo, index) => (
                                <motion.div
                                    key={photo.name}
                                    animate={{
                                        y: shouldReduceMotion ? 0 : [0, 0, -2, -2, 0],
                                    }}
                                    transition={{
                                        ...loopTransition,
                                        delay: shouldReduceMotion ? 0 : index * 0.15,
                                        times: [0, 0.2, 0.35, 0.8, 1],
                                    }}
                                    className="relative overflow-hidden rounded-lg border bg-muted/20 shadow-sm"
                                >
                                    <div className={`aspect-[5/3] bg-gradient-to-br ${photo.tone}`} />
                                    <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                                        <span className="truncate text-[10px] font-medium">{photo.name}</span>
                                        <Eye className="h-3 w-3 shrink-0 text-muted-foreground" />
                                    </div>
                                    {photo.selected && !shouldReduceMotion ? (
                                        <motion.span
                                            animate={{
                                                opacity: [0, 0, 1, 0.55, 0, 0],
                                                scale: [0.7, 0.7, 0.7, 1.65, 2.15, 2.15],
                                            }}
                                            transition={{
                                                ...loopTransition,
                                                times: clickRingTimes(photo.selectedAt),
                                            }}
                                            className="absolute left-1/2 top-[38%] h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-500/80"
                                        />
                                    ) : null}
                                    {photo.selected ? (
                                        <motion.div
                                            animate={{
                                                opacity: finalOpacity ?? [0, 0, 1, 1, 1, 0],
                                                scale: shouldReduceMotion ? 1 : [0.8, 0.8, 1, 1, 1, 0.9],
                                            }}
                                            transition={{
                                                ...loopTransition,
                                                times: selectionTimes(photo.selectedAt),
                                            }}
                                            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border border-emerald-500 bg-background/95 text-emerald-600 shadow-lg shadow-emerald-500/20"
                                        >
                                            <Check className="h-3.5 w-3.5" />
                                        </motion.div>
                                    ) : null}
                                </motion.div>
                            ))}
                        </div>

                        {!shouldReduceMotion ? (
                            <motion.div
                                animate={cursorPath}
                                transition={{ ...loopTransition, times: cursorTimes }}
                                className="pointer-events-none absolute z-20 -ml-1 -mt-1 text-slate-900 drop-shadow-[0_3px_5px_rgba(0,0,0,0.25)] dark:text-white"
                            >
                                <MousePointer2 className="h-5 w-5 fill-background stroke-[2.4]" />
                            </motion.div>
                        ) : null}
                    </div>

                    <div className="grid grid-cols-[0.9fr_1.1fr] gap-3">
                        <div className="rounded-xl border bg-background p-3 shadow-sm">
                            <div className="mb-2.5 flex items-center justify-between">
                                <p className="text-xs font-semibold">Live Tracking</p>
                                <MousePointer2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <div className="space-y-2.5">
                                <div>
                                    <div className="mb-1 flex items-center justify-between text-[11px]">
                                        <span className="text-muted-foreground">Foto dipilih</span>
                                        <motion.span
                                            animate={{
                                                opacity: finalOpacity ?? [0.6, 0.6, 1, 1, 1, 0.6],
                                            }}
                                            transition={{ ...loopTransition, times: [0, 0.18, 0.36, 0.78, 0.92, 1] }}
                                            className="relative inline-flex h-4 w-8 justify-end font-semibold text-primary"
                                        >
                                            {shouldReduceMotion ? (
                                                `${selectedPhotoNames.length}/5`
                                            ) : (
                                                <>
                                                    <motion.span
                                                        animate={{ opacity: [1, 1, 0, 0, 0, 1] }}
                                                        transition={{ ...loopTransition, times: [0, 0.12, 0.16, 0.82, 0.94, 1] }}
                                                        className="absolute"
                                                    >
                                                        0/5
                                                    </motion.span>
                                                    <motion.span
                                                        animate={{ opacity: [0, 0, 1, 1, 0, 0] }}
                                                        transition={{ ...loopTransition, times: [0, 0.14, 0.18, 0.28, 0.32, 1] }}
                                                        className="absolute"
                                                    >
                                                        1/5
                                                    </motion.span>
                                                    <motion.span
                                                        animate={{ opacity: [0, 0, 1, 1, 0, 0] }}
                                                        transition={{ ...loopTransition, times: [0, 0.3, 0.34, 0.44, 0.48, 1] }}
                                                        className="absolute"
                                                    >
                                                        2/5
                                                    </motion.span>
                                                    <motion.span
                                                        animate={{ opacity: [0, 0, 1, 1, 0, 0] }}
                                                        transition={{ ...loopTransition, times: [0, 0.46, 0.5, 0.6, 0.64, 1] }}
                                                        className="absolute"
                                                    >
                                                        3/5
                                                    </motion.span>
                                                    <motion.span
                                                        animate={{ opacity: [0, 0, 0, 1, 1, 0] }}
                                                        transition={{ ...loopTransition, times: [0, 0.6, 0.64, 0.68, 0.9, 1] }}
                                                        className="absolute"
                                                    >
                                                        4/5
                                                    </motion.span>
                                                </>
                                            )}
                                        </motion.span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                        <motion.div
                                            animate={{
                                                width: shouldReduceMotion
                                                    ? "80%"
                                                    : ["0%", "0%", "20%", "40%", "60%", "80%", "80%", "0%"],
                                            }}
                                            transition={{ ...loopTransition, times: [0, 0.12, 0.16, 0.32, 0.48, 0.64, 0.9, 1] }}
                                            className="h-full rounded-full bg-primary"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    {selectedPhotoNames.slice(0, 3).map((name, index) => (
                                        <motion.div
                                            key={name}
                                            animate={{
                                                opacity: finalOpacity ?? [0, 0, 1, 1, 1, 0],
                                                x: shouldReduceMotion ? 0 : [-8, -8, 0, 0, 0, -4],
                                            }}
                                            transition={{
                                                ...loopTransition,
                                                times: selectionTimes(demoPhotos.filter((photo) => photo.selected)[index]?.selectedAt),
                                            }}
                                            className="rounded-md border bg-muted/25 px-2.5 py-1.5 text-[11px] font-medium"
                                        >
                                            {name}
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="relative rounded-xl border bg-background p-3 shadow-sm">
                            <div className="mb-2.5 flex items-center justify-between">
                                <p className="text-xs font-semibold">Kirim Hasil</p>
                                <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                            </div>
                            <motion.div
                                animate={{
                                    opacity: finalOpacity ?? [0, 0, 0, 1, 1, 0],
                                    y: finalY ?? [12, 12, 12, 0, 0, -8],
                                }}
                                transition={{ ...loopTransition, times: [0, 0.52, 0.62, 0.72, 0.9, 1] }}
                                className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-2.5 shadow-sm"
                            >
                                <div className="mb-1.5 flex items-center gap-2">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                                        <MessageCircle className="h-3.5 w-3.5" />
                                    </span>
                                    <div>
                                        <p className="text-[11px] font-semibold">WhatsApp Admin</p>
                                        <p className="text-[10px] text-muted-foreground">Daftar foto pilihan siap dikirim</p>
                                    </div>
                                </div>
                                <div className="rounded-lg bg-background/80 px-2.5 py-1.5 text-[10px] leading-relaxed text-muted-foreground">
                                    Berikut foto pilihan saya:
                                    <br />
                                    {selectedPhotoNames.join(", ")}
                                </div>
                            </motion.div>
                            <motion.div
                                animate={{
                                    scale: shouldReduceMotion ? 1 : [1, 1, 1, 1.02, 1.02, 1],
                                    boxShadow: shouldReduceMotion
                                        ? "0 10px 20px rgba(16,185,129,0.2)"
                                        : [
                                            "0 0 0 rgba(16,185,129,0)",
                                            "0 0 0 rgba(16,185,129,0)",
                                            "0 0 0 rgba(16,185,129,0)",
                                            "0 10px 26px rgba(16,185,129,0.35)",
                                            "0 10px 26px rgba(16,185,129,0.35)",
                                            "0 0 0 rgba(16,185,129,0)",
                                        ],
                                }}
                                transition={{ ...loopTransition, times: [0, 0.5, 0.6, 0.72, 0.9, 1] }}
                                className="mt-2.5 flex h-8 items-center justify-center gap-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white"
                            >
                                <Send className="h-3.5 w-3.5" />
                                Kirim list foto
                            </motion.div>
                        </div>
                    </div>

                </div>
            </div>
        </motion.div>
    )
}

export function AnimatedFeatures() {
    const t = useTranslations('Index')
    const COLS = 3

    // Chunk into rows, last incomplete row will be centered
    const rows: typeof features[] = []
    for (let i = 0; i < features.length; i += COLS) rows.push(features.slice(i, i + COLS))

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="text-center mb-12"
            >
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('featuresTitle')}</h2>
                <p className="text-muted-foreground text-lg">{t('featuresSubtitle')}</p>
            </motion.div>

            <div className="max-w-6xl mx-auto space-y-6">
                {rows.map((row, rowIdx) => (
                    <div
                        key={rowIdx}
                        className="flex flex-col sm:flex-row gap-6"
                    >
                        {row.map((feature, colIdx) => {
                            const Icon = feature.icon
                            return (
                                <div
                                    key={feature.titleKey}
                                    className="w-full sm:flex-1"
                                >
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: (rowIdx * COLS + colIdx) * 0.1 }}
                                        className="h-full"
                                    >
                                        <Card className="h-full hover:shadow-lg transition-shadow">
                                            <CardContent className="pt-6">
                                                <div className={`h-12 w-12 rounded-lg ${feature.bg} flex items-center justify-center mb-4`}>
                                                    <Icon className={`h-6 w-6 ${feature.color}`} />
                                                </div>
                                                <h3 className="font-semibold text-lg mb-2">{t(feature.titleKey)}</h3>
                                                <p className="text-muted-foreground">{t(feature.descKey)}</p>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                </div>
                            )
                        })}
                    </div>
                ))}
            </div>
        </>
    )
}

export function AnimatedWorkflow() {
    const t = useTranslations('Index')

    return (
        <>
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
                        </motion.div>
                    )
                })}
            </div>
        </>
    )
}

export function AnimatedSection({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

export function AnimatedCTA({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto bg-primary rounded-3xl p-8 sm:p-12 text-primary-foreground"
        >
            {children}
        </motion.div>
    )
}
