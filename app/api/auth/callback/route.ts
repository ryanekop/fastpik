
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveTenant } from '@/lib/tenant-resolver'
import { getSubscription, createTrialSubscription } from '@/lib/subscription-service'

/** Fire-and-forget Telegram alert for new signups & invites */
interface SignupAlertOptions {
    email: string
    fullName: string
    type: 'signup' | 'invite'
    trialDays: number
    ip?: string
    device?: string
}

function getRequestIp(request: Request): string {
    return request.headers.get('cf-connecting-ip')
        || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown'
}

function buildLocalizedCallbackUrl(request: Request, locale: string, publicOrigin: string) {
    const currentUrl = new URL(request.url)
    const targetUrl = new URL(`${publicOrigin}/${locale}/auth/callback`)

    currentUrl.searchParams.forEach((value, key) => {
        targetUrl.searchParams.set(key, value)
    })

    return targetUrl.toString()
}

function createLocalizedCallbackRedirect(localizedCallbackUrl: string) {
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Redirecting...</title></head>
<body>
<p>Redirecting...</p>
<script>
  window.location.replace(${JSON.stringify(localizedCallbackUrl)} + window.location.hash);
</script>
</body>
</html>`

    return new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
    })
}

function classifyAuthCallbackError(message: string) {
    if (/code verifier not found/i.test(message)) {
        return 'missing_pkce_verifier'
    }
    if (/code challenge does not match/i.test(message)) {
        return 'pkce_code_challenge_mismatch'
    }
    if (/expired/i.test(message)) {
        return 'expired_code'
    }
    return 'unknown'
}

function readFirstHeaderValue(value: string | null | undefined): string {
    const raw = (value || '').trim()
    if (!raw) return ''
    return raw.split(',')[0]?.trim() || ''
}

function normalizeHost(value: string | null | undefined): string {
    const raw = readFirstHeaderValue(value)
    if (!raw) return ''
    return raw
        .replace(/^https?:\/\//i, '')
        .split('/')[0]
        .trim()
}

function isLocalHost(host: string): boolean {
    const normalized = host.split(':')[0]?.toLowerCase()
    return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1'
}

function resolvePublicOrigin(request: Request): string {
    const configuredOrigin = (process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/$/, '')
    const forwardedHost = normalizeHost(request.headers.get('x-forwarded-host'))
    const headerHost = normalizeHost(request.headers.get('host'))
    const requestHost = normalizeHost(new URL(request.url).host)
    const host = forwardedHost || headerHost || requestHost

    if (host) {
        const forwardedProto = readFirstHeaderValue(request.headers.get('x-forwarded-proto')).toLowerCase()
        const requestProto = new URL(request.url).protocol.replace(':', '').toLowerCase()
        const protocol = forwardedProto === 'http' || forwardedProto === 'https'
            ? forwardedProto
            : isLocalHost(host)
                ? 'http'
                : requestProto === 'http' || requestProto === 'https'
                    ? requestProto
                    : 'https'
        return `${protocol}://${host}`
    }

    return configuredOrigin || new URL(request.url).origin
}

async function notifyNewSignup(opts: SignupAlertOptions) {
    const chatId = process.env.ALERT_TELEGRAM_CHAT_ID
    const botToken = process.env.ALERT_TELEGRAM_BOT_TOKEN
    if (!chatId || !botToken) {
        console.warn('[Telegram Alert] Signup alert skipped: missing ALERT_TELEGRAM_CHAT_ID or ALERT_TELEGRAM_BOT_TOKEN')
        return
    }

    const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
    const emoji = opts.type === 'invite' ? '📨' : '🎉'
    const title = opts.type === 'invite' ? 'User Baru (Invite)' : 'User Baru Fastpik'

    // Parse device from User-Agent
    const deviceInfo = parseDevice(opts.device)

    const message = [
        `${emoji} <b>${title}!</b>`,
        '',
        `👤 Nama: ${opts.fullName || '-'}`,
        `📧 Email: ${opts.email}`,
        `🕐 Waktu: ${now}`,
        `🌐 IP: ${opts.ip || 'unknown'}`,
        `📱 Device: ${deviceInfo}`,
        '',
        `Trial ${opts.trialDays} hari otomatis dibuat ✅`,
    ].join('\n')

    try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML', disable_web_page_preview: true })
        })

        if (!response.ok) {
            const errorBody = await response.text()
            console.error('[Telegram Alert] Failed to send signup notification:', {
                status: response.status,
                statusText: response.statusText,
                body: errorBody,
                type: opts.type,
                email: opts.email,
            })
        }
    } catch (err) {
        console.error('[Telegram Alert] Failed to send signup notification:', {
            err,
            type: opts.type,
            email: opts.email,
        })
    }
}

