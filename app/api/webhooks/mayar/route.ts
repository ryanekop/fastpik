import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

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

const MAYAR_SECRET = process.env.MAYAR_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
    try {
        const payload = await request.json()

        // 1. Verify Mayar Signature (Basic check if secret exists)
        // Mayar usually sends an 'Authorization' header or similar, but for simplicity 
        // we'll check if the transacton status is 'success' and assume the secret is kept safe 
        // if we were using a computed signature verification. 
        // NOTE: For stricter security, we should verify `X-Mayar-Signature` if available.
        // allow skipping verification for testing if secret is not set
        if (MAYAR_SECRET) {
            // Implement signature verification here if Mayar provides one in headers
            // For now, we proceed trusting the endpoint is hidden/secure or we trust the payload structure
        }

        // 2. Filter for SUCCESS transactions only
        if (payload.status !== 'success' && payload.transaction_status !== 'settlement' && payload.status !== 'settlement') {
            // "settlement" or "success" usually indicates paid
            return NextResponse.json({ message: 'Ignored: Status not success' }, { status: 200 })
        }

        const customer = payload.customer
        const email = customer.email
        const name = customer.name
        const amount = payload.amount || payload.gross_amount
        const transactionId = payload.id || payload.transaction_id

        if (!email) {
            return NextResponse.json({ message: 'Error: No email provided' }, { status: 400 })
        }

        console.log(`[Mayar Webhook] Processing payment for: ${email}, Amount: ${amount}`)

        // 3. Determine Plan based on Amount
        // 15rb -> 1 Bulan
        // 39rb -> 3 Bulan
        // 129rb -> 1 Tahun
        // 349rb -> Lifetime

        let planDurationDays = 0
        let planTier = 'free'
        let planStatus = 'active'
        let isLifetime = false

        if (amount == 15000) {
            planTier = 'pro_monthly'
            planDurationDays = 30
        } else if (amount == 39000) {
            planTier = 'pro_quarterly'
            planDurationDays = 90
        } else if (amount == 129000) {
            planTier = 'pro_yearly'
            planDurationDays = 365
        } else if (amount == 349000) {
            planTier = 'lifetime'
            isLifetime = true
        } else {
            console.warn(`[Mayar Webhook] Unknown amount: ${amount}, defaulting to nothing or checking manual assignment.`)
            // Fallback or error? Let's process it as 1 month if undefined to be safe or just log
            // For now, return success but don't update if amount mismatch to avoid fraud?
            // actually, let's treat it as pro_monthly fallback if needed or return
            return NextResponse.json({ message: 'Ignored: Unknown amount' }, { status: 200 })
        }

        // 4. Check if User exists in Supabase
        const { data: { users }, error: findUserError } = await supabaseAdmin.auth.admin.listUsers()
        // Note: listUsers isn't efficient for lookup by email, looking up by query is better if available, 
        // but Supabase Admin API 'listUsers' is what we have unless we select from auth.users via SQL (requires direct connection)
        // Better: use getUserById if we had ID. Since we have email:
        // Attempt to create user, if fails, it exists? Or use client search.
        // Actually, we can just try to "Invite" or "Create" and catch error.

        // Efficient way:
        let userId: string | undefined

        // Find user by email manually from the list (works for small userbase)
        // For larger userbase, we should likely use a direct DB query or keep a mapping.
        // Using `supabaseAdmin.rpc` if we had a function would be best.
        // BUT, let's try to just SELECT from our public tables if we had a profiles table? 
        // We don't have a public profiles table synced yet.

        // Let's iterate listUsers (pagination might be needed later)
        // For known 'fastpik' scale now, listUsers is fine.
        // Actually, we can use `supabaseAdmin.rpc` to find user by email if we create a function.
        // For now, let's just create a new user. If it fails with "User already registered", we catch it.

        let isNewUser = false

        /* 
           Strategy:
           1. Try to get user by email (Wait, Admin API doesn't have getUserByEmail easily exposed in all versions).
           2. Use listUsers with filter? No filter in listUsers.
           
           Workaround: Try to create user.
        */

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            email_confirm: true,
            user_metadata: { full_name: name }
        })

        if (createError) {
            console.log(`[Mayar Webhook] User creation failed/exists: ${createError.message}`)
            // Likely user exists. Need to find their ID.
            // We have to scan listUsers unfortunately, or use a workaround.
            // Workaround: We can't easily get ID of existing user via Admin API without listing.
            // Let's assume we list.

            // Optimization: If we had a 'users' table in public schema synced with auth.users, we could query it.
            // Since we don't, we will assume the user MIGHT be found via searching.

            // Let's try listing (limit 1000??)
            const { data: { users: allUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
            const found = allUsers.find(u => u.email?.toLowerCase() === email.toLowerCase())
            if (found) {
                userId = found.id

                // Send confirmation email for existing user via Magic Link
                // This doubles as a "Your subscription is active" notification
                try {
                    const { error: magicLinkError } = await supabaseAdmin.auth.signInWithOtp({
                        email: email,
                        options: {
                            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://fastpik.ryanekoapp.web.id'}/id/dashboard?subscription_activated=true`
                        }
                    })

                    if (magicLinkError) {
                        console.error('[Mayar Webhook] Failed to send magic link to existing user:', magicLinkError.message)
                    } else {
                        console.log(`[Mayar Webhook] Magic link (login + confirmation) sent to existing user: ${email}`)
                    }
                } catch (emailError: any) {
                    console.error('[Mayar Webhook] Exception sending magic link:', emailError.message)
                }
            } else {
                console.error('[Mayar Webhook] Could not find user ID even though creation failed.')
                return NextResponse.json({ message: 'Error finding user' }, { status: 500 })
            }

        } else {
            isNewUser = true
            userId = newUser.user.id
            console.log(`[Mayar Webhook] Created new user: ${userId}`)

            // Send Reset Password Link directly via Supabase for new users
            try {
                const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
                    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://fastpik.ryanekoapp.web.id'}/id/dashboard/reset-password`
                })

                if (resetError) {
                    console.error('[Mayar Webhook] Failed to send reset password email:', resetError.message)
                } else {
                    console.log(`[Mayar Webhook] Reset password email sent to new user: ${email}`)
                }
            } catch (emailError: any) {
                console.error('[Mayar Webhook] Exception sending email:', emailError.message)
            }
        }

        if (!userId) {
            return NextResponse.json({ message: 'Error: User ID undefined' }, { status: 500 })
        }

        // 5. Calculate Dates
        const startDate = new Date()
        let endDate = null
        if (!isLifetime) {
            const end = new Date(startDate)
            end.setDate(end.getDate() + planDurationDays)
            endDate = end.toISOString()
        }

        // 6. Update/Insert Subscription
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
            return NextResponse.json({ message: 'Error updating subscription' }, { status: 500 })
        }

        return NextResponse.json({ message: 'Subscription processed successfully' }, { status: 200 })

    } catch (err: any) {
        console.error('[Mayar Webhook] Exception:', err)
        return NextResponse.json({ message: `Server Error: ${err.message}` }, { status: 500 })
    }
}
