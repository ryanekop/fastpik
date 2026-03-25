
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

async function verifyTurnstile(token: string, secret: string): Promise<boolean> {
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

        const turnstileSecret = process.env.TURNSTILE_SECRET_KEY
        if (!turnstileSecret) {
            return NextResponse.json({ error: 'Konfigurasi CAPTCHA server belum lengkap. Hubungi admin.' }, { status: 503 })
        }

        // Verify Turnstile CAPTCHA server-side
        if (!turnstileToken) {
            return NextResponse.json({ error: 'Verifikasi CAPTCHA diperlukan' }, { status: 400 })
        }
        const turnstileValid = await verifyTurnstile(turnstileToken, turnstileSecret)
        if (!turnstileValid) {
            return NextResponse.json({ error: 'Verifikasi CAPTCHA gagal. Silakan coba lagi.' }, { status: 400 })
        }

        // Check disposable email server-side
        if (isDisposableEmail(email)) {
            return NextResponse.json({ error: 'Email sementara tidak diperbolehkan. Gunakan email asli.' }, { status: 400 })
        }

        // Check if email already registered using admin API
        const admin = getSupabaseAdmin()
        const { data: { users } } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
        const existingUser = users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())

        if (existingUser) {
            if (existingUser.email_confirmed_at) {
                // Confirmed user → block registration
                return NextResponse.json({ error: 'Email ini sudah terdaftar. Silakan login.' }, { status: 409 })
            } else {
                // Unconfirmed (never verified email) → delete stale record so they can register again
                await admin.auth.admin.deleteUser(existingUser.id)
            }
        }

        // All good — tell the client to proceed with signUp()
        return NextResponse.json({ valid: true })
    } catch (error) {
        console.error('[Register] Validate error:', error)
        return NextResponse.json({ error: 'Terjadi kesalahan saat validasi' }, { status: 500 })
    }
}
