"use client"

import { useState, useEffect } from "react"
import { useSelectionStore } from "@/lib/store"
import { PhotoGrid } from "./photo-grid"
import { PhotoLightbox } from "./photo-lightbox"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { PopupDialog, Toast } from "@/components/ui/popup-dialog"
import { Copy, Send, AlertCircle, Loader2, RefreshCw, ImageOff, Trash2, Lock, Eye, EyeOff, MessageCircle, Check } from "lucide-react"
import { generateMockPhotos } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { LanguageToggle } from "@/components/language-toggle"
import { ThemeToggle } from "@/components/theme-toggle"
import { Card, CardContent } from "@/components/ui/card"

interface Photo {
    id: string
    name: string
    url: string
    fullUrl: string
    downloadUrl?: string
    folderName?: string
    createdTime?: string
}

interface ClientViewProps {
    config: {
        clientName: string
        maxPhotos: number
        whatsapp: string
        gdriveLink: string
        detectSubfolders: boolean
        expiresAt?: number
        password?: string
    }
}

export function ClientView({ config }: ClientViewProps) {
    const t = useTranslations('Client')
    const { selected, toggleSelection, clearSelection, setProjectId, projectId } = useSelectionStore()
    const [photos, setPhotos] = useState<Photo[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [alertMax, setAlertMax] = useState(false)
    const [copied, setCopied] = useState(false)

    // Password protection state
    const [isPasswordProtected] = useState(!!config.password)
    const [isAuthenticated, setIsAuthenticated] = useState(!config.password)
    const [passwordInput, setPasswordInput] = useState("")
    const [passwordError, setPasswordError] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    // Lightbox state
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const [lightboxIndex, setLightboxIndex] = useState(0)

    // Popup state
    const [showClearDialog, setShowClearDialog] = useState(false)
    const [showToast, setShowToast] = useState(false)
    const [toastMessage, setToastMessage] = useState("")
    const [showRestoreDialog, setShowRestoreDialog] = useState(false)
    const [hasPendingSelection, setHasPendingSelection] = useState(false)

    // Check if project is expired (client-side only to avoid hydration mismatch)
    const [isExpired, setIsExpired] = useState(false)

    useEffect(() => {
        setIsExpired(config.expiresAt ? Date.now() > config.expiresAt : false)
    }, [config.expiresAt])

    // Generate a unique project identifier from config
    const currentProjectId = `${config.clientName}-${config.gdriveLink}`.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50)

    // Check for existing session on mount
    useEffect(() => {
        if (projectId === currentProjectId && selected.length > 0) {
            // Same project, has previous selection - ask to restore
            setHasPendingSelection(true)
            setShowRestoreDialog(true)
        } else {
            // Different project or no selection - set project and clear
            setProjectId(currentProjectId)
        }
    }, [])

    // Beforeunload warning when there are unsaved selections
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (selected.length > 0) {
                e.preventDefault()
                e.returnValue = ''
                return ''
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [selected.length])

    // Handle restore dialog actions
    const handleRestoreSession = () => {
        setShowRestoreDialog(false)
        setHasPendingSelection(false)
        setProjectId(currentProjectId)
        // Keep existing selections
    }

    const handleStartFresh = () => {
        setShowRestoreDialog(false)
        setHasPendingSelection(false)
        clearSelection()
        setProjectId(currentProjectId)
    }

    // Clear selection and fetch photos on mount (only if authenticated)
    useEffect(() => {
        if (isAuthenticated && !hasPendingSelection) {
            fetchPhotos()
        }
    }, [isAuthenticated, hasPendingSelection])

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (passwordInput === config.password) {
            setIsAuthenticated(true)
            setPasswordError(false)
        } else {
            setPasswordError(true)
        }
    }

    const fetchPhotos = async () => {
        setLoading(true)
        setError(null)

        // Check if we have an API key configured
        const hasApiKey = !!process.env.NEXT_PUBLIC_GOOGLE_API_KEY

        if (!hasApiKey || !config.gdriveLink.includes('drive.google.com')) {
            // Fallback to mock data if no API key or invalid drive link
            console.log('Using mock data (no API key or invalid drive link)')
            const mockPhotos = generateMockPhotos(50).map(p => ({
                id: p.id,
                name: p.name,
                url: p.url,
                fullUrl: p.url
            }))
            setPhotos(mockPhotos)
            setLoading(false)
            return
        }

        try {
            // Use cached API route instead of direct Google Drive API call
            const params = new URLSearchParams({
                gdriveLink: config.gdriveLink,
                detectSubfolders: config.detectSubfolders ? 'true' : 'false'
            })

            const response = await fetch(`/api/photos?${params}`)
            const result = await response.json()

            if (!response.ok || result.error) {
                setError(result.error || t('tryAgain'))
                // Fallback to mock for demo
                const mockPhotos = generateMockPhotos(20).map(p => ({
                    id: p.id,
                    name: p.name,
                    url: p.url,
                    fullUrl: p.url
                }))
                setPhotos(mockPhotos)
            } else {
                // Photos are already in the correct format from API
                const drivePhotos: Photo[] = result.photos.map((photo: any) => ({
                    id: photo.id,
                    name: photo.name,
                    url: photo.url,
                    fullUrl: photo.fullUrl,
                    downloadUrl: photo.downloadUrl,
                    folderName: photo.folderName,
                    createdTime: photo.createdTime
                }))
                setPhotos(drivePhotos)

                // Log cache status
                if (result.cached) {
                    console.log('📦 Photos loaded from cache')
                } else {
                    console.log('🔄 Photos fetched fresh from Google Drive')
                }
            }
        } catch (err) {
            console.error('Failed to fetch photos:', err)
            setError(t('tryAgain'))
            // Fallback to mock
            const mockPhotos = generateMockPhotos(20)
            setPhotos(mockPhotos)
        } finally {
            setLoading(false)
        }
    }

    // Password protection screen
    if (isPasswordProtected && !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6 space-y-6">
                        <div className="text-center space-y-2">
                            <Lock className="h-12 w-12 mx-auto text-primary" />
                            <h1 className="text-xl font-bold">{config.clientName}</h1>
                            <p className="text-muted-foreground text-sm">{t('passwordProtected') || 'This album is password protected'}</p>
                        </div>
                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    value={passwordInput}
                                    onChange={(e) => {
                                        setPasswordInput(e.target.value)
                                        setPasswordError(false)
                                    }}
                                    placeholder={t('enterPassword') || 'Enter password'}
                                    className={cn(
                                        "pr-10",
                                        passwordError && "border-red-500 focus:ring-red-500"
                                    )}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {passwordError && (
                                <p className="text-red-500 text-sm">{t('wrongPassword') || 'Wrong password'}</p>
                            )}
                            <Button type="submit" className="w-full cursor-pointer">
                                {t('unlock') || 'Unlock'} 🔓
                            </Button>
                        </form>
                        <div className="flex justify-center">
                            <LanguageToggle />
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (isExpired) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="text-center space-y-4">
                    <div className="text-6xl">⏰</div>
                    <h1 className="text-2xl font-bold text-red-500 flex items-center justify-center gap-2">
                        <AlertCircle className="h-6 w-6" />
                        {t('linkExpired')}
                    </h1>
                    <p className="text-muted-foreground">
                        {t('linkExpiredDesc')}
                    </p>
                </div>
            </div>
        )
    }

    const handleToggle = (id: string) => {
        if (!selected.includes(id) && selected.length >= config.maxPhotos) {
            setAlertMax(true)
            setTimeout(() => setAlertMax(false), 1000)
            return
        }
        toggleSelection(id, config.maxPhotos)
    }

    const handleZoom = (photo: any) => {
        const index = photos.findIndex(p => p.id === photo.id)
        setLightboxIndex(index)
        setLightboxOpen(true)
    }

    // Helper to get name without extension
    const getNameWithoutExt = (name: string | undefined) => {
        if (!name) return ''
        return name.replace(/\.[^/.]+$/, '')
    }

    const copyList = () => {
        const listText = selected.map(id => getNameWithoutExt(photos.find(p => p.id === id)?.name)).join('\n')

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(listText)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } else {
            // Fallback for non-secure context
            const textArea = document.createElement("textarea")
            textArea.value = listText
            textArea.style.position = "fixed"
            textArea.style.left = "-9999px"
            document.body.appendChild(textArea)
            textArea.focus()
            textArea.select()
            try {
                document.execCommand('copy')
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
            } catch (err) {
                console.error('Failed to copy', err)
            }
            document.body.removeChild(textArea)
        }
    }

    const sendWhatsapp = () => {
        const listText = selected.map(id => getNameWithoutExt(photos.find(p => p.id === id)?.name)).join('\n')
        const message = `${t('waMessageIntro')}\n\n${t('waMessageBody')} (${selected.length} ${t('waMessagePhotos')}):\n\n${listText}\n\n${t('waMessageThanks')}`
        window.open(`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(message)}`, '_blank')
    }

    const handleClearSelection = () => {
        clearSelection()
        setShowClearDialog(false)
        setToastMessage(t('selectionCleared'))
        setShowToast(true)
    }

    // Get selected photo names for display
    const selectedPhotoNames = selected.slice(0, 5).map(id => getNameWithoutExt(photos.find(p => p.id === id)?.name))

    // Format photos for lightbox
    const lightboxPhotos = photos.map(p => ({
        id: p.id,
        name: p.name,
        thumbnail: p.url,
        full: p.fullUrl
    }))

    return (
        <div className="min-h-screen bg-background pb-36">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b p-4 flex justify-between items-center transition-all">
                <div>
                    <h1 className="font-bold text-lg">{config.clientName}</h1>
                    <p className={cn(
                        "text-xs transition-colors",
                        alertMax ? "text-red-500 font-semibold" : "text-muted-foreground"
                    )}>
                        {selected.length} / {config.maxPhotos} {t('selected')}
                        {alertMax && ` ⚠️ ${t('maxLimit')}`}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Progress
                        value={(selected.length / config.maxPhotos) * 100}
                        className={cn(
                            "w-24 transition-colors",
                            alertMax && "bg-red-200"
                        )}
                    />
                    <ThemeToggle />
                    <LanguageToggle />
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="mx-4 mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">{error}</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={fetchPhotos} className="cursor-pointer">
                        <RefreshCw className="h-4 w-4 mr-1" /> {t('tryAgain')}
                    </Button>
                </div>
            )}

            {/* Loading State */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">{t('loadingPhotos')}</p>
                </div>
            ) : photos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <ImageOff className="h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">{t('noPhotos')}</p>
                    <Button onClick={fetchPhotos} variant="outline" className="cursor-pointer">
                        <RefreshCw className="h-4 w-4 mr-2" /> {t('reload')}
                    </Button>
                </div>
            ) : (
                <PhotoGrid
                    photos={photos}
                    selected={selected}
                    onToggle={handleToggle}
                    onZoom={handleZoom}
                    detectSubfolders={config.detectSubfolders}
                />
            )}

            {/* Photo Lightbox */}
            <PhotoLightbox
                photos={lightboxPhotos}
                initialIndex={lightboxIndex}
                isOpen={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
                selectedIds={selected}
                onToggleSelect={handleToggle}
                maxPhotos={config.maxPhotos}
            />

            {/* Bottom Bar - Fixed on mobile, lower z-index than lightbox */}
            <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-background/95 backdrop-blur-md border-t shadow-[0_-5px_20px_rgba(0,0,0,0.1)]">
                {/* Selected photos display */}
                {selected.length > 0 && (
                    <div className="mb-2 text-xs text-muted-foreground text-center px-4 truncate">
                        {t('chosenPhotos')}: {selectedPhotoNames.join(', ')}{selected.length > 5 && ` +${selected.length - 5} ${t('more')}`}
                    </div>
                )}
                <div className="flex flex-col md:flex-row gap-2 md:gap-3 w-full max-w-xl mx-auto md:max-w-none md:justify-center">
                    <div className="flex gap-2 w-full md:w-auto md:contents">
                        {/* Clear Selection Button */}
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setShowClearDialog(true)}
                            disabled={selected.length === 0}
                            className="shrink-0 cursor-pointer text-red-500 border-red-200 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 md:order-1 md:w-auto md:px-4 md:aspect-auto"
                        >
                            <Trash2 className="h-4 w-4 md:mr-2" />
                            <span className="hidden md:inline">{t('clearSelection')}</span>
                        </Button>

                        {/* Copy List Button */}
                        <Button
                            variant="outline"
                            onClick={copyList}
                            disabled={selected.length === 0}
                            className={cn(
                                "flex-1 md:flex-none gap-2 cursor-pointer md:order-2",
                                copied && "bg-green-100 text-green-700 border-green-200"
                            )}
                        >
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            {copied ? t('copied') : t('copyList')}
                        </Button>
                    </div>

                    {/* WhatsApp Button */}
                    <Button
                        onClick={sendWhatsapp}
                        disabled={selected.length === 0}
                        className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white gap-2 cursor-pointer shadow-sm md:order-3"
                    >
                        <MessageCircle className="h-4 w-4" />
                        {t('sendToClient')}
                    </Button>
                </div>
            </div>

            {/* Clear Selection Confirmation Dialog */}
            <PopupDialog
                isOpen={showClearDialog}
                onClose={() => setShowClearDialog(false)}
                onConfirm={handleClearSelection}
                title={t('confirmClear')}
                message={t('confirmClearMsg')}
                type="danger"
                confirmText={t('clearSelection')}
                cancelText={t('cancel') || 'Batal'}
            />

            {/* Toast Notification */}
            <Toast
                isOpen={showToast}
                message={toastMessage}
                type="success"
                onClose={() => setShowToast(false)}
            />

            {/* Restore Session Dialog */}
            <PopupDialog
                isOpen={showRestoreDialog}
                onClose={handleStartFresh}
                onConfirm={handleRestoreSession}
                title={t('restoreSession') || 'Lanjutkan Sesi?'}
                message={`${t('restoreSessionMsg') || 'Anda memiliki'} ${selected.length} ${t('photosSelected') || 'foto yang dipilih sebelumnya'}. ${t('continueOrStartFresh') || 'Lanjutkan atau mulai dari awal?'}`}
                type="info"
                confirmText={t('continue') || 'Lanjutkan'}
                cancelText={t('startFresh') || 'Mulai Baru'}
            />
        </div>
    )
}
