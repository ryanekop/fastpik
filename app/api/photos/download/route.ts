import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url')

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    try {
        const response = await fetch(url)

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`)
        }

        const blob = await response.blob()
        const headers = new Headers()
        headers.set('Content-Type', blob.type || 'application/octet-stream')
        headers.set('Cache-Control', 'public, max-age=3600')

        return new NextResponse(blob, {
            status: 200,
            headers
        })
    } catch (error) {
        console.error('Download proxy error:', error)
        return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
    }
}
