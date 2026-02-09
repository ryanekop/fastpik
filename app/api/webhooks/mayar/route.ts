import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Init Supabase Admin Client (Service Role)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

export async function POST(request: NextRequest) {
    try {
        const payload = await request.json()

        console.log('[Mayar Webhook] Received payload:', JSON.stringify(payload, null, 2))

        // Mayar sends data in different formats depending on event type
        // Format 1 (legacy/test): { status, customer, amount, ... }
        // Format 2 (Mayar actual): { event, data: { id, status, customer, ... } }

        let eventType = payload.event || 'payment.received'
        let data = payload.data || payload // Fallback to root if no data wrapper

        // Extract key fields - handle both formats
        const status = data.status
        const customer = data.customer || data.customerDetail || {}
        const email = customer.email || data.email
        const name = customer.name || customer.fullName || data.name || 'User'
        const amount = data.amount || data.totalAmount || data.gross_amount || 0
        const transactionId = data.id || data.transactionId || payload.id || `TRX-${Date.now()}`

        console.log(`[Mayar Webhook] Event: ${eventType}, Email: ${email}, Amount: ${amount}, Status: ${status}`)

        // Validate email
        if (!email) {
            console.error('[Mayar Webhook] No email provided')
            return NextResponse.json({ success: false, message: 'No email provided' }, { status: 400 })
        }

        // Filter for successful transactions only
        // Mayar status can be boolean (true) or string ('success', 'settlement')
        const isSuccess = status === true || status === 'success' || status === 'settlement' || status === 'paid'

        if (!isSuccess) {
            console.log(`[Mayar Webhook] Ignored: Status is ${status}`)
            return NextResponse.json({ success: true, message: `Ignored: Status is ${status}` }, { status: 200 })
        }

        // Determine Plan based on Amount
        // 15rb -> 1 Bulan, 39rb -> 3 Bulan, 129rb -> 1 Tahun, 349rb -> Lifetime
        let planDurationDays = 0
        let planTier = 'free'
        let isLifetime = false

        const amountNum = Number(amount)

        if (amountNum >= 14000 && amountNum <= 16000) {
            planTier = 'pro_monthly'
            planDurationDays = 30
        } else if (amountNum >= 38000 && amountNum <= 40000) {
            planTier = 'pro_quarterly'
            planDurationDays = 90
        } else if (amountNum >= 128000 && amountNum <= 130000) {
            planTier = 'pro_yearly'
            planDurationDays = 365
        } else if (amountNum >= 348000 && amountNum <= 350000) {
            planTier = 'lifetime'
            isLifetime = true
        } else {
            console.warn(`[Mayar Webhook] Unknown amount: ${amountNum}`)
            return NextResponse.json({ success: true, message: `Ignored: Unknown amount ${amountNum}` }, { status: 200 })
        }

        console.log(`[Mayar Webhook] Plan: ${planTier}, Duration: ${planDurationDays} days`)

        // Find or Create User
        let userId: string | undefined
        let isNewUser = false

        // Try to create user first
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            email_confirm: true,
            user_metadata: { full_name: name }
        })

        if (createError) {
            console.log(`[Mayar Webhook] User exists or creation failed: ${createError.message}`)

            // Find existing user
            const { data: { users: allUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
            const found = allUsers?.find(u => u.email?.toLowerCase() === email.toLowerCase())

            if (found) {
                userId = found.id
                console.log(`[Mayar Webhook] Found existing user: ${userId}`)

                // Send magic link to existing user
                try {
                    await supabaseAdmin.auth.signInWithOtp({
                        email: email,
                        options: {
                            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://fastpik.ryanekoapp.web.id'}/id/auth/callback?next=/id/dashboard`
                        }
                    })
                    console.log(`[Mayar Webhook] Magic link sent to: ${email}`)
                } catch (e: any) {
                    console.error('[Mayar Webhook] Failed to send magic link:', e.message)
                }
            } else {
                console.error('[Mayar Webhook] Could not find user')
                return NextResponse.json({ success: false, message: 'Error finding user' }, { status: 500 })
            }
        } else {
            isNewUser = true
            userId = newUser.user.id
            console.log(`[Mayar Webhook] Created new user: ${userId}`)

            // Send password reset link to new user
            try {
                await supabaseAdmin.auth.resetPasswordForEmail(email, {
                    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://fastpik.ryanekoapp.web.id'}/id/dashboard/reset-password`
                })
                console.log(`[Mayar Webhook] Password reset email sent to: ${email}`)
            } catch (e: any) {
                console.error('[Mayar Webhook] Failed to send reset email:', e.message)
            }
        }

        if (!userId) {
            return NextResponse.json({ success: false, message: 'User ID undefined' }, { status: 500 })
        }

        // Calculate Dates
        const startDate = new Date()
        let endDate = null
        if (!isLifetime) {
            const end = new Date(startDate)
            end.setDate(end.getDate() + planDurationDays)
            endDate = end.toISOString()
        }

        // Update Subscription
        const { error: upsertError } = await supabaseAdmin
            .from('subscriptions')
            .upsert({
                user_id: userId,
                tier: planTier,
                status: 'active',
                start_date: startDate.toISOString(),
                end_date: endDate,
                mayar_transaction_id: transactionId,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })

        if (upsertError) {
            console.error('[Mayar Webhook] Subscription update failed:', upsertError)
            return NextResponse.json({ success: false, message: 'Error updating subscription' }, { status: 500 })
        }

        console.log(`[Mayar Webhook] SUCCESS - User: ${email}, Tier: ${planTier}, New: ${isNewUser}`)

        return NextResponse.json({
            success: true,
            message: 'Subscription processed successfully',
            user: { id: userId, email, tier: planTier, isNew: isNewUser }
        }, { status: 200 })

    } catch (err: any) {
        console.error('[Mayar Webhook] Exception:', err)
        return NextResponse.json({ success: false, message: `Server Error: ${err.message}` }, { status: 500 })
    }
}
