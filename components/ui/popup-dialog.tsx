"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, AlertTriangle, CheckCircle, Info, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface PopupDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm?: () => void
    title: string
    message: string
    type?: 'info' | 'warning' | 'success' | 'danger'
    confirmText?: string
    cancelText?: string
    showCancel?: boolean
}

const iconMap = {
    info: Info,
    warning: AlertTriangle,
    success: CheckCircle,
    danger: Trash2
}

const colorMap = {
    info: "text-blue-500 bg-blue-100 dark:bg-blue-900/30",
    warning: "text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30",
    success: "text-green-500 bg-green-100 dark:bg-green-900/30",
    danger: "text-red-500 bg-red-100 dark:bg-red-900/30"
}

const buttonColorMap = {
    info: "bg-blue-600 hover:bg-blue-700",
    warning: "bg-yellow-600 hover:bg-yellow-700",
    success: "bg-green-600 hover:bg-green-700",
    danger: "bg-red-600 hover:bg-red-700"
}

export function PopupDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = 'info',
    confirmText = 'OK',
    cancelText = 'Batal',
    showCancel = true
}: PopupDialogProps) {
    const Icon = iconMap[type]

    const handleConfirm = () => {
        onConfirm?.()
        onClose()
    }

    const handleClose = () => {
        onClose()
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop — only closes, does NOT confirm */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
                        onClick={handleClose}
                    />

                    {/* Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-[90%] max-w-md"
                    >
                        <div className="bg-background rounded-xl shadow-2xl border overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center gap-3 p-4 border-b">
                                <div className={cn("p-2 rounded-full", colorMap[type])}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <h3 className="font-semibold text-lg flex-1">{title}</h3>
                                <button
                                    onClick={onClose}
                                    className="p-1 hover:bg-muted rounded-full transition-colors cursor-pointer"
                                >
                                    <X className="h-5 w-5 text-muted-foreground" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <p className="text-muted-foreground whitespace-pre-line">{message}</p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 p-4 pt-0 justify-end">
                                {showCancel && (
                                    <Button
                                        variant="outline"
                                        onClick={onClose}
                                        className="cursor-pointer"
                                    >
                                        {cancelText}
                                    </Button>
                                )}
                                <Button
                                    onClick={handleConfirm}
                                    className={cn("text-white cursor-pointer", buttonColorMap[type])}
                                >
                                    {confirmText}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

// Toast notification component
export interface ToastProps {
    isOpen: boolean
    message: string
    type?: 'info' | 'success' | 'warning' | 'danger'
    onClose: () => void
    duration?: number
}

export function Toast({ isOpen, message, type = 'info', onClose, duration = 3000 }: ToastProps) {
    const Icon = iconMap[type]

    // Auto close
    if (isOpen && duration > 0) {
        setTimeout(onClose, duration)
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.9 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100]"
                >
                    <div className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border bg-background",
                    )}>
                        <div className={cn("p-1.5 rounded-full", colorMap[type])}>
                            <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">{message}</span>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-muted rounded-full transition-colors cursor-pointer ml-2"
                        >
                            <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
