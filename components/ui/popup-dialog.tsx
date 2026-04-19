"use client"

import { useEffect } from "react"
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

const toastColorMap = {
    info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100",
    warning: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100",
    success: "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100",
    danger: "border-red-200 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
}

const toastIconColorMap = {
    info: "text-blue-700 bg-blue-100 dark:text-blue-200 dark:bg-blue-900/50",
    warning: "text-amber-700 bg-amber-100 dark:text-amber-200 dark:bg-amber-900/50",
    success: "text-emerald-700 bg-emerald-100 dark:text-emerald-200 dark:bg-emerald-900/50",
    danger: "text-red-700 bg-red-100 dark:text-red-200 dark:bg-red-900/50"
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
    position?: 'bottom-center' | 'top-right'
}

export function Toast({ isOpen, message, type = 'info', onClose, duration = 3000, position = 'bottom-center' }: ToastProps) {
    const Icon = iconMap[type]
    const isTopRight = position === 'top-right'

    useEffect(() => {
        if (!isOpen || duration <= 0) return
        const timeoutId = window.setTimeout(onClose, duration)
        return () => window.clearTimeout(timeoutId)
    }, [duration, isOpen, onClose])

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: isTopRight ? -16 : 50, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: isTopRight ? -16 : 50, scale: 0.96 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className={cn(
                        "fixed z-[100]",
                        isTopRight
                            ? "left-4 right-4 top-20 sm:left-auto sm:right-5 sm:top-20 sm:w-full sm:max-w-sm"
                            : "bottom-24 left-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 sm:w-auto"
                    )}
                >
                    <div className={cn(
                        "flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg",
                        toastColorMap[type]
                    )}>
                        <div className={cn("p-1.5 rounded-full", toastIconColorMap[type])}>
                            <Icon className="h-4 w-4" />
                        </div>
                        <span className="flex-1 text-sm font-medium">{message}</span>
                        <button
                            onClick={onClose}
                            className="ml-2 rounded-full p-1 transition-colors hover:bg-black/5 cursor-pointer dark:hover:bg-white/10"
                        >
                            <X className="h-4 w-4 opacity-70" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