/** Parse User-Agent string into a readable device description */
function parseDevice(ua?: string): string {
    if (!ua) return 'unknown'

    // OS detection
    let os = 'Unknown OS'
    if (/Windows/i.test(ua)) os = 'Windows'
    else if (/Macintosh|Mac OS/i.test(ua)) os = 'macOS'
    else if (/Android/i.test(ua)) {
        const ver = ua.match(/Android ([\d.]+)/)?.[1]
        os = ver ? `Android ${ver}` : 'Android'
    }
    else if (/iPhone|iPad|iPod/i.test(ua)) {
        const ver = ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, '.')
        os = ver ? `iOS ${ver}` : 'iOS'
    }
    else if (/Linux/i.test(ua)) os = 'Linux'

    // Browser detection
    let browser = ''
    if (/Edg\//i.test(ua)) browser = 'Edge'
    else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome'
    else if (/Firefox\//i.test(ua)) browser = 'Firefox'
    else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari'

    return browser ? `${os} / ${browser}` : os
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const type = searchParams.get('type') // 'recovery', 'invite', etc.
    const next = searchParams.get('next')
    const publicOrigin = resolvePublicOrigin(request)

    // Determine locale from various sources
    const locale = searchParams.get('locale') || 'id'
    const localizedCallbackUrl = buildLocalizedCallbackUrl(request, locale, publicOrigin)

    if (code) {
        const supabase = await createClient()
        const { error, data: sessionData } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // =============================================
            // AUTO-CREATE TRIAL for new signups
            // =============================================
            const userId = sessionData?.user?.id
            if (userId) {
                const existingSub = await getSubscription(userId)
                if (!existingSub) {
                    const createdTrial = await createTrialSubscription(userId)
                    if (createdTrial) {
                        // Notify admin via Telegram (fire-and-forget)
                        const userEmail = sessionData?.user?.email || 'unknown'
                        const fullName = sessionData?.user?.user_metadata?.full_name || ''
                        const device = request.headers.get('user-agent') || ''
                        const isInvite = type === 'invite'
                        notifyNewSignup({
                            email: userEmail,
                            fullName,
                            type: isInvite ? 'invite' : 'signup',
                            trialDays: 5,
                            ip: getRequestIp(request),
                            device,
                        }).catch(() => { })
                    }
                }
            }

            // =============================================
            // MULTI-TENANT: Auto-assign tenant_id to user
            // =============================================
            const hostname = request.headers.get('host') || ''
            const tenant = await resolveTenant(hostname)

            if (userId && tenant.id !== 'default') {
                // Check if user has settings, update tenant_id
                const { data: existingSettings } = await supabase
                    .from('settings')
                    .select('id, tenant_id')
                    .eq('user_id', userId)
                    .single()

                if (existingSettings && !existingSettings.tenant_id) {
                    // User exists but has no tenant — assign them
                    await supabase
                        .from('settings')
                        .update({ tenant_id: tenant.id })
                        .eq('user_id', userId)
                }
                // Note: If user already has a tenant_id, we don't override it
            }

            // Determine redirect path based on type
            let redirectPath = next || `/${locale}/dashboard`
            if (type === 'recovery' || type === 'invite') {
                redirectPath = `/${locale}/dashboard/reset-password`
            }

            return NextResponse.redirect(`${publicOrigin}${redirectPath}`)
        } else {
            console.warn('[Auth Callback] Code exchange failed:', {
                message: error.message,
                reason: classifyAuthCallbackError(error.message),
                type: type || 'unknown',
                locale,
                hasCode: true,
                publicOrigin,
                fallback: localizedCallbackUrl,
            })
            return NextResponse.redirect(localizedCallbackUrl)
        }
    }

    if (type === 'signup' || type === 'invite' || type === 'recovery') {
        return createLocalizedCallbackRedirect(localizedCallbackUrl)
    }

    // Return the user to login with error
    return NextResponse.redirect(`${publicOrigin}/${locale}/dashboard/login?error=auth_code_error`)
}

/**
 * POST handler: called from client-side callback page to create trial subscription
 * after PKCE exchange happens in the browser (cross-device email confirmation).
 */
export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({})) as {
            userId?: string
            email?: string
            fullName?: string
        }
        const requestedUserId = typeof body.userId === 'string' ? body.userId : null

        const supabase = await createClient()
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            console.warn('[Callback POST] Unauthorized trial creation attempt', {
                hasRequestedUserId: !!requestedUserId,
                error: userError?.message || null,
            })
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (requestedUserId && requestedUserId !== user.id) {
            console.warn('[Callback POST] Ignoring mismatched userId from request body')
        }

        const userId = user.id
        const userEmail = typeof body.email === 'string' && body.email.trim()
            ? body.email.trim()
            : user.email || 'unknown'
        const metadataFullName = typeof user.user_metadata?.full_name === 'string'
            ? user.user_metadata.full_name
            : ''
        const fullName = typeof body.fullName === 'string' && body.fullName.trim()
            ? body.fullName.trim()
            : metadataFullName

        const existingSub = await getSubscription(userId)
        if (!existingSub) {
            const createdTrial = await createTrialSubscription(userId)
            if (createdTrial) {
                // Notify admin via Telegram (fire-and-forget)
                const device = request.headers.get('user-agent') || ''
                notifyNewSignup({
                    email: userEmail,
                    fullName: fullName || '',
                    type: 'signup',
                    trialDays: 5,
                    ip: getRequestIp(request),
                    device,
                }).catch(() => { })
            }
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[Callback POST] Error creating trial:', err)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}
