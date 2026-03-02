
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isDisposableEmail } from '@/lib/disposable-emails'

function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
}

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
 * Validates Turnstile + disposable email + checks if email already registered.
 * The actual supabase.auth.signUp() is called client-side so PKCE works correctly.
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

        // Check if email already registered using admin generateLink trick:
        // generateLink returns an error for non-existent users, success for existing ones.
        const admin = getSupabaseAdmin()
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
        const { error: genLinkError } = await admin.auth.admin.generateLink({
            type: 'magiclink',
            email: email.toLowerCase(),
            options: { redirectTo: siteUrl },
        })

        // If NO error → user already exists
        if (!genLinkError) {
            return NextResponse.json({ error: 'Email ini sudah terdaftar. Silakan login.' }, { status: 409 })
        }
        // If error contains "not found" → user does not exist → proceed
        // Any other error → proceed anyway (fail open so legitimate users aren't blocked)

        // All good — tell the client to proceed with signUp()
        return NextResponse.json({ valid: true })
    } catch (error) {
        console.error('[Register] Validate error:', error)
        return NextResponse.json({ error: 'Terjadi kesalahan saat validasi' }, { status: 500 })
    }
}
