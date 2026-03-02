
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveTenant } from '@/lib/tenant-resolver'
import { getSubscription, createTrialSubscription } from '@/lib/subscription-service'

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
        const { userId } = await request.json()
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

        const existingSub = await getSubscription(userId)
        if (!existingSub) {
            await createTrialSubscription(userId)
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[Callback POST] Error creating trial:', err)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}
