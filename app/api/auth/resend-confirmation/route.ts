export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { adminAuthMessage } from '@/lib/auth-messages'
import {
    normalizeAuthLocale,
    resolveAuthRequestLocale,
    resolvePublicOrigin,
} from '@/lib/auth-redirect'

function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
}

function getSupabaseAnon() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
}

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

async function verifyTurnstile(token: string, secret: string, request: Request): Promise<boolean> {
    try {
        const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                secret,
                response: token,
                remoteip: request.headers.get('cf-connecting-ip') ||
                    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                    '',
            }),
        })
        const data = await res.json()
        return data.success === true
    } catch (err) {
        console.error('[Resend Confirmation] Turnstile verification failed:', err)
        return false
    }
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

export async function POST(request: Request) {
    const requestLocale = resolveAuthRequestLocale(request)

    try {
        const body = await request.json().catch(() => ({})) as {
            email?: string
            captchaToken?: string
            locale?: string
        }
        const email = typeof body.email === 'string' ? body.email.trim() : ''
        const locale = normalizeAuthLocale(body.locale || requestLocale)

        if (!email) {
            return NextResponse.json({ error: adminAuthMessage(requestLocale, 'emailRequired') }, { status: 400 })
        }
        if (!isValidEmail(email)) {
            return NextResponse.json({ error: adminAuthMessage(requestLocale, 'invalidEmailFormat') }, { status: 400 })
        }

        const turnstileSecret = process.env.TURNSTILE_SECRET_KEY
        if (!turnstileSecret) {
            return NextResponse.json({ error: adminAuthMessage(requestLocale, 'captchaConfigMissing') }, { status: 503 })
        }
        if (!body.captchaToken) {
            return NextResponse.json({ error: adminAuthMessage(requestLocale, 'captchaRequired') }, { status: 400 })
        }

        const turnstileValid = await verifyTurnstile(body.captchaToken, turnstileSecret, request)
        if (!turnstileValid) {
            return NextResponse.json({ error: adminAuthMessage(requestLocale, 'captchaVerificationFailed') }, { status: 400 })
        }

        const existingUser = await findAuthUserByEmail(email)
        if (!existingUser) {
            return NextResponse.json({ error: adminAuthMessage(requestLocale, 'emailNotFound') }, { status: 404 })
        }
        if (existingUser.email_confirmed_at) {
            return NextResponse.json({ error: adminAuthMessage(requestLocale, 'emailAlreadyRegisteredPleaseLogin') }, { status: 409 })
        }

        const redirectOrigin = resolvePublicOrigin(request)
        const emailRedirectTo = `${redirectOrigin}/${locale}/auth/callback?type=signup`
        const supabase = getSupabaseAnon()
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email,
            options: { emailRedirectTo },
        })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[Resend Confirmation] Error:', error)
        return NextResponse.json({ error: adminAuthMessage(requestLocale, 'failedResendVerification') }, { status: 500 })
    }
}
