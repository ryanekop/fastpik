/**
 * Google Drive Service for fetching photos from public folders
 * 
 * Features:
 * - Automatic retry with exponential backoff for rate limiting
 * - Handles 429 (Too Many Requests) gracefully
 * - Pagination support for >1000 files
 */

import { apiKeyRotator } from './api-key-rotator'

export interface DrivePhoto {
    id: string
    name: string
    mimeType: string
    thumbnailLink: string
    webContentLink: string
    webViewLink: string
    size?: string
    fullUrl?: string
    folderName?: string   // Immediate parent folder name only
    folderPath?: string   // Full path for unique identification (e.g., "Parent > Child")
    createdTime?: string
}

export interface DriveResponse {
    files: DrivePhoto[]
    error?: string
}

// Extract folder ID from various Google Drive URL formats
export function extractFolderId(url: string): string | null {
    const patterns = [
        /\/folders\/([a-zA-Z0-9_-]+)/,
        /[?&]id=([a-zA-Z0-9_-]+)/,
        /\/d\/([a-zA-Z0-9_-]+)/
    ]

    for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match && match[1]) {
            return match[1]
        }
    }

    // If URL is already just the folder ID
    if (/^[a-zA-Z0-9_-]+$/.test(url)) {
        return url
    }

    return null
}

