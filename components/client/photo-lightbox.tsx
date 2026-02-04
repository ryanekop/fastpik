"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations } from "next-intl"
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react"
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

// Slide direction for animations
type SlideDirection = 'left' | 'right' | 'none'

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
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
    const [slideDirection, setSlideDirection] = useState<SlideDirection>('none')
    const [isImageLoading, setIsImageLoading] = useState(true)
    const [transformOrigin, setTransformOrigin] = useState("center")
    const containerRef = useRef<HTMLDivElement>(null)
    const imageRef = useRef<HTMLDivElement>(null)

    // Reset when opening or changing image
    useEffect(() => {
        setScale(1)

        setPosition({ x: 0, y: 0 })
        setTransformOrigin("center")
        setIsImageLoading(true)
    }, [currentIndex, isOpen])

    useEffect(() => {
        setCurrentIndex(initialIndex)
        setSlideDirection('none')
    }, [initialIndex])

    const currentPhoto = photos[currentIndex]

    // Image source handling with fallback
    const [imgSrc, setImgSrc] = useState(currentPhoto?.full || '')

    // Reset image source when photo changes
    useEffect(() => {
        if (currentPhoto) {
            setImgSrc(currentPhoto.full)
        }
    }, [currentPhoto])

    // Lock body scroll when lightbox is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    const isSelected = currentPhoto && selectedIds.includes(currentPhoto.id)
    const canSelect = isSelected || selectedIds.length < maxPhotos

    const goToPrev = useCallback(() => {
        setSlideDirection('right')
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))
    }, [photos.length])

    const goToNext = useCallback(() => {
        setSlideDirection('left')
        setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))
    }, [photos.length])

    const zoomIn = useCallback(() => {
        setTransformOrigin("center")
        setScale((s) => Math.min(s + 0.5, 4))
    }, [])

    const zoomOut = useCallback(() => {
        setScale((s) => {
            const newScale = Math.max(s - 0.5, 1)
            if (newScale === 1) setPosition({ x: 0, y: 0 })
            return newScale
        })
    }, [])

    // Handle keyboard navigation
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowLeft':
                    goToPrev()
                    break
                case 'ArrowRight':
                    goToNext()
                    break
                case 'Escape':
                    onClose()
                    break
                case '+':
                case '=':
                    zoomIn()
                    break
                case '-':
                    zoomOut()
                    break
                case ' ': // Space key to select/deselect
                    e.preventDefault()
                    if (currentPhoto && (canSelect || isSelected)) {
                        onToggleSelect(currentPhoto.id)
                    }
                    break
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, currentPhoto, canSelect, isSelected, onToggleSelect, goToPrev, goToNext, onClose, zoomIn, zoomOut])

    // Handle mouse/touch drag for panning
    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (scale <= 1) return
        setIsDragging(true)
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
        setDragStart({ x: clientX - position.x, y: clientY - position.y })
    }

    const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging || scale <= 1) return
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
        setPosition({
            x: clientX - dragStart.x,
            y: clientY - dragStart.y
        })
    }

    const handleDragEnd = () => {
        setIsDragging(false)
    }

    // Handle pinch-to-zoom on touch devices
    const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null)
    const [lastTapTime, setLastTapTime] = useState<number>(0)
    const [pinchCenter, setPinchCenter] = useState<{ x: number; y: number } | null>(null)

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            // Pinch zoom start
            const touch1 = e.touches[0]
            const touch2 = e.touches[1]
            const centerX = (touch1.clientX + touch2.clientX) / 2
            const centerY = (touch1.clientY + touch2.clientY) / 2

            setPinchCenter({ x: centerX, y: centerY })

            // Set transform origin based on pinch center (only on first zoom)
            if (scale === 1 && imageRef.current) {
                const rect = imageRef.current.getBoundingClientRect()
                const originX = Math.max(0, Math.min(100, ((centerX - rect.left) / rect.width) * 100))
                const originY = Math.max(0, Math.min(100, ((centerY - rect.top) / rect.height) * 100))
                setTransformOrigin(`${originX}% ${originY}%`)
            }

            const distance = Math.hypot(
                touch1.clientX - touch2.clientX,
                touch1.clientY - touch2.clientY
            )
            setLastTouchDistance(distance)
        } else if (e.touches.length === 1) {
            // Check for double-tap
            const now = Date.now()
            if (now - lastTapTime < 300) {
                // Double tap detected - toggle zoom
                if (scale > 1) {
                    setScale(1)
                    setPosition({ x: 0, y: 0 })
                    setTransformOrigin('center')
                } else {
                    // Zoom to 2x at tap point
                    if (imageRef.current) {
                        const rect = imageRef.current.getBoundingClientRect()
                        const touch = e.touches[0]
                        const originX = ((touch.clientX - rect.left) / rect.width) * 100
                        const originY = ((touch.clientY - rect.top) / rect.height) * 100
                        setTransformOrigin(`${originX}% ${originY}%`)
                    }
                    setScale(2)
                }
                setLastTapTime(0)
            } else {
                setLastTapTime(now)
                handleDragStart(e)
            }
        }
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && lastTouchDistance) {
            e.preventDefault() // Prevent page zoom

            const touch1 = e.touches[0]
            const touch2 = e.touches[1]
            const distance = Math.hypot(
                touch1.clientX - touch2.clientX,
                touch1.clientY - touch2.clientY
            )

            // Calculate scale change
            const scaleDelta = (distance - lastTouchDistance) * 0.008
            const newScale = Math.min(Math.max(scale + scaleDelta, 1), 4)

            // If zooming out to 1, reset position
            if (newScale === 1) {
                setPosition({ x: 0, y: 0 })
                setTransformOrigin('center')
            }

            setScale(newScale)
            setLastTouchDistance(distance)

            // Update pinch center for potential pan
            const newCenterX = (touch1.clientX + touch2.clientX) / 2
            const newCenterY = (touch1.clientY + touch2.clientY) / 2

            // Pan while pinching if already zoomed
            if (pinchCenter && newScale > 1) {
                const dx = newCenterX - pinchCenter.x
                const dy = newCenterY - pinchCenter.y
                setPosition(prev => ({
                    x: prev.x + dx,
                    y: prev.y + dy
                }))
            }

            setPinchCenter({ x: newCenterX, y: newCenterY })
        } else if (e.touches.length === 1 && scale > 1) {
            handleDragMove(e)
        }
    }

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (e.touches.length === 0) {
            setLastTouchDistance(null)
            setPinchCenter(null)
            handleDragEnd()
        } else if (e.touches.length === 1) {
            // Transitioning from pinch to single finger
            setLastTouchDistance(null)
            setPinchCenter(null)
            // Set up for potential pan
            if (scale > 1) {
                const touch = e.touches[0]
                setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y })
                setIsDragging(true)
            }
        }
    }

    // Handle swipe for navigation on mobile
    const [swipeStart, setSwipeStart] = useState<number | null>(null)

    const handleSwipeStart = (e: React.TouchEvent) => {
        if (scale > 1) return // Don't swipe when zoomed
        setSwipeStart(e.touches[0].clientX)
    }

    const handleSwipeEnd = (e: React.TouchEvent) => {
        if (swipeStart === null || scale > 1) return
        const swipeEnd = e.changedTouches[0].clientX
        const diff = swipeStart - swipeEnd

        if (Math.abs(diff) > 50) {
            if (diff > 0) goToNext()
            else goToPrev()
        }
        setSwipeStart(null)
    }

    if (!currentPhoto) return null

    // Animation variants for sliding
    const slideVariants = {
        enter: (direction: SlideDirection) => ({
            x: direction === 'left' ? 300 : direction === 'right' ? -300 : 0,
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
        },
        exit: (direction: SlideDirection) => ({
            x: direction === 'left' ? -300 : direction === 'right' ? 300 : 0,
            opacity: 0,
        }),
    }

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
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 text-white">
                        <div className="flex items-center gap-4">
                            <span className="text-sm opacity-70">
                                {currentIndex + 1} / {photos.length}
                            </span>
                            <span className="font-medium truncate max-w-[200px]">
                                {currentPhoto.name}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Zoom controls */}
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={zoomOut}
                                disabled={scale <= 1}
                                className="text-white hover:bg-white/20 cursor-pointer"
                            >
                                <ZoomOut className="h-5 w-5" />
                            </Button>
                            <span className="text-sm w-12 text-center">
                                {Math.round(scale * 100)}%
                            </span>
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={zoomIn}
                                disabled={scale >= 4}
                                className="text-white hover:bg-white/20 cursor-pointer"
                            >
                                <ZoomIn className="h-5 w-5" />
                            </Button>
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={onClose}
                                className="text-white hover:bg-white/20 cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Image container */}
                    <div
                        className="flex-1 flex items-center justify-center overflow-hidden relative"
                        onMouseDown={handleDragStart}
                        onMouseMove={handleDragMove}
                        onMouseUp={handleDragEnd}
                        onMouseLeave={handleDragEnd}
                        onTouchStart={(e) => {
                            handleTouchStart(e)
                            handleSwipeStart(e)
                        }}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={(e) => {
                            handleTouchEnd(e)
                            handleSwipeEnd(e)
                        }}
                        style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
                    >
                        {/* Previous button */}
                        <button
                            onClick={goToPrev}
                            className="absolute left-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors cursor-pointer hidden md:block"
                        >
                            <ChevronLeft className="h-8 w-8" />
                        </button>

                        {/* Loading indicator */}
                        {isImageLoading && (
                            <div className="absolute inset-0 flex items-center justify-center z-20">
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 className="h-12 w-12 text-white animate-spin" />
                                    <span className="text-white/70 text-sm">{t('loadingPhoto')}</span>
                                </div>
                            </div>
                        )}

                        {/* Image with slide animation */}
                        <AnimatePresence initial={false} custom={slideDirection} mode="wait">
                            <motion.div
                                key={currentPhoto.id}
                                ref={imageRef}
                                custom={slideDirection}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{
                                    x: { type: "spring", stiffness: 300, damping: 30 },
                                    opacity: { duration: 0.2 }
                                }}
                                className="select-none"
                                drag={false}
                            >
                                <img
                                    src={imgSrc}
                                    alt={currentPhoto.name}
                                    style={{
                                        transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                                        transformOrigin: transformOrigin,
                                        transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                                    }}
                                    className={cn(
                                        "max-h-[calc(100vh-280px)] max-w-[calc(100vw-40px)] object-contain transition-opacity duration-300 pointer-events-auto touch-none",
                                        isImageLoading ? "opacity-0" : "opacity-100"
                                    )}
                                    draggable={false}
                                    onLoad={() => setIsImageLoading(false)}
                                    onError={() => {
                                        // Try fallback if available and not already using it
                                        if (currentPhoto.downloadUrl && imgSrc !== currentPhoto.downloadUrl) {
                                            console.log('[Lightbox] Primary image failed, switching to fallback')
                                            setImgSrc(currentPhoto.downloadUrl)
                                            // Keep loading state true while fallback loads
                                        } else {
                                            setIsImageLoading(false)
                                        }
                                    }}
                                    onMouseDown={handleDragStart}
                                    onMouseMove={handleDragMove}
                                    onMouseUp={handleDragEnd}
                                    onMouseLeave={handleDragEnd}
                                    onTouchStart={handleTouchStart}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={handleTouchEnd}
                                />
                            </motion.div>
                        </AnimatePresence>

                        {/* Next button */}
                        <button
                            onClick={goToNext}
                            className="absolute right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors cursor-pointer hidden md:block"
                        >
                            <ChevronRight className="h-8 w-8" />
                        </button>
                    </div>

                    {/* Mobile zoom slider - above footer */}
                    <div className="px-6 py-2 md:hidden bg-black/80">
                        <div className="flex items-center gap-3">
                            <ZoomOut className="h-4 w-4 text-white/60" />
                            <input
                                type="range"
                                min="100"
                                max="400"
                                value={scale * 100}
                                onChange={(e) => setScale(Number(e.target.value) / 100)}
                                className="flex-1 h-2 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                            />
                            <ZoomIn className="h-4 w-4 text-white/60" />
                            <span className="text-white/70 text-xs w-10 text-right">{Math.round(scale * 100)}%</span>
                        </div>
                    </div>

                    {/* Footer with selection - with safe area for mobile */}
                    <div className="p-4 pb-8 flex flex-col items-center gap-3 bg-black/90">
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
                                {isSelected ? (
                                    <>✓ {t('photoSelected')}</>
                                ) : (
                                    <>{t('selectPhotoBtn')}</>
                                )}
                            </Button>
                            <span className="text-white/70 text-sm">
                                {selectedIds.length} / {maxPhotos} {t('selectedOf')}
                            </span>
                        </div>
                        <span className="text-white/40 text-xs hidden md:block">{t('pressSpaceHint')}</span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
