import { NextRequest, NextResponse } from 'next/server'

function normalizeLocale(value: string | null) {
    return value === 'en' ? 'en' : 'id'
}

/**
 * Preserve hash fragments for legacy links that still redirect to /auth/callback
 * without a locale prefix.
 */
export async function GET(request: NextRequest) {
    const url = new URL(request.url)
    const locale = normalizeLocale(url.searchParams.get('locale'))

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Redirecting...</title></head>
<body>
<p>Redirecting...</p>
<script>
  window.location.replace('/${locale}/auth/callback' + window.location.search + window.location.hash);
</script>
</body>
</html>`

    return new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
    })
}
