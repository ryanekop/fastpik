
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { photoCache, generateCacheKey } from '@/lib/cache'
import { fetchDrivePhotos, extractFolderId, getDirectImageUrl, getGridThumbnailUrl, type DriveFolderNode } from '@/lib/gdrive-service'

export interface CachedPhoto {
    id: string
    name: string
    url: string
    fullUrl: string
    downloadUrl?: string
    folderName?: string   // Immediate parent folder name
    folderPath?: string   // Full path for grouping (e.g., "Parent > Child")
    createdTime?: string
}

interface CacheData {
    photos: CachedPhoto[]
    folders: DriveFolderNode[]
    fetchedAt: number
}

const FORCE_REFRESH_THROTTLE_MS = 15 * 1000
const forceRefreshTracker = new Map<string, number>()

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const gdriveLink = searchParams.get('gdriveLink')
    const detectSubfolders = searchParams.get('detectSubfolders') === 'true'
    const forceRefresh = searchParams.get('forceRefresh') === 'true'

    if (!gdriveLink) {
        return NextResponse.json(
            { error: 'gdriveLink parameter is required' },
            { status: 400 }
        )
    }

    const folderId = extractFolderId(gdriveLink)
    if (!folderId) {
        return NextResponse.json(
            { error: 'Invalid Google Drive URL' },
            { status: 400 }
        )
    }

    // Check cache first
    const cacheKey = generateCacheKey(folderId, detectSubfolders)
    const cached = photoCache.get<CacheData>(cacheKey)

    if (cached && !forceRefresh) {
        console.log(`[Cache HIT] ${cacheKey} - ${cached.photos.length} photos`)
        return NextResponse.json({
            photos: cached.photos,
            folders: cached.folders,
            cached: true,
            cachedAt: cached.fetchedAt
        })
    }

    if (forceRefresh) {
        const now = Date.now()
        const lastRefreshAt = forceRefreshTracker.get(cacheKey) || 0
        const elapsed = now - lastRefreshAt

        if (elapsed < FORCE_REFRESH_THROTTLE_MS && cached) {
            const retryAfterMs = FORCE_REFRESH_THROTTLE_MS - elapsed
            console.log(`[Force Refresh THROTTLED] ${cacheKey} - retry in ${retryAfterMs}ms`)
            return NextResponse.json({
                photos: cached.photos,
                folders: cached.folders,
                cached: true,
                cachedAt: cached.fetchedAt,
                throttled: true,
                retryAfterMs
            })
        }

        // Always clear stale cache before a force refresh fetch.
        photoCache.delete(cacheKey)
        forceRefreshTracker.set(cacheKey, now)
        console.log(`[Force Refresh] ${cacheKey} - cache bypass requested`)
    }

    console.log(`[Cache MISS] ${cacheKey} - fetching from Google Drive...`)

    // Fetch from Google Drive API
    const result = await fetchDrivePhotos(gdriveLink, detectSubfolders)

    if (result.error) {
        const status = result.errorCode === 'invalid_url'
            ? 400
            : result.errorCode === 'drive_inaccessible'
                ? 403
                : 500
        return NextResponse.json(
            { error: result.error, errorCode: result.errorCode },
            { status }
        )
    }

    // Transform to cached format. Grid thumbnails prefer the Cloudflare Worker
    // when configured, with direct Google thumbnails as the no-env fallback.
    const photos: CachedPhoto[] = result.files.map(file => ({
        id: file.id,
        name: file.name,
        url: getGridThumbnailUrl(file.id),
        fullUrl: file.fullUrl || getDirectImageUrl(file.id),
        downloadUrl: file.webContentLink,
        folderName: file.folderName,
        folderPath: file.folderPath,
        createdTime: file.createdTime
    }))

    // Store in cache (5 minutes TTL)
    const cacheData: CacheData = {
        photos,
        folders: result.folders || [],
        fetchedAt: Date.now()
    }
    photoCache.set(cacheKey, cacheData, 5 * 60 * 1000)

    console.log(`[Cache SET] ${cacheKey} - ${photos.length} photos cached`)

    return NextResponse.json({
        photos,
        folders: cacheData.folders,
        cached: false,
        fetchedAt: cacheData.fetchedAt,
        forceRefreshed: forceRefresh
    })
}

// POST to invalidate cache (for admin use)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { gdriveLink, detectSubfolders = false } = body

        if (!gdriveLink) {
            return NextResponse.json(
                { error: 'gdriveLink is required' },
                { status: 400 }
            )
        }

        const folderId = extractFolderId(gdriveLink)
        if (!folderId) {
            return NextResponse.json(
                { error: 'Invalid Google Drive URL' },
                { status: 400 }
            )
        }

        const cacheKey = generateCacheKey(folderId, detectSubfolders)
        photoCache.delete(cacheKey)
        forceRefreshTracker.delete(cacheKey)

        console.log(`[Cache INVALIDATE] ${cacheKey}`)

        return NextResponse.json({
            success: true,
            message: 'Cache invalidated',
            cacheKey
        })
    } catch {
        return NextResponse.json(
            { error: 'Invalid request body' },
            { status: 400 }
        )
    }
}
