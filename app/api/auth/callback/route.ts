
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveTenant } from '@/lib/tenant-resolver'
import { getSubscription, createTrialSubscription } from '@/lib/subscription-service'
import { sendTelegramMessage } from '@/lib/telegram'

/** Fire-and-forget Telegram alert for new signups & invites */
interface SignupAlertOptions {
    email: string
    fullName: string
    type: 'signup' | 'invite'
    trialDays: number
    ip?: string
    device?: string
}

async function notifyNewSignup(opts: SignupAlertOptions) {
    const chatId = process.env.ALERT_TELEGRAM_CHAT_ID
    if (!chatId) return

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
        await sendTelegramMessage(chatId, message)
    } catch (err) {
        console.error('[Telegram Alert] Failed to send signup notification:', err)
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
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const type = searchParams.get('type') // 'recovery', 'invite', etc.
    const next = searchParams.get('next')

    // Determine locale from various sources
    const locale = searchParams.get('locale') || 'id'

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
                    await createTrialSubscription(userId)
                    // Notify admin via Telegram (fire-and-forget)
                    const userEmail = sessionData?.user?.email || 'unknown'
                    const fullName = sessionData?.user?.user_metadata?.full_name || ''
                    const ip = request.headers.get('cf-connecting-ip')
                        || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
                        || request.headers.get('x-real-ip')
                        || 'unknown'
                    const device = request.headers.get('user-agent') || ''
                    const isInvite = type === 'invite'
                    notifyNewSignup({
                        email: userEmail,
                        fullName,
                        type: isInvite ? 'invite' : 'signup',
                        trialDays: 5,
                        ip,
                        device,
                    }).catch(() => { })
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

            const forwardedHost = request.headers.get('x-forwarded-host')
            const isLocalEnv = process.env.NODE_ENV === 'development'

            // Determine redirect path based on type
            let redirectPath = next || `/${locale}/dashboard`
            if (type === 'recovery' || type === 'invite') {
                redirectPath = `/${locale}/dashboard/reset-password`
            }

            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${redirectPath}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${redirectPath}`)
            } else {
                return NextResponse.redirect(`${origin}${redirectPath}`)
            }
        } else {
            console.error('Auth callback error:', error.message)
        }
    }

    // Return the user to login with error
    return NextResponse.redirect(`${origin}/${locale}/dashboard/login?error=auth_code_error`)
}

/**
 * POST handler: called from client-side callback page to create trial subscription
 * after PKCE exchange happens in the browser (cross-device email confirmation).
 */
export async function POST(request: Request) {
    try {
        const { userId, email, fullName } = await request.json()
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

        const existingSub = await getSubscription(userId)
        if (!existingSub) {
            await createTrialSubscription(userId)
            // Notify admin via Telegram (fire-and-forget)
            const ip = request.headers.get('cf-connecting-ip')
                || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
                || request.headers.get('x-real-ip')
                || 'unknown'
            const device = request.headers.get('user-agent') || ''
            notifyNewSignup({
                email: email || 'unknown',
                fullName: fullName || '',
                type: 'signup',
                trialDays: 5,
                ip,
                device,
            }).catch(() => { })
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[Callback POST] Error creating trial:', err)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}
