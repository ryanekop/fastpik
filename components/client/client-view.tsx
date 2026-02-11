"use client"

import { useState, useEffect, useRef } from "react"
import { useSelectionStore, useStoreHydration } from "@/lib/store"
import { PhotoGrid } from "./photo-grid"
import { PhotoLightbox } from "./photo-lightbox"
import { useTranslations, useLocale } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { PopupDialog, Toast } from "@/components/ui/popup-dialog"
import { Copy, Send, AlertCircle, Loader2, RefreshCw, ImageOff, Trash2, Lock, Eye, EyeOff, MessageCircle, Check, Download, MousePointerClick, ArrowLeft, Square } from "lucide-react"
import JSZip from "jszip"
import { saveAs } from "file-saver"
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
        password?: string
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

    // View mode state: 'initial' = landing choice, 'culling' = select photos, 'download' = download mode
    const [viewMode, setViewMode] = useState<'initial' | 'culling' | 'download'>('initial')
    // Download mode selection (separate from culling selection)
    const [downloadSelected, setDownloadSelected] = useState<string[]>([])
    const [isDownloading, setIsDownloading] = useState(false)
    const [downloadProgress, setDownloadProgress] = useState(0)
    const abortControllerRef = useRef<AbortController | null>(null)

    // Password dialog state (shown when clicking 'Pilih Foto' on password-protected albums)
    const [showPasswordDialog, setShowPasswordDialog] = useState(false)

    // Generate a unique project identifier from config (defined early for use in state initializers)
    const currentProjectId = `${config.clientName}-${config.gdriveLink}`.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50)

    // Password protection state
    const [isPasswordProtected] = useState(!!config.password)
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        // Check sessionStorage for existing auth (client-side only)
        if (typeof window !== 'undefined' && config.password) {
            const authKey = `fastpik-auth-${config.clientName}-${config.gdriveLink}`.replace(/[^a-zA-Z0-9-]/g, '-').substring(0, 60)
            return sessionStorage.getItem(authKey) === 'true'
        }
        return !config.password
    })
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

    // Time remaining state for countdown
    const [timeRemaining, setTimeRemaining] = useState<{ days: number, hours: number, minutes: number } | null>(null)

    // Portal ref for PhotoGrid header
    const photoGridHeaderRef = useRef<HTMLDivElement | null>(null)

    // Track if project check has already been done this session
    // Check if project is expired (client-side only to avoid hydration mismatch)
    const [isExpired, setIsExpired] = useState(false)

    useEffect(() => {
        setIsExpired(config.expiresAt ? Date.now() > config.expiresAt : false)

        // Calculate time remaining
        if (config.expiresAt) {
            const calculateTimeRemaining = () => {
                const now = Date.now()
                const diff = config.expiresAt! - now

                if (diff <= 0) {
                    setTimeRemaining(null)
                    setIsExpired(true)
                } else {
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                    setTimeRemaining({ days, hours, minutes })
                }
            }

            // Calculate immediately
            calculateTimeRemaining()

            // Update every minute
            const interval = setInterval(calculateTimeRemaining, 60000)
            return () => clearInterval(interval)
        } else {
            setTimeRemaining(null)
        }
    }, [config.expiresAt])

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

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (passwordInput === config.password) {
            setIsAuthenticated(true)
            setPasswordError(false)
            // Save auth state to sessionStorage
            sessionStorage.setItem(authStorageKey, 'true')
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
                        <div className="flex justify-center gap-2">
                            <LanguageToggle />
                            <ThemeToggle />
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
                                onClick={() => setViewMode('culling')}
                                className="group relative flex items-center gap-4 p-5 rounded-xl border-2 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30 hover:border-green-400 dark:hover:border-green-600 hover:bg-green-100/80 dark:hover:bg-green-900/40 transition-all duration-300 cursor-pointer"
                            >
                                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <MousePointerClick className="w-7 h-7 text-white" />
                                </div>
                                <div className="text-left flex-1">
                                    <h3 className="font-semibold text-lg text-green-700 dark:text-green-300">{t('selectPhotos')}</h3>
                                    <p className="text-sm text-muted-foreground">{t('selectPhotosDesc')}</p>
                                </div>
                            </button>

                            {/* Download Photos Option - no password needed */}
                            <button
                                onClick={() => setViewMode('download')}
                                className="group relative flex items-center gap-4 p-5 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-100/80 dark:hover:bg-blue-900/40 transition-all duration-300 cursor-pointer"
                            >
                                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <Download className="w-7 h-7 text-white" />
                                </div>
                                <div className="text-left flex-1">
                                    <h3 className="font-semibold text-lg text-blue-700 dark:text-blue-300">{t('downloadPhotos')}</h3>
                                    <p className="text-sm text-muted-foreground">{t('downloadPhotosDesc')}</p>
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

    // Download a single photo - tries direct Google Drive API first, falls back to proxy
    const downloadPhoto = async (photo: Photo, signal: AbortSignal): Promise<Blob> => {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY

        // Try direct Google Drive API first (no Vercel bandwidth cost)
        if (apiKey) {
            try {
                const directUrl = `https://www.googleapis.com/drive/v3/files/${photo.id}?alt=media&key=${apiKey}`
                const response = await fetch(directUrl, { signal })
                if (response.ok) {
                    return await response.blob()
                }
                console.warn(`Direct download failed for ${photo.name} (${response.status}), falling back to proxy`)
            } catch (err: any) {
                if (err.name === 'AbortError') throw err
                console.warn(`Direct download error for ${photo.name}, falling back to proxy:`, err.message)
            }
        }

        // Fallback: use Vercel proxy (costs bandwidth but always works)
        const downloadUrl = photo.downloadUrl || photo.fullUrl || photo.url
        const response = await fetch(`/api/photos/download?url=${encodeURIComponent(downloadUrl)}`, { signal })
        if (!response.ok) throw new Error('Failed to fetch image')
        return await response.blob()
    }

    // Download photos function with AbortController
    const handleDownloadPhotos = async (photoIds: string[]) => {
        if (photoIds.length === 0) return

        const controller = new AbortController()
        abortControllerRef.current = controller
        setIsDownloading(true)
        setDownloadProgress(0)

        try {
            const zip = new JSZip()
            const photosToDownload = photos.filter(p => photoIds.includes(p.id))

            for (let i = 0; i < photosToDownload.length; i++) {
                // Check if aborted
                if (controller.signal.aborted) {
                    throw new DOMException('Download cancelled', 'AbortError')
                }

                const photo = photosToDownload[i]

                try {
                    const blob = await downloadPhoto(photo, controller.signal)
                    zip.file(photo.name, blob)
                } catch (err: any) {
                    if (err.name === 'AbortError') throw err
                    console.error(`Failed to download ${photo.name}:`, err)
                }

                setDownloadProgress(Math.round(((i + 1) / photosToDownload.length) * 100))
            }

            const content = await zip.generateAsync({ type: 'blob' })
            saveAs(content, `${config.clientName}-photos.zip`)

            setToastMessage(t('downloadComplete'))
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
                                        onClick={() => handleDownloadPhotos(photos.map(p => p.id))}
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
                {timeRemaining && !isExpired && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2">
                        <div className="flex items-center justify-center gap-2 text-sm">
                            <span className="text-amber-700 dark:text-amber-400 font-medium">⏰ {t('linkExpiresIn')}:</span>
                            <span className="text-amber-900 dark:text-amber-200 font-semibold">
                                {timeRemaining.days > 0 && `${timeRemaining.days} ${t('days')} `}
                                {timeRemaining.hours > 0 && `${timeRemaining.hours} ${t('hours')} `}
                                {timeRemaining.minutes > 0 && `${timeRemaining.minutes} ${t('minutes')}`}
                            </span>
                        </div>
                    </div>
                )}

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
                                onClick={() => setDownloadSelected([])}
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
                                        {downloadProgress}%
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
                ) : (
                    // Culling Mode Bottom Bar (original)
                    <>
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
                    </>
                )}
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
