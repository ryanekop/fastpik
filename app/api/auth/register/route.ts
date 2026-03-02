
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { isDisposableEmail } from '@/lib/disposable-emails'

async function verifyTurnstile(token: string): Promise<boolean> {
    const secret = process.env.TURNSTILE_SECRET_KEY
    if (!secret) {
        console.warn('[Register] TURNSTILE_SECRET_KEY not set, skipping verification')
        return true
    }

    try {
        const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ secret, response: token }),
        })
        const data = await res.json()
        return data.success === true
    } catch (err) {
        console.error('[Register] Turnstile verification failed:', err)
        return false
    }
}

/**
 * This endpoint ONLY validates Turnstile + disposable email server-side.
 * The actual supabase.auth.signUp() must be called client-side so PKCE works correctly.
 */
export async function POST(request: Request) {
    try {
        const { email, turnstileToken } = await request.json()

        if (!email) {
            return NextResponse.json({ error: 'Email wajib diisi' }, { status: 400 })
        }

        // Verify Turnstile CAPTCHA server-side
        if (!turnstileToken) {
            return NextResponse.json({ error: 'Verifikasi CAPTCHA diperlukan' }, { status: 400 })
        }
        const turnstileValid = await verifyTurnstile(turnstileToken)
        if (!turnstileValid) {
            return NextResponse.json({ error: 'Verifikasi CAPTCHA gagal. Silakan coba lagi.' }, { status: 400 })
        }

        // Check disposable email server-side
        if (isDisposableEmail(email)) {
            return NextResponse.json({ error: 'Email sementara tidak diperbolehkan. Gunakan email asli.' }, { status: 400 })
        }

        // All good — tell the client to proceed with signUp()
        return NextResponse.json({ valid: true })
    } catch (error) {
        console.error('[Register] Validate error:', error)
        return NextResponse.json({ error: 'Terjadi kesalahan saat validasi' }, { status: 500 })
    }
}
