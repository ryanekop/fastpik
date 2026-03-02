
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isDisposableEmail } from '@/lib/disposable-emails'

async function verifyTurnstile(token: string): Promise<boolean> {
    const secret = process.env.TURNSTILE_SECRET_KEY
    if (!secret) {
        console.warn('[Register] TURNSTILE_SECRET_KEY not set, skipping verification')
        return true // Allow in development
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

export async function POST(request: Request) {
    try {
        const { email, password, turnstileToken } = await request.json()

        if (!email || !password) {
            return NextResponse.json({ error: 'Email dan password wajib diisi' }, { status: 400 })
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
        }

        // Verify Turnstile CAPTCHA
        if (!turnstileToken) {
            return NextResponse.json({ error: 'Verifikasi CAPTCHA diperlukan' }, { status: 400 })
        }
        const turnstileValid = await verifyTurnstile(turnstileToken)
        if (!turnstileValid) {
            return NextResponse.json({ error: 'Verifikasi CAPTCHA gagal. Silakan coba lagi.' }, { status: 400 })
        }

        // Check disposable email
        if (isDisposableEmail(email)) {
            return NextResponse.json({ error: 'Email sementara tidak diperbolehkan. Gunakan email asli.' }, { status: 400 })
        }

        // Use regular signUp — this automatically sends the confirmation email via Supabase
        const supabase = await createServerClient()
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${siteUrl}/api/auth/callback?type=signup&locale=id`,
            },
        })

        if (error) {
            // Handle duplicate email
            if (
                error.message.includes('already registered') ||
                error.message.includes('already exists') ||
                error.message.includes('User already registered')
            ) {
                return NextResponse.json({ error: 'Email ini sudah terdaftar. Silakan login.' }, { status: 409 })
            }
            console.error('[Register] SignUp error:', error)
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[Register] API error:', error)
        return NextResponse.json({ error: 'Terjadi kesalahan saat mendaftar' }, { status: 500 })
    }
}
