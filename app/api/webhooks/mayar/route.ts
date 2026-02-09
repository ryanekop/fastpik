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

        // Mayar sends data in an object named 'data'
        let data = payload.data || payload

        // Extract key fields with various fallbacks based on actual Mayar payload
        const rawStatus = data.status
        const customer = data.customer || data.customerDetail || {}

        // Support: data.customerEmail or customer.email or data.email
        const email = data.customerEmail || customer.email || data.email

        // Support: data.customerName or customer.name or customer.fullName or data.name
        const name = data.customerName || customer.name || customer.fullName || data.name || 'User'

        const amount = data.amount || data.totalAmount || data.gross_amount || 0
        const transactionId = data.id || data.transactionId || payload.id || `TRX-${Date.now()}`

        console.log(`[Mayar Webhook] Processing - Email: ${email}, Name: ${name}, Amount: ${amount}, Raw Status: ${rawStatus}`)

        // Validate email
        if (!email) {
            console.error('[Mayar Webhook] No email provided in payload')
            return NextResponse.json({ success: false, message: 'No email provided' }, { status: 400 })
        }

        // Filter for successful transactions only
        // Handle: boolean true, strings "success", "SUCCESS", "settlement", "paid"
        const statusStr = rawStatus?.toString().toLowerCase()
        const isSuccess = rawStatus === true ||
            ['success', 'settlement', 'paid', 'successful'].includes(statusStr)

        if (!isSuccess) {
            console.log(`[Mayar Webhook] Ignored: Status is ${rawStatus}`)
            return NextResponse.json({ success: true, message: `Ignored: Status is ${rawStatus}` }, { status: 200 })
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

        console.log(`[Mayar Webhook] Plan detected: ${planTier}`)

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
            // Find existing user if creation failed (likely already exists)
            const { data: { users: allUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
            const found = allUsers?.find(u => u.email?.toLowerCase() === email.toLowerCase())

            if (found) {
                userId = found.id
                console.log(`[Mayar Webhook] Found existing user: ${userId}`)

                // Send login link to existing user
                try {
                    await supabaseAdmin.auth.signInWithOtp({
                        email: email,
                        options: {
                            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/id/auth/callback?next=/id/dashboard`
                        }
                    })
                } catch (e) { }
            } else {
                console.error('[Mayar Webhook] User creation failed and user not found')
                return NextResponse.json({ success: false, message: 'Error finding/creating user' }, { status: 500 })
            }
        } else {
            isNewUser = true
            userId = newUser.user.id
            console.log(`[Mayar Webhook] Created new user: ${userId}`)

            // Send password setup link to new user
            try {
                await supabaseAdmin.auth.resetPasswordForEmail(email, {
                    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/id/dashboard/reset-password`
                })
            } catch (e) { }
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
            console.error('[Mayar Webhook] DB Error:', upsertError)
            return NextResponse.json({ success: false, message: 'Error updating subscription' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'Processed',
            data: { email, tier: planTier, isNewUser }
        }, { status: 200 })

    } catch (err: any) {
        console.error('[Mayar Webhook] Global error:', err)
        return NextResponse.json({ success: false, message: err.message }, { status: 500 })
    }
}