// Helper to wait for a duration
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Fetch with retry and exponential backoff
async function fetchWithRetry(
    url: string,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<Response> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(url)

            // If rate limited (429), wait and retry
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After')
                const delay = retryAfter
                    ? parseInt(retryAfter) * 1000
                    : baseDelay * Math.pow(2, attempt)

                console.log(`[Rate Limited] Waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}`)
                await sleep(delay)
                continue
            }

            return response
        } catch (error) {
            lastError = error as Error
            const delay = baseDelay * Math.pow(2, attempt)
            console.log(`[Fetch Error] Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
            await sleep(delay)
        }
    }

    throw lastError || new Error('Max retries exceeded')
}

// Fetch photos from a public Google Drive folder
export async function fetchDrivePhotos(
    folderIdOrUrl: string,
    detectSubfolders: boolean = false,
    apiKey?: string
): Promise<DriveResponse> {
    // If specific key provided, use it. Otherwise use rotator.
    let key = apiKey

    // If no specific key, get from rotator
    if (!key) {
        key = apiKeyRotator.getNextKey() || process.env.NEXT_PUBLIC_GOOGLE_API_KEY
    }

    if (!key) {
        return {
            files: [],
            error: "Google API Key tidak ditemukan. Silakan setup di .env.local"
        }
    }

    const folderId = extractFolderId(folderIdOrUrl)
    if (!folderId) {
        return {
            files: [],
            error: "URL Google Drive tidak valid"
        }
    }

    try {
        let allFiles: any[] = []

        // 1. Fetch files in the root folder (with pagination)
        const query = `'${folderId}' in parents and (mimeType contains 'image/')`
        const fields = 'nextPageToken, files(id,name,mimeType,thumbnailLink,webContentLink,webViewLink,size,createdTime)'

        let pageToken: string | null = null

        do {
            const baseUrl = `https://www.googleapis.com/drive/v3/files?` +
                `q=${encodeURIComponent(query)}&` +
                `fields=${encodeURIComponent(fields)}&` +
                `key=${key}&` +
                `pageSize=1000&` +
                `orderBy=name`

            const url = pageToken ? `${baseUrl}&pageToken=${pageToken}` : baseUrl

            let response = await fetchWithRetry(url, 1, 1000)

            // Handle rotation logic if 429
            if (response.status === 429 && !apiKey) {
                apiKeyRotator.markRateLimited(key!)
                const newKey = apiKeyRotator.getLeastUsedKey()
                if (newKey && newKey !== key) {
                    const newUrl = url.replace(`key=${key}`, `key=${newKey}`)
                    response = await fetchWithRetry(newUrl, 2, 1000)
                }
            }

            if (response.ok) {
                const data = await response.json()
                const rootFiles = (data.files || []).map((f: any) => ({ ...f, folderName: 'Root' }))
                allFiles = [...allFiles, ...rootFiles]
                pageToken = data.nextPageToken || null
            } else {
                console.error('Failed to fetch page', await response.text())
                pageToken = null
            }
        } while (pageToken)


        // 2. If subfolders enabled, fetch folders recursively
        if (detectSubfolders) {
            // Recursive function to fetch all subfolders and their photos
            const fetchFolderRecursive = async (
                parentFolderId: string,
                parentPath: string = '',
                depth: number = 0
            ): Promise<any[]> => {
                // Limit recursion depth to prevent infinite loops
                if (depth > 5) {
                    console.log(`[Subfolder Detection] Max depth reached at: ${parentPath}`)
                    return []
                }

                const folderQuery = `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder'`
                const folderUrl = `https://www.googleapis.com/drive/v3/files?` +
                    `q=${encodeURIComponent(folderQuery)}&` +
                    `fields=files(id,name)&` +
                    `key=${key}&` +
                    `pageSize=100`

                let collectedFiles: any[] = []

                try {
                    const folderRes = await fetchWithRetry(folderUrl, 1, 1000)
                    if (!folderRes.ok) return []

                    const folderData = await folderRes.json()
                    const subfolders = folderData.files || []

                    if (depth === 0) {
                        console.log(`[Subfolder Detection] Found ${subfolders.length} subfolders at root:`, subfolders.map((f: any) => f.name))
                    }

                    // Process each subfolder
                    for (const folder of subfolders) {
                        const currentPath = parentPath ? `${parentPath} > ${folder.name}` : folder.name

                        // Fetch photos in this folder
                        let subPageToken: string | null = null
                        const subQuery = `'${folder.id}' in parents and (mimeType contains 'image/')`

                        do {
                            const subBaseUrl = `https://www.googleapis.com/drive/v3/files?` +
                                `q=${encodeURIComponent(subQuery)}&` +
                                `fields=${encodeURIComponent(fields)}&` +
                                `key=${key}&` +
                                `pageSize=1000&` +
                                `orderBy=name`

                            const subUrl = subPageToken ? `${subBaseUrl}&pageToken=${subPageToken}` : subBaseUrl

                            try {
                                const subRes = await fetchWithRetry(subUrl, 1, 1000)
                                if (subRes.ok) {
                                    const subData = await subRes.json()
                                    const files = (subData.files || []).map((f: any) => ({
                                        ...f,
                                        folderName: folder.name,  // Just the immediate folder name
                                        folderPath: currentPath   // Full path for grouping
                                    }))
                                    collectedFiles = [...collectedFiles, ...files]
                                    subPageToken = subData.nextPageToken || null
                                } else {
                                    subPageToken = null
                                }
                            } catch (e) {
                                console.error(`Failed to fetch photos from ${currentPath}`, e)
                                subPageToken = null
                            }
                        } while (subPageToken)

                        // Recursively fetch nested subfolders
                        const nestedFiles = await fetchFolderRecursive(folder.id, currentPath, depth + 1)
                        collectedFiles = [...collectedFiles, ...nestedFiles]
                    }
                } catch (e) {
                    console.error(`Failed to fetch subfolders at depth ${depth}`, e)
                }

                return collectedFiles
            }

            // Start recursive fetch from root
            const recursiveFiles = await fetchFolderRecursive(folderId)
            allFiles = [...allFiles, ...recursiveFiles]

            console.log(`[Subfolder Detection] Total photos from subfolders: ${recursiveFiles.length}`)
        }

        // Transform all files
        const files = allFiles.map((file: any) => {
            // Upscale thumbnail from default 220px to 400px
            let thumbnail = file.thumbnailLink || ''
            if (thumbnail && thumbnail.includes('=s')) {
                thumbnail = thumbnail.replace(/=s\d+/, '=s400')
            }

            // For full resolution, use =s2000 or the direct webContentLink
            let fullUrl = file.thumbnailLink || ''
            if (fullUrl && fullUrl.includes('=s')) {
                fullUrl = fullUrl.replace(/=s\d+/, '=s2000')
            }

            return {
                ...file,
                thumbnailLink: thumbnail,
                fullUrl: fullUrl,
                webContentLink: file.webContentLink || `https://drive.google.com/uc?export=view&id=${file.id}`,
                folderName: file.folderName,
                createdTime: file.createdTime
            }
        })

        return { files }
    } catch (error) {
        console.error('Drive API error:', error)
        return {
            files: [],
            error: "Terjadi kesalahan saat mengakses Google Drive. Silakan coba lagi."
        }
    }
}

// Helper to get direct image URL from file ID
export function getDirectImageUrl(fileId: string): string {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`
}

// Helper to get thumbnail URL with custom size
export function getThumbnailUrl(fileId: string, size: number = 400): string {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=s${size}`
}

// Alternative thumbnail method using lh3 format
export function getThumbnailUrlAlt(fileId: string, size: number = 400): string {
    return `https://lh3.googleusercontent.com/d/${fileId}=s${size}`
}
