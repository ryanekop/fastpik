"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { createPortal } from "react-dom"
import { Check, ZoomIn, Loader2, RefreshCw, ChevronDown, ChevronRight, ArrowUpDown, Calendar, ArrowUpAz, Folder, FolderOpen, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Photo {
    id: string
    url: string
    fullUrl?: string
    name: string
    folderName?: string   // Immediate parent folder name
    folderPath?: string   // Full path for grouping (e.g., "Parent > Child")
    createdTime?: string
}

interface PhotoGridProps {
    photos: Photo[]
    selected: string[]
    onToggle: (id: string) => void
    onZoom: (photo: Photo) => void
    detectSubfolders?: boolean
    lockedPhotoNames?: string[] // Names of photos that are locked (previously selected)
    headerPortalRef?: React.RefObject<HTMLDivElement | null> // Portal target for header
}

// Single photo card - NO ANIMATIONS for performance
function PhotoCard({
    photo,
    isSelected,
    isLocked,
    onToggle,
    onZoom
}: {
    photo: Photo
    index: number
    isSelected: boolean
    isLocked: boolean
    onToggle: () => void
    onZoom: () => void
}) {
    const [isLoading, setIsLoading] = useState(true)
    const [hasError, setHasError] = useState(false)
    const [retryCount, setRetryCount] = useState(0)
    const [retryKey, setRetryKey] = useState(0)
    const [isVisible, setIsVisible] = useState(false)
    const cardRef = useRef<HTMLDivElement>(null)

    // Intersection Observer for Virtualization
    useEffect(() => {
        let timeoutId: NodeJS.Timeout

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        if (timeoutId) clearTimeout(timeoutId)
                        setIsVisible(true)
                    } else {
                        // Unload if scrolled far away from viewport
                        // Delay unmount to prevent flickering during quick scrolls
                        timeoutId = setTimeout(() => {
                            setIsVisible(false)
                        }, 2000)
                    }
                })
            },
            {
                rootMargin: '600px', // Preload 1.5 screens ahead
                threshold: 0
            }
        )

        if (cardRef.current) {
            observer.observe(cardRef.current)
        }

        return () => {
            observer.disconnect()
            if (timeoutId) clearTimeout(timeoutId)
        }
    }, [])

    const handleRetry = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation()
        setHasError(false)
        setIsLoading(true)
        setRetryCount(prev => prev + 1)
        setRetryKey(prev => prev + 1)
    }, [])

    const handleError = useCallback(() => {
        if (retryCount < 3) {
            setTimeout(() => {
                handleRetry()
            }, 1500 * (retryCount + 1))
        } else {
            setIsLoading(false)
            setHasError(true)
        }
    }, [retryCount, handleRetry])

    return (
        <div
            ref={cardRef}
            className={cn(
                "relative group aspect-[4/3] rounded-lg overflow-hidden cursor-pointer border-2 transition-colors bg-muted",
                isLocked ? "border-amber-500" : isSelected ? "border-primary" : "border-transparent"
            )}
            onClick={isLocked ? undefined : onToggle}
        >
            {/* Placeholder when not visible (Virtualization) */}
            {!isVisible && (
                <div className="absolute inset-0 bg-muted flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-muted-foreground/5" />
                </div>
            )}

            {/* Loading Skeleton */}
            {isVisible && isLoading && !hasError && (
                <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center z-10">
                    <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                </div>
            )}

            {/* Error State */}
            {hasError && (
                <div className="absolute inset-0 bg-muted flex flex-col items-center justify-center z-30">
                    <button
                        onClick={handleRetry}
                        className="text-center text-muted-foreground text-xs p-3 hover:bg-muted-foreground/10 rounded-lg transition-colors cursor-pointer"
                    >
                        <RefreshCw className="w-6 h-6 mx-auto mb-2" />
                        <span>Retry</span>
                    </button>
                </div>
            )}

            {/* Photo */}
            {isVisible && (
                <img
                    key={`${photo.id}-${retryKey}`}
                    src={photo.url}
                    alt={photo.name}
                    className={cn(
                        "w-full h-full object-cover transition-opacity duration-200",
                        isLoading ? "opacity-0" : "opacity-100"
                    )}
                    decoding="async"
                    loading="lazy"
                    onLoad={() => {
                        setIsLoading(false)
                        setHasError(false)
                    }}
                    onError={() => {
                        setIsLoading(false)
                        handleError()
                    }}
                />
            )}

            {/* Overlay */}
            <div className={cn(
                "absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center z-20",
                isLocked ? "opacity-100" : isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
                {isLocked ? (
                    <div className="absolute top-2 right-2 bg-amber-500 text-white rounded-full p-1" title="Locked">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                ) : isSelected && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="w-4 h-4" />
                    </div>
                )}

                <button
                    onClick={(e) => { e.stopPropagation(); onZoom(); }}
                    className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors cursor-pointer"
                >
                    <ZoomIn className="w-5 h-5" />
                </button>
            </div>

            {/* Filename */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 truncate z-20">
                {photo.name}
            </div>
        </div>
    )
}

function FolderCard({
    name,
    count,
    onClick
}: {
    name: string
    count: number
    onClick: () => void
}) {
    return (
        <div
            onClick={onClick}
            className="flex flex-col items-center justify-center p-6 border rounded-xl hover:bg-accent/50 cursor-pointer transition-all hover:scale-105 active:scale-95 bg-card shadow-sm aspect-[4/3]"
        >
            <Folder className="w-16 h-16 text-primary mb-3 fill-primary/10" />
            <h3 className="font-semibold text-lg text-center truncate w-full px-2" title={name}>{name}</h3>
            <p className="text-muted-foreground text-sm">{count} photos</p>
        </div>
    )
}

export function PhotoGrid({ photos, selected, onToggle, onZoom, detectSubfolders = true, lockedPhotoNames = [], headerPortalRef }: PhotoGridProps) {
    const t = useTranslations('Client')
    const [sortBy, setSortBy] = useState<'name' | 'date'>('name')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

    // Helper to get name without extension
    const getNameWithoutExt = (name: string) => name.replace(/\.[^/.]+$/, '')

    // Helper to check if photo is locked
    const isPhotoLocked = (photo: Photo) => {
        return lockedPhotoNames.includes(getNameWithoutExt(photo.name))
    }

    // Folder Navigation State - now tracks full path
    const [currentPath, setCurrentPath] = useState<string | null>(null)

    // Infinite Scroll State (Scoped to current view)
    const [visibleCount, setVisibleCount] = useState(50)
    const loadMoreRef = useRef<HTMLDivElement>(null)

    // Reset visible count when folder changes
    useEffect(() => {
        setVisibleCount(50)
    }, [currentPath, sortBy, sortOrder])

    // Get all unique folder paths
    const allFolderPaths = useMemo(() => {
        const paths = new Set<string>()
        photos.forEach(photo => {
            if (photo.folderPath) {
                paths.add(photo.folderPath)
            }
        })
        return Array.from(paths)
    }, [photos])

    // Get folders at current level (immediate children only)
    const currentLevelFolders = useMemo(() => {
        const folders = new Set<string>()

        allFolderPaths.forEach(path => {
            if (currentPath === null) {
                // At root - get first level folders
                const firstPart = path.split(' > ')[0]
                folders.add(firstPart)
            } else {
                // Inside a folder - get next level
                if (path.startsWith(currentPath + ' > ')) {
                    const remaining = path.substring(currentPath.length + 3) // skip " > "
                    const nextPart = remaining.split(' > ')[0]
                    if (nextPart) {
                        folders.add(nextPart)
                    }
                }
            }
        })

        return Array.from(folders).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    }, [allFolderPaths, currentPath])

    // Photos at current level (photos that belong directly to current path)
    const photosAtCurrentLevel = useMemo(() => {
        if (currentPath === null) {
            // At root - show photos with folderPath = undefined or Root
            return photos.filter(p => !p.folderPath || p.folderPath === 'Root')
        }
        // Show photos where folderPath matches current path exactly
        return photos.filter(p => p.folderPath === currentPath)
    }, [photos, currentPath])

    // Group photos by folderPath for legacy compatibility
    const groups = useMemo(() => {
        const grouped: Record<string, Photo[]> = {}
        photos.forEach(photo => {
            const key = photo.folderPath || photo.folderName || 'Unsorted'
            if (!grouped[key]) grouped[key] = []
            grouped[key].push(photo)
        })
        return grouped
    }, [photos])

    const groupNames = useMemo(() => {
        return Object.keys(groups).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    }, [groups])

    // Sorting Logic
    const sortFn = useCallback((a: Photo, b: Photo) => {
        let cmp = 0
        if (sortBy === 'name') {
            cmp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        } else {
            const dateA = new Date(a.createdTime || 0).getTime()
            const dateB = new Date(b.createdTime || 0).getTime()
            cmp = dateA - dateB
        }
        return sortOrder === 'asc' ? cmp : -cmp
    }, [sortBy, sortOrder])

    // Determine what to show - photos at current level + subfolders
    const currentPhotos = useMemo(() => {
        // If subfolder detection is disabled, show ALL photos sorted
        if (!detectSubfolders) {
            return [...photos].sort(sortFn)
        }
        // Show photos at current path level
        return [...photosAtCurrentLevel].sort(sortFn)
    }, [currentPath, photosAtCurrentLevel, sortFn, detectSubfolders, photos])

    // Visible Photos (Virtualization/Pagination)
    const visiblePhotos = useMemo(() => {
        return currentPhotos.slice(0, visibleCount)
    }, [currentPhotos, visibleCount])

    // Infinite Scroll Observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && visibleCount < currentPhotos.length) {
                    setVisibleCount((prev) => Math.min(prev + 50, currentPhotos.length))
                }
            },
            { threshold: 0.1, rootMargin: '200px' }
        )

        const currentRef = loadMoreRef.current
        if (currentRef) {
            observer.observe(currentRef)
        }

        return () => {
            if (currentRef) observer.unobserve(currentRef)
        }
    }, [visibleCount, currentPhotos.length])

    // Render: Folder Selection View (when subfolders exist at current level)
    const hasFoldersAtCurrentLevel = currentLevelFolders.length > 0
    const hasPhotosAtCurrentLevel = photosAtCurrentLevel.length > 0
    const shouldShowFolderView = detectSubfolders && hasFoldersAtCurrentLevel

    // Helper to navigate back one level
    const navigateBack = () => {
        if (currentPath === null) return
        const parts = currentPath.split(' > ')
        if (parts.length <= 1) {
            setCurrentPath(null) // Go back to root
        } else {
            parts.pop()
            setCurrentPath(parts.join(' > '))
        }
    }

    // Helper to navigate into a folder
    const navigateInto = (folderName: string) => {
        if (currentPath === null) {
            setCurrentPath(folderName)
        } else {
            setCurrentPath(`${currentPath} > ${folderName}`)
        }
    }

    // Get display name (last part of path)
    const displayFolderName = currentPath ? currentPath.split(' > ').pop() : t('allPhotos')

    if (shouldShowFolderView && !hasPhotosAtCurrentLevel) {
        // Only folders at this level, no photos
        return (
            <div className="pb-44 container mx-auto p-4 pt-24">
                {/* Header with back button */}
                {currentPath && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={navigateBack}
                        className="gap-1 pl-0 hover:bg-transparent hover:text-primary mb-4 cursor-pointer"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back
                    </Button>
                )}

                <h2 className="text-xl font-semibold mb-10 flex items-center gap-2">
                    <FolderOpen className="w-6 h-6" />
                    {displayFolderName}
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {currentLevelFolders.map(name => (
                        <FolderCard
                            key={name}
                            name={name}
                            count={allFolderPaths.filter(p =>
                                currentPath === null
                                    ? p.startsWith(name)
                                    : p.startsWith(`${currentPath} > ${name}`)
                            ).length}
                            onClick={() => navigateInto(name)}
                        />
                    ))}
                </div>
            </div>
        )
    }

    // Header content for breadcrumb + sort
    const headerContent = (
        <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 border-b px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
                {/* Back button when navigating folders */}
                {detectSubfolders && currentPath && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={navigateBack}
                        className="gap-1 pl-0 hover:bg-transparent hover:text-primary shrink-0 cursor-pointer"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                )}
                <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-base truncate leading-tight">
                        {displayFolderName}
                    </span>
                    <span className="text-muted-foreground text-xs font-normal leading-tight">
                        {currentPhotos.length} photos{hasFoldersAtCurrentLevel ? `, ${currentLevelFolders.length} folders` : ''}
                    </span>
                </div>
            </div>

            {/* Sort Controls (Integrated) */}
            <div className="flex gap-1 shrink-0">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                            {sortBy === 'name' ? <ArrowUpAz className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSortBy('name')} className="cursor-pointer">Name</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortBy('date')} className="cursor-pointer">Date</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 cursor-pointer"
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                >
                    <ArrowUpDown className={cn("h-4 w-4 transition-transform", sortOrder === 'desc' && "rotate-180")} />
                </Button>
            </div>
        </div>
    )

    // Render: Photo Grid View (with optional subfolders)
    return (
        <div className="pb-44">
            {/* Render header: portal into sticky container or inline fallback */}
            {headerPortalRef?.current
                ? createPortal(headerContent, headerPortalRef.current)
                : headerContent
            }

            {/* Combined grid: folders + photos side by side */}
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {/* Subfolders first */}
                {hasFoldersAtCurrentLevel && currentLevelFolders.map(name => (
                    <FolderCard
                        key={name}
                        name={name}
                        count={allFolderPaths.filter(p =>
                            currentPath === null
                                ? p.startsWith(name)
                                : p.startsWith(`${currentPath} > ${name}`)
                        ).length}
                        onClick={() => navigateInto(name)}
                    />
                ))}
                {/* Then photos */}
                {visiblePhotos.map((photo, index) => (
                    // content-visibility: auto optimization wrapper
                    <div
                        key={photo.id}
                        style={{ contentVisibility: 'auto', containIntrinsicSize: '300px' }}
                    >
                        <PhotoCard
                            photo={photo}
                            index={index}
                            isSelected={selected.includes(photo.id) || isPhotoLocked(photo)}
                            isLocked={isPhotoLocked(photo)}
                            onToggle={() => onToggle(photo.id)}
                            onZoom={() => onZoom(photo)}
                        />
                    </div>
                ))}
            </div>

            {/* Infinite Scroll Loader */}
            <div ref={loadMoreRef} className="h-20 w-full flex items-center justify-center text-sm text-muted-foreground">
                {visibleCount < currentPhotos.length ? (
                    <div className="flex items-center gap-2">
                        <Loader2 className="animate-spin h-4 w-4" /> Loading more...
                    </div>
                ) : (
                    <div>You've reached the end of {displayFolderName}</div>
                )}
            </div>
        </div>
    )
}
