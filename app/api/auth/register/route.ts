
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

        // Create user with Supabase Admin
        const supabaseAdmin = getSupabaseAdmin()
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: false, // Requires email verification
        })

        if (error) {
            // Handle duplicate email
            if (error.message.includes('already been registered') || error.message.includes('already exists')) {
                return NextResponse.json({ error: 'Email ini sudah terdaftar. Silakan login.' }, { status: 409 })
            }
            console.error('[Register] Create user error:', error)
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        // Send confirmation email using Supabase's built-in method
        // The user was created without email confirmation, so we generate a signup link
        const { error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'signup',
            email,
            password,
            options: {
                redirectTo: `${siteUrl}/api/auth/callback?type=signup&locale=id`,
            },
        })

        if (linkError) {
            console.error('[Register] Generate link error:', linkError)
            // User was created but link failed — still okay, they can use "forgot password"
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[Register] API error:', error)
        return NextResponse.json({ error: 'Terjadi kesalahan saat mendaftar' }, { status: 500 })
    }
}
