export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max for large downloads

import { NextRequest, NextResponse } from 'next/server'
import archiver from 'archiver'
import { PassThrough } from 'stream'
import { apiKeyRotator } from '@/lib/api-key-rotator'

// Max concurrent fetches to avoid Google API rate limiting
const CONCURRENCY = 3

async function fetchPhotoBuffer(fileId: string): Promise<Buffer | null> {
    const apiKey = apiKeyRotator.getLeastUsedKey() || process.env.NEXT_PUBLIC_GOOGLE_API_KEY
    if (!apiKey) return null

    const directUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`

    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const response = await fetch(directUrl)

            if (response.status === 429 && attempt === 0) {
                apiKeyRotator.markRateLimited(apiKey)
                const newKey = apiKeyRotator.getLeastUsedKey()
                if (newKey && newKey !== apiKey) {
                    const retryUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${newKey}`
                    const retryRes = await fetch(retryUrl)
                    if (retryRes.ok) {
                        const arrayBuffer = await retryRes.arrayBuffer()
                        return Buffer.from(arrayBuffer)
                    }
                }
                return null
            }

            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer()
                return Buffer.from(arrayBuffer)
            }
            return null
        } catch (err) {
            if (attempt === 0) continue
            console.error(`[download-zip] Failed to fetch ${fileId}:`, err)
            return null
        }
    }
    return null
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { photoIds, photoNames, clientName } = body as {
            photoIds: string[]
            photoNames: Record<string, string>
            clientName?: string
        }

        if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
            return NextResponse.json({ error: 'photoIds array is required' }, { status: 400 })
        }

        if (photoIds.length > 500) {
            return NextResponse.json({ error: 'Maximum 500 photos per request' }, { status: 400 })
        }

        console.log(`[download-zip] Starting ZIP for ${photoIds.length} photos (client: ${clientName})`)

        // Create archiver and collect into buffer
        const archive = archiver('zip', { zlib: { level: 1 } })

        // Collect all chunks into an array
        const chunks: Buffer[] = []
        const passThrough = new PassThrough()
        archive.pipe(passThrough)

        passThrough.on('data', (chunk: Buffer) => {
            chunks.push(chunk)
        })

        const archiveComplete = new Promise<Buffer>((resolve, reject) => {
            passThrough.on('end', () => {
                resolve(Buffer.concat(chunks))
            })
            passThrough.on('error', reject)
            archive.on('error', reject)
        })

        // Fetch and append photos
        const usedNames = new Set<string>()
        let addedCount = 0
        let failedCount = 0

        for (let i = 0; i < photoIds.length; i += CONCURRENCY) {
            const batch = photoIds.slice(i, i + CONCURRENCY)

            const results = await Promise.allSettled(
                batch.map(async (id) => {
                    const buffer = await fetchPhotoBuffer(id)
                    if (!buffer) return null

                    let filename = photoNames?.[id] || `photo-${id}.jpg`

                    if (usedNames.has(filename)) {
                        const ext = filename.lastIndexOf('.')
                        const base = ext > 0 ? filename.substring(0, ext) : filename
                        const extStr = ext > 0 ? filename.substring(ext) : '.jpg'
                        let counter = 1
                        while (usedNames.has(`${base}-${counter}${extStr}`)) counter++
                        filename = `${base}-${counter}${extStr}`
                    }
                    usedNames.add(filename)

                    return { id, filename, buffer }
                })
            )

            for (const result of results) {
                if (result.status === 'fulfilled' && result.value) {
                    archive.append(result.value.buffer, { name: result.value.filename })
                    addedCount++
                } else {
                    failedCount++
                }
            }

            const processed = Math.min(i + CONCURRENCY, photoIds.length)
            console.log(`[download-zip] Progress: ${processed}/${photoIds.length} (${addedCount} added, ${failedCount} failed)`)
        }

        console.log(`[download-zip] Finalizing ZIP: ${addedCount} photos, ${failedCount} failed`)

        // Finalize and wait for the complete ZIP buffer
        await archive.finalize()
        const zipBuffer = await archiveComplete

        console.log(`[download-zip] ZIP complete: ${(zipBuffer.length / 1024 / 1024).toFixed(1)}MB`)

        const zipFilename = clientName
            ? `${clientName}-photos.zip`
            : 'photos.zip'

        // Return complete ZIP as normal response (no streaming issues with proxies)
        return new NextResponse(new Uint8Array(zipBuffer), {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(zipFilename)}"`,
                'Content-Length': zipBuffer.length.toString(),
                'Cache-Control': 'no-cache',
            },
        })
    } catch (error) {
        console.error('[download-zip] Error:', error)
        return NextResponse.json({ error: 'Failed to create ZIP' }, { status: 500 })
    }
}
