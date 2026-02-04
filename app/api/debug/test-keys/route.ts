import { NextRequest, NextResponse } from 'next/server'
import { apiKeyRotator } from '@/lib/api-key-rotator'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const stats = apiKeyRotator.getStats()
    const keys = process.env.GOOGLE_API_KEYS?.split(',').map(k => k.trim()) || []

    // Optional: Test a specific folder link
    const gdriveLink = request.nextUrl.searchParams.get('gdriveLink')
    let folderId: string | null = null

    if (gdriveLink) {
        const { extractFolderId } = await import('@/lib/gdrive-service')
        folderId = extractFolderId(gdriveLink)
    }

    const results = []

    for (const key of keys) {
        let status = 'pending'
        let message = ''
        let latency = 0

        try {
            const start = Date.now()

            // 1. Basic Test: Check Key Validity using 'about' endpoint
            // This works for any valid API Key with Drive API enabled
            // 'storageQuota' field requires authentication, so we use 'kind' or just empty checks?
            // Actually 'about' with NO fields returns basics. 
            // Better: use 'files.list' with a public query if folderId known, or just check simple public file.

            // Let's stick to 'about' with 'user' field - wait, that requires OAuth.
            // For API Key, we can request 'maxImportSizes' or similar public configs.
            // Or just 'files?pageSize=1&q=...' with a KNOWN public query.
            // But we don't have a known public file guaranteed.

            // SAFEST TEST for API Key Validity:
            // Attempt to access a public file ID that definitely exists, or use 'about' with minimal fields.
            // about?fields=kind works for API Key.

            let testUrl = `https://www.googleapis.com/drive/v3/about?fields=kind&key=${key}`

            // If we have a folder to test, use that instead as it verifies Access too
            if (folderId) {
                const query = `'${folderId}' in parents and (mimeType contains 'image/')`
                testUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&pageSize=1&key=${key}`
            }

            const response = await fetch(testUrl)
            latency = Date.now() - start

            if (response.ok) {
                status = 'ok'
                message = folderId ? 'Valid & Folder Accessible' : 'Key Valid (Drive API Enabled)'
            } else {
                const error = await response.json()
                status = 'error'
                if (response.status === 403) {
                    message = `Error 403: Check Referrer Restrictions or Drive API status. Msg: ${error.error?.message}`
                } else if (response.status === 400) {
                    message = `Error 400: Key Invalid? Msg: ${error.error?.message}`
                } else {
                    message = `Error ${response.status}: ${error.error?.message || response.statusText}`
                }
            }
        } catch (err: any) {
            status = 'failed'
            message = err.message
        }

        results.push({
            key: key.substring(0, 10) + '...',
            status,
            message,
            latency: `${latency}ms`
        })
    }

    return NextResponse.json({
        totalKeys: keys.length,
        testMode: folderId ? `Test Folder: ${folderId}` : 'Basic Validation Only',
        rotatorStats: stats,
        results
    })
}
