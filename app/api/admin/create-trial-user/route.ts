
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase admin client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

// Secret key for admin access (same as ryaneko-license admin)
const ADMIN_SECRET = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET_KEY || 'fastpik-ryan-2024-secret'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { name, email, secretKey, trialDays = 3 } = body

        // Validate secret key
        if (secretKey !== ADMIN_SECRET) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Validate required fields
        if (!name || !email) {
            return NextResponse.json(
                { success: false, message: 'Name and email are required' },
                { status: 400 }
            )
        }

        // Invite user by email - mereka akan set password sendiri
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: {
                full_name: name
            },
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
        })

        if (authError) {
            console.error('Auth error:', authError)
            return NextResponse.json(
                { success: false, message: authError.message },
                { status: 400 }
            )
        }

        if (!authData.user) {
            return NextResponse.json(
                { success: false, message: 'Failed to create user' },
                { status: 500 }
            )
        }

        // Create profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: authData.user.id,
                email: email,
                full_name: name
            })

        if (profileError) {
            console.error('Profile error:', profileError)
            // Continue anyway, profile can be created on first login
        }

        // Create trial subscription with configurable days
        const trialEndDate = new Date()
        trialEndDate.setDate(trialEndDate.getDate() + parseInt(trialDays))

        const { error: subError } = await supabaseAdmin
            .from('subscriptions')
            .insert({
                user_id: authData.user.id,
                tier: 'free',
                status: 'trial',
                start_date: new Date().toISOString(),
                trial_end_date: trialEndDate.toISOString()
            })

        if (subError) {
            console.error('Subscription error:', subError)
        }

        return NextResponse.json({
            success: true,
            message: 'Invitation sent! User will receive email to set their password.',
            user: {
                id: authData.user.id,
                email: authData.user.email,
                name: name
            }
        })

    } catch (error: any) {
        console.error('Error creating user:', error)
        return NextResponse.json(
            { success: false, message: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
