
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { photoCache, generateCacheKey } from '@/lib/cache'
import { fetchDrivePhotos, extractFolderId, getThumbnailUrl, getDirectImageUrl } from '@/lib/gdrive-service'

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
    fetchedAt: number
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const gdriveLink = searchParams.get('gdriveLink')
    const detectSubfolders = searchParams.get('detectSubfolders') === 'true'

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

    if (cached) {
        console.log(`[Cache HIT] ${cacheKey} - ${cached.photos.length} photos`)
        return NextResponse.json({
            photos: cached.photos,
            cached: true,
            cachedAt: cached.fetchedAt
        })
    }

    console.log(`[Cache MISS] ${cacheKey} - fetching from Google Drive...`)

    // Fetch from Google Drive API
    const result = await fetchDrivePhotos(gdriveLink, detectSubfolders)

    if (result.error) {
        return NextResponse.json(
            { error: result.error },
            { status: 500 }
        )
    }

    // Transform to cached format
    // Use the direct CDN links (lh3) returned by fetchDrivePhotos
    // instead of reconstructing drive.google.com links which get rate limited
    const photos: CachedPhoto[] = result.files.map(file => ({
        id: file.id,
        name: file.name,
        url: file.thumbnailLink || getThumbnailUrl(file.id, 400),
        fullUrl: file.fullUrl || getDirectImageUrl(file.id),
        downloadUrl: file.webContentLink,
        folderName: file.folderName,
        folderPath: file.folderPath,
        createdTime: file.createdTime
    }))

    // Store in cache (5 minutes TTL)
    const cacheData: CacheData = {
        photos,
        fetchedAt: Date.now()
    }
    photoCache.set(cacheKey, cacheData, 5 * 60 * 1000)

    console.log(`[Cache SET] ${cacheKey} - ${photos.length} photos cached`)

    return NextResponse.json({
        photos,
        cached: false,
        fetchedAt: cacheData.fetchedAt
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
