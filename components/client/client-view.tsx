"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSelectionStore, useStoreHydration } from "@/lib/store"
import { PhotoGrid } from "./photo-grid"
import { PhotoLightbox } from "./photo-lightbox"
import { useTranslations, useLocale } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { PopupDialog, Toast } from "@/components/ui/popup-dialog"
import { Copy, Send, AlertCircle, Loader2, RefreshCw, ImageOff, Trash2, Lock, Eye, EyeOff, MessageCircle, Check, Download, MousePointerClick, ArrowLeft, Square, ZoomIn } from "lucide-react"
// jszip and file-saver are dynamically imported when needed (see handleDownloadPhotos)
// This reduces the initial JS bundle by ~48KB
import { generateMockPhotos } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { LanguageToggle } from "@/components/language-toggle"
import { ThemeToggle } from "@/components/theme-toggle"
import { Card, CardContent } from "@/components/ui/card"
import { AnimatePresence, motion } from "framer-motion"

interface Photo {
    id: string
    name: string
    url: string
    fullUrl: string
    downloadUrl?: string
    folderName?: string   // Immediate parent folder name
    folderPath?: string   // Full path for grouping
    createdTime?: string
}

interface ClientViewProps {
    config: {
        clientName: string
        maxPhotos: number
        adminWhatsapp: string  // Admin WhatsApp for receiving results
        gdriveLink: string
        detectSubfolders: boolean
        expiresAt?: number
        downloadExpiresAt?: number
        hasPassword?: boolean
        projectId?: string
        lockedPhotos?: string[] // Previously selected photo filenames
    }
    messageTemplates?: {
        resultInitial: { id: string, en: string } | null
        resultExtra: { id: string, en: string } | null
    } | null
}

