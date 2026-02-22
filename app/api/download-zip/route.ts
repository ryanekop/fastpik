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
                // Rate limited, try with a different key
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
            photoNames: Record<string, string>  // id -> filename
            clientName?: string
        }

        if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
            return NextResponse.json({ error: 'photoIds array is required' }, { status: 400 })
        }

        if (photoIds.length > 500) {
            return NextResponse.json({ error: 'Maximum 500 photos per request' }, { status: 400 })
        }

        console.log(`[download-zip] Starting ZIP for ${photoIds.length} photos (client: ${clientName})`)

        // Create archiver instance
        const archive = archiver('zip', { zlib: { level: 1 } }) // level 1 = fast compression (photos are already compressed)
        const passThrough = new PassThrough()

        // Pipe archive to passthrough stream
        archive.pipe(passThrough)

        // Handle archive errors
        archive.on('error', (err) => {
            console.error('[download-zip] Archive stream error:', err)
        })

        archive.on('warning', (err) => {
            console.warn('[download-zip] Archive warning:', err)
        })

        // Process photos with concurrency control
        const processPhotos = async () => {
            const usedNames = new Set<string>()
            let addedCount = 0
            let failedCount = 0

            for (let i = 0; i < photoIds.length; i += CONCURRENCY) {
                const batch = photoIds.slice(i, i + CONCURRENCY)

                const results = await Promise.allSettled(
                    batch.map(async (id) => {
                        const buffer = await fetchPhotoBuffer(id)
                        if (!buffer) return null

                        // Determine filename
                        let filename = photoNames?.[id] || `photo-${id}.jpg`

                        // Ensure unique filename
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
                        const { filename, buffer } = result.value
                        archive.append(buffer, { name: filename })
                        addedCount++
                    } else {
                        failedCount++
                    }
                }

                // Log progress
                const processed = Math.min(i + CONCURRENCY, photoIds.length)
                console.log(`[download-zip] Progress: ${processed}/${photoIds.length} fetched (${addedCount} added, ${failedCount} failed)`)
            }

            console.log(`[download-zip] Finalizing ZIP: ${addedCount} photos added, ${failedCount} failed`)

            // All photos added, finalize the archive
            await archive.finalize()
        }

        // Start processing in background (don't block response)
        processPhotos().catch(err => {
            console.error('[download-zip] Process error:', err)
            passThrough.destroy(err)
        })

        // Convert Node.js PassThrough to Web ReadableStream for Next.js response
        const webStream = new ReadableStream({
            start(controller) {
                passThrough.on('data', (chunk) => {
                    controller.enqueue(new Uint8Array(chunk))
                })
                passThrough.on('end', () => {
                    controller.close()
                })
                passThrough.on('error', (err) => {
                    console.error('[download-zip] Stream error:', err)
                    controller.error(err)
                })
            },
            cancel() {
                passThrough.destroy()
                archive.abort()
            }
        })

        const zipFilename = clientName
            ? `${clientName}-photos.zip`
            : 'photos.zip'

        return new Response(webStream, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(zipFilename)}"`,
                'Cache-Control': 'no-cache',
            },
        })
    } catch (error) {
        console.error('[download-zip] Error:', error)
        return NextResponse.json({ error: 'Failed to create ZIP' }, { status: 500 })
    }
}
