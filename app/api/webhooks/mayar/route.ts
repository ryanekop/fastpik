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

        console.log('[Mayar Webhook] FULL PAYLOAD:', JSON.stringify(payload, null, 2))

        // Mayar sends data in an object named 'data'
        const data = payload.data || payload

        // Extract key fields with various fallbacks
        const rawStatus = data.status || payload.status
        const customer = data.customer || data.customerDetail || payload.customer || {}

        // Support all possible email field names
        const email = data.customerEmail ||
            payload.customerEmail ||
            customer.email ||
            data.email ||
            payload.email

        // Support all possible name field names
        const name = data.customerName ||
            payload.customerName ||
            customer.name ||
            customer.fullName ||
            data.name ||
            payload.name ||
            'User'

        const amount = data.amount || data.totalAmount || data.gross_amount || payload.amount || 0
        const transactionId = data.id || data.transactionId || payload.id || `TRX-${Date.now()}`

        console.log(`[Mayar Webhook] EXTRACTED -> Email: ${email}, Name: ${name}, Status: ${rawStatus}`)

        if (!email) {
            console.error('[Mayar Webhook] Failed to find email in:', JSON.stringify(data))
            return NextResponse.json({ success: false, message: 'No email provided' }, { status: 400 })
        }

        const statusStr = rawStatus?.toString().toLowerCase()
        const isSuccess = rawStatus === true ||
            ['success', 'settlement', 'paid', 'successful'].includes(statusStr)

        if (!isSuccess) {
            return NextResponse.json({ success: true, message: `Ignored status: ${rawStatus}` }, { status: 200 })
        }

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
            return NextResponse.json({ success: true, message: `Unknown amount: ${amountNum}` }, { status: 200 })
        }

        // Find or Create User
        let userId: string | undefined
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            email_confirm: true,
            user_metadata: { full_name: name }
        })

        if (createError) {
            const { data: { users: allUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
            const found = allUsers?.find(u => u.email?.toLowerCase() === email.toLowerCase())
            if (found) {
                userId = found.id
                try {
                    await supabaseAdmin.auth.signInWithOtp({
                        email: email,
                        options: {
                            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/id/auth/callback?next=/id/dashboard`
                        }
                    })
                } catch (e) { }
            }
        } else {
            userId = newUser.user.id
            try {
                await supabaseAdmin.auth.resetPasswordForEmail(email, {
                    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/id/dashboard/reset-password`
                })
            } catch (e) { }
        }

        if (!userId) {
            return NextResponse.json({ success: false, message: 'User ID error' }, { status: 500 })
        }

        const startDate = new Date()
        let endDate = null
        if (!isLifetime) {
            const end = new Date(startDate)
            end.setDate(end.getDate() + planDurationDays)
            endDate = end.toISOString()
        }

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

        if (upsertError) throw upsertError

        return NextResponse.json({ success: true, message: 'Processed' }, { status: 200 })

    } catch (err: any) {
        console.error('[Mayar Webhook] Error:', err)
        return NextResponse.json({ success: false, message: err.message }, { status: 500 })
    }
}
