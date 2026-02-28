"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations } from "next-intl"
import { X, ChevronLeft, ChevronRight, Loader2, LayoutGrid, Maximize } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Photo {
    id: string
    name: string
    thumbnail: string
    full: string
    downloadUrl?: string
}

interface PhotoLightboxProps {
    photos: Photo[]
    initialIndex: number
    isOpen: boolean
    onClose: () => void
    selectedIds: string[]
    onToggleSelect: (id: string) => void
    maxPhotos: number
}

type SlideDirection = 'left' | 'right' | 'none'

const MAX_ZOOM = 4
const ZOOM_STEP_CLICK = 2

// Downscale Google Drive thumbnail to =s100 for strip
function getSmallThumb(url: string): string {
    if (url && url.includes('=s')) return url.replace(/=s\d+/, '=s100')
    if (url && url.includes('sz=s')) return url.replace(/sz=s\d+/, 'sz=s100')
    return url
}

export function PhotoLightbox({
    photos,
    initialIndex,
    isOpen,
    onClose,
    selectedIds,
    onToggleSelect,
    maxPhotos
}: PhotoLightboxProps) {
    const t = useTranslations('Client')
    const [currentIndex, setCurrentIndex] = useState(initialIndex)
    const [scale, setScale] = useState(1)
    const [displayScale, setDisplayScale] = useState(1)  // smooth indicator value
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [transformOrigin, setTransformOrigin] = useState('center center')
    const [slideDirection, setSlideDirection] = useState<SlideDirection>('none')
    const [isImageLoading, setIsImageLoading] = useState(true)
    const [showThumbs, setShowThumbs] = useState(true)
    const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)

    // Desktop swipe state
    const [swipeDelta, setSwipeDelta] = useState(0)
    const [isSwiping, setIsSwiping] = useState(false)
    const [isSwipeAnimating, setIsSwipeAnimating] = useState(false)

    const containerRef = useRef<HTMLDivElement>(null)
    const imageRef = useRef<HTMLImageElement>(null)
    const thumbsRef = useRef<HTMLDivElement>(null)
    const dragStartPos = useRef({ x: 0, y: 0 })
    const mouseDownPos = useRef({ x: 0, y: 0 })
    const wasDrag = useRef(false)
    // Check if an image URL is already in browser cache
    const isImageCached = useCallback((url: string): boolean => {
        const img = new Image()
        img.src = url
        return img.complete && img.naturalWidth > 0
    }, [])
    const swipeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const pendingSwipeIdx = useRef<number | null>(null)
    const doubleTapRef = useRef(false)  // prevent swipe after double-tap
    const isTouchDevice = useRef(false)  // skip mouse click-to-zoom on touch
    const zoomAnimRef = useRef<number | null>(null)  // for canceling zoom animation
    const displayAnimRef = useRef<number | null>(null)  // for indicator animation (separate)

    useEffect(() => {
        setScale(1)
        setPosition({ x: 0, y: 0 })
        setTransformOrigin('center center')
        setNaturalSize(null)
    }, [currentIndex, isOpen])

    // Sync displayScale with scale when not animating (pinch, wheel, click)
    useEffect(() => {
        if (!displayAnimRef.current) setDisplayScale(scale)
    }, [scale])

    useEffect(() => {
        setCurrentIndex(initialIndex)
        setSlideDirection('none')
    }, [initialIndex])

    const currentPhoto = photos[currentIndex]
    const [imgSrc, setImgSrc] = useState(currentPhoto?.full || '')

    // Sync imgSrc when index changes
    useEffect(() => {
        if (!currentPhoto) return
        const nextUrl = currentPhoto.full

        if (isImageCached(nextUrl)) {
            // Already cached — swap instantly, no loading
            setImgSrc(nextUrl)
            setIsImageLoading(false)
        } else {
            // Not cached — show black + spinner, swap src so it starts loading
            setIsImageLoading(true)
            setImgSrc(nextUrl)
        }
    }, [currentIndex]) // eslint-disable-line react-hooks/exhaustive-deps

    // Lock scroll
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden'
        else document.body.style.overflow = 'unset'
        return () => { document.body.style.overflow = 'unset' }
    }, [isOpen])

    // Full JS animated zoom for double-tap (animates scale, position, and indicator)
    const animateZoom = useCallback((fromScale: number, toScale: number, fromPos?: { x: number, y: number }, toPos?: { x: number, y: number }, duration = 300, onComplete?: () => void) => {
        if (zoomAnimRef.current) cancelAnimationFrame(zoomAnimRef.current)
        const start = performance.now()
        const ease = (t: number) => 1 - Math.pow(1 - t, 3)
        const fPos = fromPos || { x: 0, y: 0 }
        const tPos = toPos || { x: 0, y: 0 }
        const animate = (now: number) => {
            const elapsed = now - start
            const progress = Math.min(elapsed / duration, 1)
            const e = ease(progress)
            const s = fromScale + (toScale - fromScale) * e
            setScale(s)
            setDisplayScale(s)
            setPosition({
                x: fPos.x + (tPos.x - fPos.x) * e,
                y: fPos.y + (tPos.y - fPos.y) * e,
            })
            if (progress < 1) {
                zoomAnimRef.current = requestAnimationFrame(animate)
            } else {
                zoomAnimRef.current = null
                onComplete?.()
            }
        }
        zoomAnimRef.current = requestAnimationFrame(animate)
    }, [])

    // Auto-scroll thumbs
    useEffect(() => {
        if (thumbsRef.current && showThumbs) {
            const thumb = thumbsRef.current.querySelector(`[data-thumb-index="${currentIndex}"]`) as HTMLElement
            if (thumb) thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
        }
    }, [currentIndex, showThumbs])

    const isSelected = currentPhoto && selectedIds.includes(currentPhoto.id)
    const canSelect = isSelected || selectedIds.length < maxPhotos

    // Two-phase swipe commit: animate to full offset, then change index
    const commitSwipe = useCallback((direction: 'next' | 'prev') => {
        // If a previous swipe is still animating, cancel it and commit immediately
        if (swipeTimerRef.current !== null) {
            clearTimeout(swipeTimerRef.current)
            swipeTimerRef.current = null
            if (pendingSwipeIdx.current !== null) {
                setImgSrc(photos[pendingSwipeIdx.current].full)
                setCurrentIndex(pendingSwipeIdx.current)
                pendingSwipeIdx.current = null
            }
        }

        // Use pending index if a previous swipe hasn't committed yet
        const effectiveIndex = pendingSwipeIdx.current ?? currentIndex
        const newIdx = direction === 'next'
            ? Math.min(effectiveIndex + 1, photos.length - 1)
            : Math.max(effectiveIndex - 1, 0)

        const width = containerRef.current?.clientWidth || window.innerWidth
        setIsSwiping(false)
        setIsSwipeAnimating(true)
        setSwipeDelta(direction === 'next' ? -(width + 20) : (width + 20))

        pendingSwipeIdx.current = newIdx
        swipeTimerRef.current = setTimeout(() => {
            swipeTimerRef.current = null
            pendingSwipeIdx.current = null
            setIsSwipeAnimating(false)
            setImgSrc(photos[newIdx].full)
            setSwipeDelta(0)
            setSlideDirection(direction === 'next' ? 'left' : 'right')
            setCurrentIndex(newIdx)
        }, 280)
    }, [photos, currentIndex])

    const goToPrev = useCallback(() => {
        const idx = pendingSwipeIdx.current ?? currentIndex
        if (idx > 0) commitSwipe('prev')
    }, [currentIndex, commitSwipe])

    const goToNext = useCallback(() => {
        const idx = pendingSwipeIdx.current ?? currentIndex
        if (idx < photos.length - 1) commitSwipe('next')
    }, [currentIndex, photos.length, commitSwipe])

    // ----- Clamp position so image edge never goes past container edge -----
    const clampPosition = useCallback((pos: { x: number; y: number }, s: number) => {
        const img = imageRef.current
        if (!img || s <= 1) return { x: 0, y: 0 }

        // Image displayed (unscaled) size
        const dw = img.clientWidth
        const dh = img.clientHeight
        // Scaled size
        const sw = dw * s
        const sh = dh * s

        // How far the image can move before its edge enters the viewport center
        // The image is centered, so half of the "overflow" on each side is the max pan
        const maxPanX = Math.max(0, (sw - dw) / 2)
        const maxPanY = Math.max(0, (sh - dh) / 2)

        return {
            x: Math.max(-maxPanX, Math.min(maxPanX, pos.x)),
            y: Math.max(-maxPanY, Math.min(maxPanY, pos.y)),
        }
    }, [])

    // Toggle 1:1
    const toggle1to1 = useCallback(() => {
        if (scale > 1) {
            setScale(1)
            setPosition({ x: 0, y: 0 })
            setTransformOrigin('center center')
        } else {
            if (naturalSize && imageRef.current) {
                const displayedW = imageRef.current.clientWidth
                const oneToOneScale = Math.min(naturalSize.w / displayedW, MAX_ZOOM)
                setScale(oneToOneScale)
            } else {
                setScale(2)
            }
        }
    }, [scale, naturalSize])

    // ----- Keyboard -----
    useEffect(() => {
        if (!isOpen) return
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowLeft': goToPrev(); break
                case 'ArrowRight': goToNext(); break
                case 'Escape': onClose(); break
                case ' ':
                    e.preventDefault()
                    if (currentPhoto && (canSelect || isSelected)) onToggleSelect(currentPhoto.id)
                    break
                case 't': case 'T': setShowThumbs(p => !p); break
                case '1': toggle1to1(); break
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, currentPhoto, canSelect, isSelected, onToggleSelect, goToPrev, goToNext, onClose, toggle1to1])

    // ----- Mouse wheel -----
    useEffect(() => {
        if (!isOpen) return
        const container = containerRef.current
        if (!container) return

        const handleWheel = (e: WheelEvent) => {
            // If hovering thumbnails
            const thumbsEl = thumbsRef.current
            if (thumbsEl && thumbsEl.contains(e.target as Node)) {
                // Only intercept vertical-only scroll (mouse wheel)
                // Let horizontal scroll (touchpad swipe gesture) work natively
                if (e.deltaX === 0 && e.deltaY !== 0) {
                    e.preventDefault()
                    thumbsEl.scrollLeft += e.deltaY
                }
                return
            }

            e.preventDefault()

            // Set transform origin to cursor on first zoom
            if (scale === 1 && imageRef.current) {
                const rect = imageRef.current.getBoundingClientRect()
                const ox = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
                const oy = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
                setTransformOrigin(`${ox}% ${oy}%`)
            }

            const delta = e.deltaY > 0 ? -0.2 : 0.2
            setScale((s) => {
                const newScale = Math.min(Math.max(s + delta, 1), MAX_ZOOM)
                if (newScale === 1) {
                    setPosition({ x: 0, y: 0 })
                    setTransformOrigin('center center')
                }
                return newScale
            })
        }

        container.addEventListener('wheel', handleWheel, { passive: false })
        return () => container.removeEventListener('wheel', handleWheel)
    }, [isOpen])

    // Clamp position whenever scale changes
    useEffect(() => {
        if (scale > 1) {
            setPosition(prev => clampPosition(prev, scale))
        }
    }, [scale, clampPosition])

    // ----- Mouse interactions on image area -----
    const handleMouseDown = (e: React.MouseEvent) => {
        mouseDownPos.current = { x: e.clientX, y: e.clientY }
        wasDrag.current = false

        if (scale > 1) {
            // Zoomed → pan mode
            setIsDragging(true)
            dragStartPos.current = { x: e.clientX - position.x, y: e.clientY - position.y }
        } else {
            // Not zoomed → swipe mode
            setIsSwiping(true)
            setSwipeDelta(0)
        }
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        const dx = e.clientX - mouseDownPos.current.x
        const dy = e.clientY - mouseDownPos.current.y

        if (scale > 1 && isDragging) {
            // Pan when zoomed
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) wasDrag.current = true
            const newPos = {
                x: e.clientX - dragStartPos.current.x,
                y: e.clientY - dragStartPos.current.y,
            }
            setPosition(clampPosition(newPos, scale))
        } else if (isSwiping && scale <= 1) {
            // Swipe to navigate
            if (Math.abs(dx) > 3) wasDrag.current = true
            setSwipeDelta(dx)
        }
    }

    const handleMouseUp = (e: React.MouseEvent) => {
        // Handle swipe completion
        if (isSwiping && scale <= 1) {
            setIsSwiping(false)
            if (Math.abs(swipeDelta) > 80) {
                // Threshold reached — animate to full slide then commit
                if (swipeDelta < 0 && currentIndex < photos.length - 1) {
                    commitSwipe('next')
                } else if (swipeDelta > 0 && currentIndex > 0) {
                    commitSwipe('prev')
                } else {
                    setSwipeDelta(0)
                }
            } else {
                setSwipeDelta(0)
            }
        }

        setIsDragging(false)

        // Was it a click (not a drag/swipe)? Desktop only — touch uses pinch
        if (!wasDrag.current && !isTouchDevice.current) {
            const img = imageRef.current
            if (img) {
                const imgRect = img.getBoundingClientRect()
                const isOnImage =
                    e.clientX >= imgRect.left && e.clientX <= imgRect.right &&
                    e.clientY >= imgRect.top && e.clientY <= imgRect.bottom

                if (isOnImage) {
                    if (scale >= MAX_ZOOM) {
                        setScale(1)
                        setPosition({ x: 0, y: 0 })
                        setTimeout(() => setTransformOrigin('center center'), 350)
                    } else if (scale === 1) {
                        // First zoom: set origin to mouse position
                        const ox = ((e.clientX - imgRect.left) / imgRect.width) * 100
                        const oy = ((e.clientY - imgRect.top) / imgRect.height) * 100
                        setTransformOrigin(`${ox}% ${oy}%`)
                        setScale(ZOOM_STEP_CLICK)
                    } else {
                        // Further zoom: keep same origin, just increase scale
                        setScale(s => Math.min(s + 1, MAX_ZOOM))
                    }
                }
            }
        }
    }

    const handleMouseLeave = () => {
        setIsDragging(false)
        if (isSwiping) {
            setIsSwiping(false)
            setSwipeDelta(0)
        }
    }

    // ----- Cursor logic -----
    const getCursor = () => {
        if (isDragging || isSwiping) return 'grabbing'
        if (scale >= MAX_ZOOM) return 'zoom-out'
        if (scale > 1) return 'grab'
        return 'grab'
    }

    // ----- Touch gestures -----
    const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null)
    const lastTapTimeRef = useRef(0)
    const [pinchCenter, setPinchCenter] = useState<{ x: number; y: number } | null>(null)

    const handleTouchStart = (e: React.TouchEvent) => {
        isTouchDevice.current = true  // mark as touch device
        if (e.touches.length === 2) {
            const t1 = e.touches[0], t2 = e.touches[1]
            setPinchCenter({ x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 })
            setLastTouchDistance(Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY))
        } else if (e.touches.length === 1) {
            const now = Date.now()
            if (now - lastTapTimeRef.current < 300) {
                // Double-tap detected: toggle zoom
                e.preventDefault()
                setIsSwiping(false)
                setSwipeDelta(0)
                if (scale > 1) {
                    // Zoom out with JS animation
                    const fromS = scale
                    const fromP = { ...position }
                    animateZoom(fromS, 1, fromP, { x: 0, y: 0 }, 300, () => {
                        setTransformOrigin('center center')
                    })
                } else {
                    // Zoom to tap point
                    if (imageRef.current) {
                        const rect = imageRef.current.getBoundingClientRect()
                        const ox = ((e.touches[0].clientX - rect.left) / rect.width) * 100
                        const oy = ((e.touches[0].clientY - rect.top) / rect.height) * 100
                        setTransformOrigin(`${ox}% ${oy}%`)
                    }
                    animateZoom(1, 2)
                }
                doubleTapRef.current = true
                lastTapTimeRef.current = 0
            } else {
                lastTapTimeRef.current = now
                doubleTapRef.current = false
                if (scale > 1) {
                    setIsDragging(true)
                    dragStartPos.current = { x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y }
                }
            }
        }
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && lastTouchDistance) {
            e.preventDefault()
            const t1 = e.touches[0], t2 = e.touches[1]
            const distance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
            const scaleDelta = (distance - lastTouchDistance) * 0.008
            const newScale = Math.min(Math.max(scale + scaleDelta, 1), MAX_ZOOM)
            if (newScale === 1) setPosition({ x: 0, y: 0 })
            setScale(newScale)
            setLastTouchDistance(distance)
            const cx = (t1.clientX + t2.clientX) / 2, cy = (t1.clientY + t2.clientY) / 2
            if (pinchCenter && newScale > 1) {
                setPosition(prev => clampPosition({ x: prev.x + cx - pinchCenter.x, y: prev.y + cy - pinchCenter.y }, newScale))
            }
            setPinchCenter({ x: cx, y: cy })
        } else if (e.touches.length === 1 && scale > 1 && isDragging) {
            const newPos = {
                x: e.touches[0].clientX - dragStartPos.current.x,
                y: e.touches[0].clientY - dragStartPos.current.y,
            }
            setPosition(clampPosition(newPos, scale))
        } else if (e.touches.length === 1 && scale <= 1 && isSwiping) {
            // Visual swipe feedback (photo follows finger)
            const dx = e.touches[0].clientX - (swipeStartRef.current ?? e.touches[0].clientX)
            setSwipeDelta(dx)
        }
    }

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (e.touches.length === 0) {
            setLastTouchDistance(null); setPinchCenter(null); setIsDragging(false)

            // Handle swipe completion (same as desktop)
            if (isSwiping && scale <= 1) {
                setIsSwiping(false)
                if (Math.abs(swipeDelta) > 80) {
                    if (swipeDelta < 0 && currentIndex < photos.length - 1) {
                        commitSwipe('next')
                    } else if (swipeDelta > 0 && currentIndex > 0) {
                        commitSwipe('prev')
                    } else {
                        setSwipeDelta(0)
                    }
                } else {
                    setSwipeDelta(0)
                }
            }
        } else if (e.touches.length === 1) {
            setLastTouchDistance(null); setPinchCenter(null)
            if (scale > 1) {
                dragStartPos.current = { x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y }
                setIsDragging(true)
            }
        }
    }

    // Touch swipe start (only when not zoomed)
    const swipeStartRef = useRef<number | null>(null)
    const handleSwipeStart = (e: React.TouchEvent) => {
        if (scale > 1 || e.touches.length !== 1 || doubleTapRef.current) return
        swipeStartRef.current = e.touches[0].clientX
        setIsSwiping(true)
        setSwipeDelta(0)
    }
    const handleSwipeEnd = (_e: React.TouchEvent) => {
        swipeStartRef.current = null
    }

    if (!currentPhoto) return null

    const imageMaxH = showThumbs ? 'calc(100dvh - 220px)' : 'calc(100dvh - 140px)'

    // Carousel: get prev/current/next photos
    const prevPhoto = currentIndex > 0 ? photos[currentIndex - 1] : null
    const nextPhoto = currentIndex < photos.length - 1 ? photos[currentIndex + 1] : null

    // Dynamic opacity for carousel photos based on swipe position
    const containerW = containerRef.current?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1000)
    const progress = Math.abs(swipeDelta) / containerW  // 0=center, 1=fully swiped
    const prevOpacity = swipeDelta > 0 ? 0.5 + 0.5 * progress : 0.5
    const nextOpacity = swipeDelta < 0 ? 0.5 + 0.5 * progress : 0.5
    const currentOpacity = 1 - 0.3 * progress

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/95 flex flex-col touch-none"
                    ref={containerRef}
                >
                    {/* ═══ Toolbar ═══ */}
                    <div className="flex items-center justify-between px-3 py-2 md:px-4 md:py-3 text-white shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="text-sm opacity-60 shrink-0">
                                {currentIndex + 1} / {photos.length}
                            </span>
                            <span className="text-sm md:text-base font-medium truncate opacity-80">
                                {currentPhoto.name}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <Button
                                size="icon" variant="ghost"
                                onClick={() => setShowThumbs(!showThumbs)}
                                className={cn("cursor-pointer h-8 w-8 md:h-9 md:w-9", showThumbs ? "text-white hover:bg-white/20" : "text-white/40 hover:bg-white/10")}
                                title="Thumbnails (T)"
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button
                                size="icon" variant="ghost"
                                onClick={toggle1to1}
                                className={cn("cursor-pointer h-8 w-8 md:h-9 md:w-9", scale > 1 ? "text-blue-400 hover:bg-white/20" : "text-white hover:bg-white/20")}
                                title="1:1 (1)"
                            >
                                <Maximize className="h-4 w-4" />
                            </Button>
                            <span className="text-xs text-white/50 w-10 text-center tabular-nums">
                                {Math.round(displayScale * 100)}%
                            </span>
                            <Button
                                size="icon" variant="ghost"
                                onClick={onClose}
                                className="text-white hover:bg-white/20 cursor-pointer h-8 w-8 md:h-9 md:w-9"
                                title="Close (Esc)"
                            >
                                <X className="h-4 w-4 md:h-5 md:w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* ═══ Image Area ═══ */}
                    <div
                        className="flex-1 flex items-center justify-center overflow-hidden relative min-h-0"
                        style={{ cursor: getCursor() }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                        onTouchStart={(e) => { handleTouchStart(e); handleSwipeStart(e) }}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={(e) => { handleTouchEnd(e); handleSwipeEnd(e) }}
                    >
                        {/* Nav arrows (only when not zoomed) */}
                        {scale <= 1 && (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); goToPrev() }}
                                    className="absolute left-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors cursor-pointer hidden md:block"
                                >
                                    <ChevronLeft className="h-8 w-8" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); goToNext() }}
                                    className="absolute right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors cursor-pointer hidden md:block"
                                >
                                    <ChevronRight className="h-8 w-8" />
                                </button>
                            </>
                        )}

                        {/* Loading */}
                        {isImageLoading && (
                            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 className="h-12 w-12 text-white animate-spin" />
                                    <span className="text-white/70 text-sm">{t('loadingPhoto')}</span>
                                </div>
                            </div>
                        )}

                        {/* Carousel Strip: prev / current / next */}
                        <div
                            className="flex items-center select-none w-full h-full relative"
                            style={{
                                transform: `translateX(${swipeDelta}px)`,
                                transition: (isSwiping || (!isSwiping && !isSwipeAnimating && swipeDelta === 0))
                                    ? 'none'
                                    : 'transform 0.28s cubic-bezier(0.2, 0, 0.2, 1)',
                                willChange: 'transform',
                            }}
                        >
                            {/* Previous photo */}
                            <div className="shrink-0 w-full h-full flex items-center justify-center absolute" style={{ left: 'calc(-100% - 20px)' }}>
                                {prevPhoto && (
                                    <img
                                        src={prevPhoto.full}
                                        alt={prevPhoto.name}
                                        className="max-w-[calc(100vw-40px)] object-contain pointer-events-none touch-none transition-opacity duration-100"
                                        style={{ maxHeight: imageMaxH, opacity: prevOpacity }}
                                        draggable={false}
                                    />
                                )}
                            </div>

                            {/* Current photo */}
                            <div className="shrink-0 w-full h-full flex items-center justify-center relative">
                                {imgSrc && <img
                                    ref={imageRef}
                                    src={imgSrc}
                                    alt={currentPhoto.name}
                                    style={{
                                        transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                                        transformOrigin: transformOrigin,
                                        transition: (isDragging || isSwiping || lastTouchDistance !== null || zoomAnimRef.current !== null) ? 'none' : 'transform 0.35s cubic-bezier(0.2, 0, 0, 1)',
                                        maxHeight: imageMaxH,
                                        willChange: 'transform',
                                        opacity: currentOpacity,
                                    }}
                                    className={cn(
                                        "max-w-[calc(100vw-40px)] object-contain pointer-events-none touch-none",
                                        isImageLoading ? "opacity-0" : "opacity-100 transition-opacity duration-300"
                                    )}
                                    draggable={false}
                                    onLoad={(e) => {
                                        setIsImageLoading(false)
                                        const img = e.currentTarget
                                        setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
                                    }}
                                    onError={() => {
                                        if (currentPhoto.downloadUrl && imgSrc !== currentPhoto.downloadUrl) {
                                            setImgSrc(currentPhoto.downloadUrl)
                                        } else {
                                            setIsImageLoading(false)
                                        }
                                    }}
                                />}
                            </div>

                            {/* Next photo */}
                            <div className="shrink-0 w-full h-full flex items-center justify-center absolute" style={{ left: 'calc(100% + 20px)' }}>
                                {nextPhoto && (
                                    <img
                                        src={nextPhoto.full}
                                        alt={nextPhoto.name}
                                        className="max-w-[calc(100vw-40px)] object-contain pointer-events-none touch-none transition-opacity duration-100"
                                        style={{ maxHeight: imageMaxH, opacity: nextOpacity }}
                                        draggable={false}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ═══ iPhone-Style Thumbnails ═══ */}
                    <AnimatePresence>
                        {showThumbs && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="shrink-0 bg-black/70 overflow-hidden"
                            >
                                <div
                                    ref={thumbsRef}
                                    className="flex items-center gap-[3px] py-2 overflow-x-auto"
                                    style={{
                                        scrollbarWidth: 'none',
                                        WebkitOverflowScrolling: 'touch',
                                        paddingLeft: 'calc(50vw - 32px)',
                                        paddingRight: 'calc(50vw - 32px)',
                                    }}
                                >
                                    {photos.map((photo, idx) => {
                                        const isThumbSelected = selectedIds.includes(photo.id)
                                        const isActive = idx === currentIndex
                                        return (
                                            <button
                                                key={photo.id}
                                                data-thumb-index={idx}
                                                onClick={() => {
                                                    setSlideDirection(idx > currentIndex ? 'left' : 'right')
                                                    setCurrentIndex(idx)
                                                }}
                                                className={cn(
                                                    "relative shrink-0 overflow-hidden cursor-pointer transition-all duration-200",
                                                    "w-[52px] h-[52px] md:w-[64px] md:h-[64px] rounded-[4px]",
                                                    isActive
                                                        ? "ring-[2px] ring-white/90 brightness-110 z-10"
                                                        : "opacity-60 hover:opacity-85 brightness-75"
                                                )}
                                                style={{ transform: isActive ? 'scale(1.08)' : 'scale(1)' }}
                                            >
                                                <img
                                                    src={getSmallThumb(photo.thumbnail)}
                                                    alt={photo.name}
                                                    className="w-full h-full object-cover"
                                                    draggable={false}
                                                    loading="lazy"
                                                />
                                                {isThumbSelected && (
                                                    <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                                                        <span className="text-white text-[8px] font-bold leading-none">✓</span>
                                                    </div>
                                                )}
                                                {isActive && <div className="absolute inset-x-0 bottom-0 h-[2px] bg-white/40" />}
                                            </button>
                                        )
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ═══ Footer: Selection ═══ */}
                    <div className="px-3 py-2 pb-6 md:px-4 md:py-3 md:pb-3 flex flex-col items-center gap-1.5 bg-black/90 shrink-0">
                        <div className="flex items-center gap-4">
                            <Button
                                onClick={() => canSelect && onToggleSelect(currentPhoto.id)}
                                disabled={!canSelect && !isSelected}
                                className={cn(
                                    "gap-2 px-6 cursor-pointer transition-all duration-200",
                                    isSelected
                                        ? "bg-green-600 hover:bg-green-700 text-white scale-105"
                                        : "bg-white/20 hover:bg-white/30 text-white"
                                )}
                            >
                                {isSelected ? <>✓ {t('photoSelected')}</> : <>{t('selectPhotoBtn')}</>}
                            </Button>
                            <span className="text-white/70 text-sm">
                                {maxPhotos === Infinity
                                    ? `${selectedIds.length} ${t('selectedOf')}`
                                    : `${selectedIds.length} / ${maxPhotos} ${t('selectedOf')}`}
                            </span>
                        </div>
                        <span className="text-white/40 text-xs hidden md:block">{t('pressSpaceHint')}</span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

