
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isDisposableEmail } from '@/lib/disposable-emails'
import { adminAuthMessage } from '@/lib/auth-messages'
import { resolveAuthRequestLocale } from '@/lib/auth-redirect'

function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
}

async function findAuthUserByEmail(email: string) {
    const admin = getSupabaseAdmin()
    const normalizedEmail = email.trim().toLowerCase()
    let page = 1

    while (true) {
        const { data, error } = await admin.auth.admin.listUsers({
            page,
            perPage: 1000,
        })

        if (error) throw error

        const users = data?.users || []
        const existingUser = users.find((user) => user.email?.toLowerCase() === normalizedEmail)
        if (existingUser) return existingUser
        if (users.length < 1000) return null

        page += 1
    }
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
    const locale = resolveAuthRequestLocale(request)

    try {
        const { email, turnstileToken } = await request.json()

        if (!email) {
            return NextResponse.json({ error: adminAuthMessage(locale, 'emailRequired') }, { status: 400 })
        }

        const turnstileSecret = process.env.TURNSTILE_SECRET_KEY
        if (!turnstileSecret) {
            return NextResponse.json({ error: adminAuthMessage(locale, 'captchaConfigMissing') }, { status: 503 })
        }

        // Verify Turnstile CAPTCHA server-side
        if (!turnstileToken) {
            return NextResponse.json({ error: adminAuthMessage(locale, 'captchaRequired') }, { status: 400 })
        }
        const turnstileValid = await verifyTurnstile(turnstileToken, turnstileSecret)
        if (!turnstileValid) {
            return NextResponse.json({ error: adminAuthMessage(locale, 'captchaVerificationFailed') }, { status: 400 })
        }

        // Check disposable email server-side
        if (isDisposableEmail(email)) {
            return NextResponse.json({ error: adminAuthMessage(locale, 'disposableEmailError') }, { status: 400 })
        }

        const existingUser = await findAuthUserByEmail(email)

        if (existingUser) {
            if (existingUser.email_confirmed_at) {
                // Confirmed user → block registration
                return NextResponse.json({ error: adminAuthMessage(locale, 'emailAlreadyRegisteredPleaseLogin') }, { status: 409 })
            }

            return NextResponse.json({
                error: adminAuthMessage(locale, 'emailNotConfirmedResend'),
                status: 'unconfirmed',
            }, { status: 409 })
        }

        // All good — tell the client to proceed with signUp()
        return NextResponse.json({ valid: true, status: 'available' })
    } catch (error) {
        console.error('[Register] Validate error:', error)
        return NextResponse.json({ error: adminAuthMessage(locale, 'validationUnexpectedError') }, { status: 500 })
    }
}