export function ClientView({ config, messageTemplates }: ClientViewProps) {
    const t = useTranslations('Client')
    const currentLocale = useLocale()
    const { selected, toggleSelection, clearSelection, setSelection, setProjectId, projectId } = useSelectionStore()
    const isHydrated = useStoreHydration() // Use proper Zustand hydration detection
    const [photos, setPhotos] = useState<Photo[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [alertMax, setAlertMax] = useState(false)
    const [copied, setCopied] = useState(false)

    // View mode state: 'initial' = landing choice, 'culling' = select photos, 'download' = download mode, 'review' = review selected
    const [viewMode, setViewMode] = useState<'initial' | 'culling' | 'download' | 'review'>('initial')
    // Download mode selection (separate from culling selection)
    const [downloadSelected, setDownloadSelected] = useState<string[]>([])
    const [isDownloading, setIsDownloading] = useState(false)
    const [downloadProgress, setDownloadProgress] = useState(0)
    const [downloadStatusText, setDownloadStatusText] = useState('')
    const abortControllerRef = useRef<AbortController | null>(null)

    // Password dialog state (shown when clicking 'Pilih Foto' on password-protected albums)
    const [showPasswordDialog, setShowPasswordDialog] = useState(false)

    // Generate a unique project identifier from config (defined early for use in state initializers)
    const currentProjectId = `${config.clientName}-${config.gdriveLink}`.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50)

    // Password protection state
    const [isPasswordProtected] = useState(!!config.hasPassword)
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        // Check sessionStorage for existing auth (client-side only)
        if (typeof window !== 'undefined' && config.hasPassword) {
            const authKey = `fastpik-auth-${config.clientName}-${config.gdriveLink}`.replace(/[^a-zA-Z0-9-]/g, '-').substring(0, 60)
            return sessionStorage.getItem(authKey) === 'true'
        }
        return !config.hasPassword
    })
    const [passwordInput, setPasswordInput] = useState("")
    const [passwordError, setPasswordError] = useState(false)
    const [passwordLoading, setPasswordLoading] = useState(false)
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
    const [showDownloadAllDialog, setShowDownloadAllDialog] = useState(false)
    const [showDownloadClearDialog, setShowDownloadClearDialog] = useState(false)

    // Selection sync state
    const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const lastSyncedRef = useRef<string>('')

    // Time remaining state for countdown
    const [timeRemaining, setTimeRemaining] = useState<{ days: number, hours: number, minutes: number } | null>(null)

    // Portal ref for PhotoGrid header
    const photoGridHeaderRef = useRef<HTMLDivElement | null>(null)

    // Check if project is expired (client-side only to avoid hydration mismatch)
    const [isSelectionExpired, setIsSelectionExpired] = useState(false)
    const [isDownloadExpired, setIsDownloadExpired] = useState(false)

    useEffect(() => {
        setIsSelectionExpired(config.expiresAt ? Date.now() > config.expiresAt : false)

        // Calculate time remaining for selection
        if (config.expiresAt) {
            const calculateTimeRemaining = () => {
                const now = Date.now()
                const diff = config.expiresAt! - now

                if (diff <= 0) {
                    setTimeRemaining(null)
                    setIsSelectionExpired(true)
                } else {
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                    setTimeRemaining({ days, hours, minutes })
                }
            }

            calculateTimeRemaining()
            const interval = setInterval(calculateTimeRemaining, 60000)
            return () => clearInterval(interval)
        } else {
            setTimeRemaining(null)
        }
    }, [config.expiresAt])

    // Download expiry state
    const [downloadTimeRemaining, setDownloadTimeRemaining] = useState<{ days: number, hours: number, minutes: number } | null>(null)

    useEffect(() => {
        const downloadExpiry = config.downloadExpiresAt
        setIsDownloadExpired(downloadExpiry ? Date.now() > downloadExpiry : false)

        if (downloadExpiry) {
            const calcDownloadTime = () => {
                const now = Date.now()
                const diff = downloadExpiry - now

                if (diff <= 0) {
                    setDownloadTimeRemaining(null)
                    setIsDownloadExpired(true)
                } else {
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                    setDownloadTimeRemaining({ days, hours, minutes })
                }
            }

            calcDownloadTime()
            const interval = setInterval(calcDownloadTime, 60000)
            return () => clearInterval(interval)
        } else {
            setDownloadTimeRemaining(null)
        }
    }, [config.downloadExpiresAt, config.expiresAt])

    // Both expired = fully expired
    const isFullyExpired = isSelectionExpired && isDownloadExpired

    // Generate auth storage key (must match the one used in state initializer)
    const authStorageKey = `fastpik-auth-${config.clientName}-${config.gdriveLink}`.replace(/[^a-zA-Z0-9-]/g, '-').substring(0, 60)

    // Session key for tracking if we've already checked this project in this browser session
    const sessionCheckKey = `fastpik-session-${currentProjectId}`

    // Check for existing session on mount (only after hydration and only once per browser session)
    useEffect(() => {
        if (!isHydrated) return

        // Check if we've already done the session check in this browser tab
        const alreadyChecked = sessionStorage.getItem(sessionCheckKey)
        if (alreadyChecked) {
            // Already checked this session - just ensure project ID is set correctly
            if (projectId !== currentProjectId) {
                setProjectId(currentProjectId)
            }
            return
        }

        // Mark as checked for this browser session
        sessionStorage.setItem(sessionCheckKey, 'true')

        if (projectId === currentProjectId && selected.length > 0) {
            // Same project, has previous selection - ask to restore
            setHasPendingSelection(true)
            setShowRestoreDialog(true)
        } else if (projectId !== currentProjectId) {
            // Different project - set project and clear
            setProjectId(currentProjectId)
        }
        // If same project but no selection, do nothing (keep existing state)
    }, [isHydrated])

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

    // Fetch photos - runs when authenticated OR when entering download mode (no password needed for download)
    useEffect(() => {
        if (!hasPendingSelection) {
            // For culling: need authentication. For download and initial: always fetch photos
            if (isAuthenticated || viewMode === 'download' || viewMode === 'initial') {
                fetchPhotos()
            }
        }
    }, [isAuthenticated, hasPendingSelection, viewMode])

    // Auto-select locked photos when photos are loaded (fixes counter showing 0/8 instead of 5/8)
    // Must be before early returns to maintain consistent hook order
    useEffect(() => {
        if (photos.length > 0 && config.lockedPhotos && config.lockedPhotos.length > 0 && viewMode === 'culling') {
            const getNameNoExt = (name: string) => name.replace(/\.[^/.]+$/, '')
            const lockedNames = config.lockedPhotos.map(n => getNameNoExt(n))
            const lockedPhotoIds = photos
                .filter(p => lockedNames.includes(getNameNoExt(p.name)))
                .map(p => p.id)
                .filter(id => !selected.includes(id))

            if (lockedPhotoIds.length > 0) {
                lockedPhotoIds.forEach(id => {
                    toggleSelection(id, config.maxPhotos)
                })
            }
        }
    }, [photos, viewMode])

    // Debounced sync: auto-sync selections to server 2 seconds after last toggle
    // MUST be before early returns to maintain consistent hook order
    useEffect(() => {
        // Only sync in culling mode with a valid project ID and loaded photos
        if (viewMode !== 'culling' || !config.projectId || photos.length === 0) return

        const getNameNoExt = (name: string | undefined) => {
            if (!name) return ''
            return name.replace(/\.[^/.]+$/, '')
        }

        // Build the list of selected photo names
        const selectedNames = selected
            .map(id => getNameNoExt(photos.find(p => p.id === id)?.name))
            .filter(Boolean)

        const serialized = JSON.stringify(selectedNames)

        // Skip if nothing changed since last sync
        if (serialized === lastSyncedRef.current) return

        // Clear previous timer
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current)

        // Set new debounce timer (2 seconds)
        syncTimerRef.current = setTimeout(async () => {
            try {
                await fetch(`/api/projects/${config.projectId}/sync-selection`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ selectedPhotos: selectedNames })
                })
                lastSyncedRef.current = serialized
            } catch (err) {
                console.error('Failed to sync selection:', err)
            }
        }, 2000)

        return () => {
            if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
        }
    }, [selected, viewMode, config.projectId, photos])

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setPasswordLoading(true)
        setPasswordError(false)
        try {
            const res = await fetch('/api/projects/verify-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: config.projectId, password: passwordInput })
            })
            const data = await res.json()
            if (data.success) {
                setIsAuthenticated(true)
                sessionStorage.setItem(authStorageKey, 'true')
            } else {
                setPasswordError(true)
            }
        } catch {
            setPasswordError(true)
        } finally {
            setPasswordLoading(false)
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
                    folderPath: photo.folderPath,
                    createdTime: photo.createdTime
                }))
                setPhotos(drivePhotos)

                // Debug: Log unique folders
                const uniqueFolders = [...new Set(drivePhotos.map(p => p.folderName).filter(Boolean))]
                console.log('📁 Unique folders found:', uniqueFolders)
                console.log('📊 Photos per folder:', drivePhotos.reduce((acc, p) => {
                    const folder = p.folderName || 'undefined'
                    acc[folder] = (acc[folder] || 0) + 1
                    return acc
                }, {} as Record<string, number>))

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

    // Password wall - blocks everything if password is set and not authenticated
    if (isPasswordProtected && !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6 space-y-6">
                        <div className="text-center space-y-2">
                            <Lock className="h-12 w-12 mx-auto text-primary" />
                            <h1 className="text-xl font-bold">{config.clientName}</h1>
                            <p className="text-muted-foreground text-sm">{t('passwordProtected')}</p>
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
                                    disabled={passwordLoading}
                                    autoComplete="new-password"
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
                            <Button type="submit" className="w-full cursor-pointer" disabled={passwordLoading || !passwordInput}>
                                {passwordLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                {passwordLoading ? (t('verifying') || 'Verifying...') : `${t('unlock') || 'Unlock'} 🔓`}
                            </Button>
                        </form>
                        <div className="flex justify-center gap-2">
                            <LanguageToggle />
                            <ThemeToggle />
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (isFullyExpired) {
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

    // Landing choice screen - shown before main content (password not required)
    if (viewMode === 'initial') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
                <Card className="w-full max-w-lg shadow-2xl border-0 bg-card/80 backdrop-blur-xl">
                    <CardContent className="pt-8 pb-10 space-y-8">
                        <div className="text-center space-y-3">
                            <div className="text-5xl mb-2">📸</div>
                            <h1 className="text-2xl font-bold tracking-tight">{config.clientName}</h1>
                            <p className="text-muted-foreground">{t('chooseAction')}</p>
                        </div>

                        <div className="grid gap-4">
                            {/* Select Photos Option */}
                            <button
                                onClick={() => !isSelectionExpired && setViewMode('culling')}
                                disabled={isSelectionExpired}
                                className={cn(
                                    "group relative flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-300",
                                    isSelectionExpired
                                        ? "border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 opacity-60 cursor-not-allowed"
                                        : "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30 hover:border-green-400 dark:hover:border-green-600 hover:bg-green-100/80 dark:hover:bg-green-900/40 cursor-pointer"
                                )}
                            >
                                <div className={cn(
                                    "flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform",
                                    isSelectionExpired ? "bg-gray-400" : "bg-green-500 group-hover:scale-110"
                                )}>
                                    <MousePointerClick className="w-7 h-7 text-white" />
                                </div>
                                <div className="text-left flex-1">
                                    <h3 className={cn(
                                        "font-semibold text-lg",
                                        isSelectionExpired ? "text-gray-400" : "text-green-700 dark:text-green-300"
                                    )}>
                                        {t('selectPhotos')}
                                        {isSelectionExpired && " ⏰"}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {isSelectionExpired ? t('linkExpired') : t('selectPhotosDesc')}
                                    </p>
                                </div>
                            </button>

                            {/* Download Photos Option */}
                            <button
                                onClick={() => !isDownloadExpired && setViewMode('download')}
                                disabled={isDownloadExpired}
                                className={cn(
                                    "group relative flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-300",
                                    isDownloadExpired
                                        ? "border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 opacity-60 cursor-not-allowed"
                                        : "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-100/80 dark:hover:bg-blue-900/40 cursor-pointer"
                                )}
                            >
                                <div className={cn(
                                    "flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform",
                                    isDownloadExpired ? "bg-gray-400" : "bg-blue-500 group-hover:scale-110"
                                )}>
                                    <Download className="w-7 h-7 text-white" />
                                </div>
                                <div className="text-left flex-1">
                                    <h3 className={cn(
                                        "font-semibold text-lg",
                                        isDownloadExpired ? "text-gray-400" : "text-blue-700 dark:text-blue-300"
                                    )}>
                                        {t('downloadPhotos')}
                                        {isDownloadExpired && " ⏰"}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {isDownloadExpired ? t('linkExpired') : t('downloadPhotosDesc')}
                                    </p>
                                </div>
                            </button>
                        </div>

                        <div className="flex justify-center gap-2 pt-2">
                            <LanguageToggle />
                            <ThemeToggle />
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Helper to get name without extension (must be defined before usage)
    const getNameWithoutExt = (name: string | undefined) => {
        if (!name) return ''
        return name.replace(/\.[^/.]+$/, '')
    }

    // Get list of locked photo names (without extension for comparison)
    const lockedPhotoNames = config.lockedPhotos?.map(name => getNameWithoutExt(name)) || []

    // Helper to check if a photo is locked
    const isPhotoLocked = (photo: Photo) => {
        const photoNameWithoutExt = getNameWithoutExt(photo.name)
        return lockedPhotoNames.includes(photoNameWithoutExt)
    }

    const handleToggle = (id: string) => {
        const photo = photos.find(p => p.id === id)

        // Prevent unlocking locked photos
        if (photo && isPhotoLocked(photo)) {
            return
        }

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

    const copyList = () => {
        let listText: string

        if (lockedPhotoNames.length > 0) {
            // Format with separators for extra photos project
            const lockedList = lockedPhotoNames.join('\n')
            const newPhotos = selected
                .map(id => getNameWithoutExt(photos.find(p => p.id === id)?.name))
                .filter(name => !lockedPhotoNames.includes(name || ''))
            const newList = newPhotos.join('\n')

            listText = `=== ${t('previousPhotos')} (${lockedPhotoNames.length}) ===\n${lockedList}\n\n=== ${t('additionalPhotos')} (${newPhotos.length}) ===\n${newList}`
        } else {
            // Plain list for normal project
            listText = selected.map(id => getNameWithoutExt(photos.find(p => p.id === id)?.name)).join('\n')
        }

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

    const compileMessage = (template: { id: string, en: string } | null, variables: Record<string, string>, defaultMsg: string) => {
        const lang = currentLocale as 'id' | 'en'
        const tmplText = template?.[lang] || ""

        if (tmplText.trim()) {
            let msg = tmplText
            Object.entries(variables).forEach(([key, val]) => {
                msg = msg.replace(new RegExp(`{{${key}}}`, 'g'), val)
            })
            return msg
        }
        return defaultMsg
    }

    const sendWhatsapp = () => {
        let listText: string
        let totalCount: number

        if (lockedPhotoNames.length > 0) {
            // Format with separators for extra photos project
            const lockedList = lockedPhotoNames.join('\n')
            const newPhotos = selected
                .map(id => getNameWithoutExt(photos.find(p => p.id === id)?.name))
                .filter(name => !lockedPhotoNames.includes(name || ''))
            const newList = newPhotos.join('\n')

            listText = `=== ${t('previousPhotos')} (${lockedPhotoNames.length}) ===\n${lockedList}\n\n=== ${t('additionalPhotos')} (${newPhotos.length}) ===\n${newList}`
            totalCount = lockedPhotoNames.length + newPhotos.length
        } else {
            // Plain list for normal project
            listText = selected.map(id => getNameWithoutExt(photos.find(p => p.id === id)?.name)).join('\n')
            totalCount = selected.length
        }

        const variables = {
            client_name: config.clientName,
            count: totalCount.toString(),
            list: listText,
            link: config.gdriveLink || ''
        }

        const template = (lockedPhotoNames.length > 0) ? messageTemplates?.resultExtra : messageTemplates?.resultInitial
        const defaultMsg = `${t('waMessageIntro')}\n\n${t('waMessageBody')} (${totalCount} ${t('waMessagePhotos')}):\n\n${listText}\n\n${t('waMessageThanks')}`

        const message = compileMessage(template || null, variables, defaultMsg)

        window.open(`https://wa.me/${config.adminWhatsapp}?text=${encodeURIComponent(message)}`, '_blank')
    }

    const handleClearSelection = () => {
        // If there are locked photos, keep them and only clear new selections
        if (config.lockedPhotos && config.lockedPhotos.length > 0) {
            const getNameNoExt = (name: string) => name.replace(/\.[^/.]+$/, '')
            const lockedNames = config.lockedPhotos.map(n => getNameNoExt(n))

            const lockedPhotoIds = photos
                .filter(p => lockedNames.includes(getNameNoExt(p.name)))
                .map(p => p.id)

            // Set selection to ONLY the locked photos
            setSelection(lockedPhotoIds)
        } else {
            // Normal project, clear everything
            clearSelection()
        }
        setShowClearDialog(false)
        setToastMessage(t('selectionCleared'))
        setShowToast(true)
    }

    // Download mode toggle handler
    const handleDownloadToggle = (id: string) => {
        setDownloadSelected(prev =>
            prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id]
        )
    }

    // Helper: delay
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    // Constants
    const DIRECT_TEST_COUNT = 3

    // Download via direct Google Drive API (no bandwidth cost, but may get rate-limited)
    const downloadDirect = async (photo: Photo, signal: AbortSignal): Promise<Blob | null> => {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY
        if (!apiKey) return null

        try {
            const directUrl = `https://www.googleapis.com/drive/v3/files/${photo.id}?alt=media&key=${apiKey}`
            const response = await fetch(directUrl, { signal })
            if (response.ok) return await response.blob()
            return null
        } catch (err: any) {
            if (err.name === 'AbortError') throw err
            return null
        }
    }

    // Download via Cloudflare Worker proxy (zero Vercel bandwidth)
    const downloadViaCFWorker = async (photo: Photo, signal: AbortSignal): Promise<Blob | null> => {
        const cfWorkerUrl = process.env.NEXT_PUBLIC_CF_WORKER_URL
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY
        if (!cfWorkerUrl) return null

        // Use googleapis API URL (more stable than drive.google.com)
        const targetUrl = apiKey
            ? `https://www.googleapis.com/drive/v3/files/${photo.id}?alt=media&key=${apiKey}`
            : (photo.downloadUrl || photo.fullUrl || photo.url)

        // Retry once on 500 errors
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                if (signal.aborted) throw new DOMException('Download cancelled', 'AbortError')
                const response = await fetch(`${cfWorkerUrl}?url=${encodeURIComponent(targetUrl)}`, { signal })
                if (response.ok) return await response.blob()

                if (response.status >= 500 && attempt === 0) {
                    console.warn(`[CF Worker] 500 for "${photo.name}", retrying...`)
                    await delay(1000)
                    continue
                }
                return null
            } catch (err: any) {
                if (err.name === 'AbortError') throw err
                if (attempt === 0) {
                    await delay(1000)
                    continue
                }
                console.warn(`[CF Worker] Error for ${photo.name}:`, err.message)
                return null
            }
        }
        return null
    }

    // Open Google Drive direct download in new tab (ultimate fallback)
    const redirectToGDrive = (photo: Photo) => {
        window.open(`https://drive.google.com/uc?id=${photo.id}&export=download`, '_blank')
    }

    // Parallel download helper: runs tasks in batches of `concurrency`
    const downloadParallel = async (
        photos: Photo[],
        signal: AbortSignal,
        useDirect: boolean,
        onProgress: (completed: number) => void
    ): Promise<{ blobs: Map<string, Blob>; failed: Photo[] }> => {
        const blobs = new Map<string, Blob>()
        const failed: Photo[] = []
        let completed = 0
        const isMobile = window.innerWidth < 768
        const CONCURRENCY = isMobile ? 3 : 5

        for (let i = 0; i < photos.length; i += CONCURRENCY) {
            if (signal.aborted) throw new DOMException('Download cancelled', 'AbortError')

            const chunk = photos.slice(i, i + CONCURRENCY)
            const promises = chunk.map(async (photo) => {
                try {
                    let blob: Blob | null = null

                    if (useDirect) {
                        blob = await downloadDirect(photo, signal)
                    }

                    if (!blob) {
                        blob = await downloadViaCFWorker(photo, signal)
                    }

                    if (blob) {
                        blobs.set(photo.name, blob)
                    } else {
                        failed.push(photo)
                    }
                } catch (err: any) {
                    if (err.name === 'AbortError') throw err
                    console.error(`Failed: ${photo.name}`, err)
                    failed.push(photo)
                }

                completed++
                onProgress(completed)
            })

            await Promise.all(promises)
        }

        return { blobs, failed }
    }

    // Helper: format ETA
    const formatETA = (seconds: number): string => {
        if (seconds < 60) return `~${Math.ceil(seconds)}s`
        const mins = Math.floor(seconds / 60)
        const secs = Math.ceil(seconds % 60)
        return `~${mins}m ${secs}s`
    }

    // Main download function with adaptive strategy + parallel + auto-batch
    const handleDownloadPhotos = async (photoIds: string[]) => {
        if (photoIds.length === 0) return

        const controller = new AbortController()
        abortControllerRef.current = controller
        setIsDownloading(true)
        setDownloadProgress(0)
        setDownloadStatusText(t('preparingDownload'))

        const downloadStartTime = Date.now()
        let totalCompleted = 0
        const totalPhotos = photoIds.length

        const updateProgress = (completed: number, batchOffset: number) => {
            totalCompleted = batchOffset + completed
            const pct = Math.round((totalCompleted / totalPhotos) * 100)
            setDownloadProgress(pct)

            const elapsed = (Date.now() - downloadStartTime) / 1000
            const rate = totalCompleted / elapsed // photos per second
            const remaining = totalPhotos - totalCompleted
            const eta = rate > 0 ? remaining / rate : 0

            setDownloadStatusText(`${totalCompleted}/${totalPhotos} foto${eta > 2 ? ` • ${formatETA(eta)}` : ''}`)
        }

        try {
            const photosToDownload = photos.filter(p => photoIds.includes(p.id))

            // === SINGLE PHOTO: direct save (no ZIP) ===
            if (photosToDownload.length === 1) {
                const photo = photosToDownload[0]
                let blob = await downloadDirect(photo, controller.signal)
                if (!blob) blob = await downloadViaCFWorker(photo, controller.signal)
                if (blob) {
                    const { saveAs } = await import('file-saver')
                    saveAs(blob, photo.name)
                    setToastMessage(t('downloadComplete'))
                    setShowToast(true)
                } else {
                    // All APIs failed → redirect to Google Drive
                    redirectToGDrive(photo)
                    setToastMessage(t('downloadFailed'))
                    setShowToast(true)
                }
                return
            }

            // === ADAPTIVE STRATEGY: test direct on first N photos ===
            let useDirect = false
            const testPhotos = photosToDownload.slice(0, DIRECT_TEST_COUNT)
            let directSuccessCount = 0

            console.log(`[Adaptive] Testing direct Google API on ${testPhotos.length} photos...`)

            for (const photo of testPhotos) {
                if (controller.signal.aborted) throw new DOMException('Download cancelled', 'AbortError')
                const blob = await downloadDirect(photo, controller.signal)
                if (blob) {
                    directSuccessCount++
                }
            }

            // Use direct if majority (>50%) of test photos succeeded
            useDirect = directSuccessCount > DIRECT_TEST_COUNT / 2
            console.log(`[Adaptive] Direct success: ${directSuccessCount}/${testPhotos.length} → ${useDirect ? 'Using DIRECT + CF Worker fallback' : 'Using CF Worker only (faster)'}`)

            // === MULTIPLE PHOTOS: parallel download + auto-batch ZIP ===
            const isMobile = window.innerWidth < 768
            const BATCH_SIZE = isMobile ? 50 : 200
            const totalBatches = Math.ceil(photosToDownload.length / BATCH_SIZE)
            const isBatched = totalBatches > 1

            for (let batch = 0; batch < totalBatches; batch++) {
                if (controller.signal.aborted) throw new DOMException('Download cancelled', 'AbortError')

                const batchStart = batch * BATCH_SIZE
                const batchEnd = Math.min(batchStart + BATCH_SIZE, photosToDownload.length)
                const batchPhotos = photosToDownload.slice(batchStart, batchEnd)

                if (isBatched) {
                    console.log(`[Download] Batch ${batch + 1}/${totalBatches} (${batchPhotos.length} photos)`)
                }

                // Download all photos in this batch using parallel downloads
                const { blobs, failed } = await downloadParallel(
                    batchPhotos,
                    controller.signal,
                    useDirect,
                    (completed) => {
                        updateProgress(completed, batchStart)
                    }
                )

                // Create ZIP from downloaded blobs
                if (blobs.size > 0) {
                    setDownloadStatusText(isBatched
                        ? `ZIP ${batch + 1}/${totalBatches}...`
                        : `ZIP...`
                    )
                    const [{ default: JSZip }, { saveAs }] = await Promise.all([
                        import('jszip'),
                        import('file-saver'),
                    ])
                    const zip = new JSZip()
                    for (const [name, blob] of blobs) {
                        zip.file(name, blob)
                    }

                    const zipName = isBatched
                        ? `${config.clientName}-photos-${batch + 1}.zip`
                        : `${config.clientName}-photos.zip`

                    const content = await zip.generateAsync({ type: 'blob' })
                    saveAs(content, zipName)
                }

                // Redirect failed photos to Google Drive (max 5 tabs to avoid popup blocker)
                if (failed.length > 0) {
                    console.warn(`[Fallback] ${failed.length} photos failed, redirecting to Google Drive`)
                    const maxRedirects = Math.min(failed.length, 5)
                    for (let r = 0; r < maxRedirects; r++) {
                        redirectToGDrive(failed[r])
                    }
                }

                // Brief pause between batches
                if (isBatched && batch < totalBatches - 1) {
                    await delay(1000)
                }
            }

            const msg = isBatched
                ? `${t('downloadComplete')} (${totalBatches} ZIP)`
                : t('downloadComplete')
            setToastMessage(msg)
            setShowToast(true)
        } catch (err: any) {
            if (err.name === 'AbortError') {
                setToastMessage(t('downloadStopped'))
                setShowToast(true)
            } else {
                console.error('Download failed:', err)
                setToastMessage(t('downloadFailed'))
                setShowToast(true)
            }
        } finally {
            abortControllerRef.current = null
            setIsDownloading(false)
            setDownloadProgress(0)
            setDownloadStatusText('')
        }
    }

    // Stop download handler
    const handleStopDownload = () => {
        abortControllerRef.current?.abort()
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
            {/* Header + Countdown Banner - Sticky as one unit */}
            <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md transition-all">
                <div className="border-b p-4 flex justify-between items-center">
                    {viewMode === 'download' ? (
                        <>
                            {/* Download Mode Header */}
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setViewMode('initial')}
                                    className="cursor-pointer"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                <div>
                                    <h1 className="font-bold text-lg">{config.clientName}</h1>
                                    <p className="text-xs text-muted-foreground">
                                        {downloadSelected.length > 0
                                            ? `${downloadSelected.length} ${t('photosToDownload')}`
                                            : t('selectToDownload')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {isDownloading ? (
                                    <>
                                        <span className="text-xs text-muted-foreground hidden sm:inline">{downloadProgress}%</span>
                                        <Button
                                            onClick={handleStopDownload}
                                            size="sm"
                                            className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                                        >
                                            <Square className="h-3 w-3 mr-1 fill-current" />
                                            {t('stopDownload')}
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        onClick={() => setShowDownloadAllDialog(true)}
                                        disabled={photos.length === 0}
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                                    >
                                        <Download className="h-4 w-4 mr-1" />
                                        <span className="hidden sm:inline">{t('downloadAll')}</span>
                                    </Button>
                                )}
                                <ThemeToggle />
                                <LanguageToggle />
                            </div>
                        </>
                    ) : viewMode === 'review' ? (
                        <>
                            {/* Review Mode Header */}
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setViewMode('culling')}
                                    className="cursor-pointer"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                <div>
                                    <h1 className="font-bold text-lg">{t('reviewTitle')}</h1>
                                    <p className="text-xs text-muted-foreground">
                                        {selected.length} / {config.maxPhotos} {t('selected')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <ThemeToggle />
                                <LanguageToggle />
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Culling Mode Header */}
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setViewMode('initial')}
                                    className="cursor-pointer"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                <div>
                                    <h1 className="font-bold text-lg">{config.clientName}</h1>
                                    <p className={cn(
                                        "text-xs transition-colors",
                                        alertMax ? "text-red-500 font-semibold" : "text-muted-foreground"
                                    )}>
                                        {selected.length} / {config.maxPhotos} {t('selected')}
                                        {lockedPhotoNames.length > 0 && (
                                            <span className="ml-2 text-amber-600 dark:text-amber-400">
                                                🔒 {lockedPhotoNames.length} {t('lockedPhotosCount')}
                                            </span>
                                        )}
                                        {alertMax && ` ⚠️ ${t('maxLimit')}`}
                                    </p>
                                </div>
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
                        </>
                    )}
                </div>

                {/* Countdown Banner - Inside sticky header */}
                {(() => {
                    const activeTimeRemaining = viewMode === 'download' ? downloadTimeRemaining : timeRemaining
                    const activeExpired = viewMode === 'download' ? isDownloadExpired : isSelectionExpired
                    if (activeTimeRemaining && !activeExpired) {
                        return (
                            <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2">
                                <div className="flex items-center justify-center gap-2 text-sm">
                                    <span className="text-amber-700 dark:text-amber-400 font-medium">⏰ {t('linkExpiresIn')}:</span>
                                    <span className="text-amber-900 dark:text-amber-200 font-semibold">
                                        {activeTimeRemaining.days > 0 && `${activeTimeRemaining.days} ${t('days')} `}
                                        {activeTimeRemaining.hours > 0 && `${activeTimeRemaining.hours} ${t('hours')} `}
                                        {activeTimeRemaining.minutes > 0 && `${activeTimeRemaining.minutes} ${t('minutes')}`}
                                    </span>
                                </div>
                            </div>
                        )
                    }
                    return null
                })()}

                {/* Portal slot for PhotoGrid's header (breadcrumb + sort) */}
                <div ref={photoGridHeaderRef} />
            </div>

            {/* Error State */}
            {error && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <p className="text-red-500">{error}</p>
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
            ) : viewMode === 'download' ? (
                <PhotoGrid
                    photos={photos}
                    selected={downloadSelected}
                    onToggle={handleDownloadToggle}
                    onZoom={handleZoom}
                    detectSubfolders={config.detectSubfolders}
                    lockedPhotoNames={[]}
                    headerPortalRef={photoGridHeaderRef}
                />
            ) : viewMode === 'review' ? (
                // Review Mode: show only selected photos
                <div className="p-4 space-y-4">
                    <div className="text-center space-y-1">
                        <p className="text-sm text-muted-foreground">
                            {selected.length} / {config.maxPhotos} {t('selected')}
                        </p>
                    </div>
                    {selected.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <ImageOff className="h-12 w-12 text-muted-foreground" />
                            <p className="text-muted-foreground">{t('noPhotosSelected')}</p>
                            <Button onClick={() => setViewMode('culling')} variant="outline" className="cursor-pointer">
                                <ArrowLeft className="h-4 w-4 mr-2" />{t('backToSelect')}
                            </Button>
                        </div>
                    ) : (() => {
                        const selectedPhotos = photos.filter(p => selected.includes(p.id))
                        const hasLockedPhotos = lockedPhotoNames.length > 0
                        const lockedSelected = hasLockedPhotos ? selectedPhotos.filter(p => isPhotoLocked(p)) : []
                        const extraSelected = hasLockedPhotos ? selectedPhotos.filter(p => !isPhotoLocked(p)) : selectedPhotos

                        const renderPhotoGrid = (photoList: typeof photos, borderColor: string = 'border-primary') => (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {photoList.map((photo) => (
                                    <div
                                        key={photo.id}
                                        className={cn("relative group aspect-[4/3] rounded-lg overflow-hidden cursor-pointer border-2 bg-muted", borderColor)}
                                        onClick={() => handleZoom(photo)}
                                    >
                                        <img
                                            src={photo.url}
                                            alt={photo.name}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                        {/* Hover overlay with zoom */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                                            <div className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white">
                                                <ZoomIn className="w-5 h-5" />
                                            </div>
                                        </div>
                                        {/* Filename */}
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 truncate z-20">
                                            {photo.name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )

                        return hasLockedPhotos ? (
                            <div className="space-y-6">
                                {/* Previous/Original photos section */}
                                {lockedSelected.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="h-px flex-1 bg-amber-300 dark:bg-amber-700" />
                                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 px-2">
                                                <Lock className="h-3.5 w-3.5" />
                                                {t('previousPhotos')} ({lockedSelected.length})
                                            </span>
                                            <div className="h-px flex-1 bg-amber-300 dark:bg-amber-700" />
                                        </div>
                                        {renderPhotoGrid(lockedSelected, 'border-amber-400 dark:border-amber-600')}
                                    </div>
                                )}
                                {/* Extra/New photos section */}
                                {extraSelected.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="h-px flex-1 bg-emerald-300 dark:bg-emerald-700" />
                                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 px-2">
                                                <Check className="h-3.5 w-3.5" />
                                                {t('additionalPhotos')} ({extraSelected.length})
                                            </span>
                                            <div className="h-px flex-1 bg-emerald-300 dark:bg-emerald-700" />
                                        </div>
                                        {renderPhotoGrid(extraSelected, 'border-emerald-400 dark:border-emerald-600')}
                                    </div>
                                )}
                            </div>
                        ) : renderPhotoGrid(extraSelected)
                    })()}
                </div>
            ) : (
                <PhotoGrid
                    photos={photos}
                    selected={selected}
                    onToggle={handleToggle}
                    onZoom={handleZoom}
                    detectSubfolders={config.detectSubfolders}
                    lockedPhotoNames={lockedPhotoNames}
                    headerPortalRef={photoGridHeaderRef}
                />
            )}

            {/* Photo Lightbox - Conditional based on viewMode */}
            <PhotoLightbox
                photos={lightboxPhotos}
                initialIndex={lightboxIndex}
                isOpen={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
                selectedIds={viewMode === 'download' ? downloadSelected : selected}
                onToggleSelect={viewMode === 'download' ? handleDownloadToggle : handleToggle}
                maxPhotos={viewMode === 'download' ? Infinity : config.maxPhotos}
            />

            {/* Bottom Bar - Conditional based on viewMode */}
            <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-background/95 backdrop-blur-md border-t shadow-[0_-5px_20px_rgba(0,0,0,0.1)]">
                {viewMode === 'download' ? (
                    // Download Mode Bottom Bar
                    <div className="flex flex-col gap-2 w-full max-w-xl mx-auto">
                        {downloadSelected.length > 0 && (
                            <div className="text-xs text-muted-foreground text-center">
                                {downloadSelected.length} {t('photosToDownload')}
                            </div>
                        )}
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowDownloadClearDialog(true)}
                                disabled={downloadSelected.length === 0}
                                className="shrink-0 cursor-pointer text-red-500 border-red-200 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t('clearSelection')}
                            </Button>
                            <Button
                                onClick={() => handleDownloadPhotos(downloadSelected)}
                                disabled={downloadSelected.length === 0 || isDownloading}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                            >
                                {isDownloading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        <span className="text-xs">{downloadStatusText || `${downloadProgress}%`}</span>
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-4 w-4 mr-2" />
                                        {t('downloadSelected')} ({downloadSelected.length})
                                    </>
                                )}
                            </Button>
                            {isDownloading && (
                                <Button
                                    onClick={handleStopDownload}
                                    className="shrink-0 bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                                >
                                    <Square className="h-4 w-4 mr-1 fill-current" />
                                    {t('stopDownload')}
                                </Button>
                            )}
                        </div>
                    </div>
                ) : viewMode === 'review' ? (
                    // Review Mode Bottom Bar
                    <>
                        <div className="flex flex-col md:flex-row gap-2 md:gap-3 w-full max-w-xl mx-auto md:max-w-none md:justify-center">
                            {/* Back to Edit */}
                            <Button
                                variant="outline"
                                onClick={() => setViewMode('culling')}
                                className="gap-2 cursor-pointer md:order-1"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                {t('editSelection')}
                            </Button>

                            {/* Copy List Button */}
                            <Button
                                variant="outline"
                                onClick={copyList}
                                disabled={selected.length === 0}
                                className={cn(
                                    "gap-2 cursor-pointer md:order-2",
                                    copied && "bg-green-100 text-green-700 border-green-200"
                                )}
                            >
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                {copied ? t('copied') : t('copyList')}
                            </Button>

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
                    </>
                ) : (
                    // Culling Mode Bottom Bar
                    <>
                        {selected.length > 0 && (
                            <div className="mb-2 text-xs text-muted-foreground text-center px-4 truncate">
                                {t('chosenPhotos')}: {selectedPhotoNames.join(', ')}{selected.length > 5 && ` +${selected.length - 5} ${t('more')}`}
                            </div>
                        )}
                        <div className="flex gap-2 w-full max-w-xl mx-auto">
                            {/* Clear Selection Button */}
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setShowClearDialog(true)}
                                disabled={selected.length === 0}
                                className="shrink-0 cursor-pointer text-red-500 border-red-200 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>

                            {/* Review Selection Button */}
                            <Button
                                onClick={() => setViewMode('review')}
                                disabled={selected.length === 0}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2 cursor-pointer"
                            >
                                <Eye className="h-4 w-4" />
                                {t('reviewSelection')} ({selected.length})
                            </Button>
                        </div>
                    </>
                )}
            </div>

            {/* Clear Selection Confirmation Dialog (Culling Mode) */}
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

            {/* Clear Selection Confirmation Dialog (Download Mode) */}
            <PopupDialog
                isOpen={showDownloadClearDialog}
                onClose={() => setShowDownloadClearDialog(false)}
                onConfirm={() => {
                    setDownloadSelected([])
                    setShowDownloadClearDialog(false)
                }}
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

            {/* Download All Confirmation Dialog */}
            <PopupDialog
                isOpen={showDownloadAllDialog}
                onClose={() => setShowDownloadAllDialog(false)}
                onConfirm={() => {
                    setShowDownloadAllDialog(false)
                    handleDownloadPhotos(photos.map(p => p.id))
                }}
                title={t('confirmDownloadAll')}
                message={t('confirmDownloadAllMsg', { count: photos.length })}
                type="info"
                confirmText={t('continue')}
                cancelText={t('cancel')}
            />
        </div>
    )
}
