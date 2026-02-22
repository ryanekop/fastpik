"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useTranslations } from "next-intl"
import { FileSpreadsheet, Rows3, Link, X, Zap, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BatchProjectDialogProps {
    isOpen: boolean
    onClose: () => void
    onImportFile: () => void
    onBatchMode: () => void
}

export function BatchProjectDialog({ isOpen, onClose, onImportFile, onBatchMode }: BatchProjectDialogProps) {
    const t = useTranslations('Admin')

    if (!isOpen) return null

    const options = [
        {
            icon: FileSpreadsheet,
            title: t('batchImportFile'),
            desc: t('batchImportFileDesc'),
            enabled: true,
            onClick: () => { onClose(); onImportFile() }
        },
        {
            icon: Rows3,
            title: t('batchMode'),
            desc: t('batchModeDesc'),
            enabled: true,
            onClick: () => { onClose(); onBatchMode() }
        },
        {
            icon: Link,
            title: t('batchClientMgmt'),
            desc: t('batchClientMgmtDesc'),
            enabled: false,
            onClick: undefined
        }
    ]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="bg-background rounded-xl shadow-xl max-w-md w-full p-6 space-y-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        {t('batchDialogTitle')}
                    </h2>
                    <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8 cursor-pointer">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="space-y-3">
                    {options.map((opt, i) => (
                        <button
                            key={i}
                            onClick={opt.enabled ? opt.onClick : undefined}
                            disabled={!opt.enabled}
                            className={`w-full text-left p-4 rounded-lg border transition-all flex items-start gap-4 ${opt.enabled
                                ? 'hover:border-primary hover:bg-primary/5 cursor-pointer'
                                : 'opacity-50 cursor-not-allowed bg-muted/30'
                                }`}
                        >
                            <div className={`p-2 rounded-lg shrink-0 ${opt.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                <opt.icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{opt.title}</span>
                                    {!opt.enabled && (
                                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <Lock className="h-3 w-3" />
                                            {t('comingSoon')}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-0.5">{opt.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </motion.div>
        </div>
    )
}
