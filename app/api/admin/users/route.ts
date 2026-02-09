import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase admin client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

// Secret key for admin access
const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'fastpik-admin-2024'

export async function GET(req: NextRequest) {
    const secretKey = req.headers.get('x-admin-secret')

    if (secretKey !== ADMIN_SECRET) {
        return NextResponse.json(
            { success: false, message: 'Unauthorized' },
            { status: 401 }
        )
    }

    try {
        // Get all users from auth using admin API
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers()

        if (authError) throw authError

        const authUsers = authData?.users || []

        // Get all subscriptions - using correct column names
        const { data: subscriptions, error: subError } = await supabaseAdmin
            .from('subscriptions')
            .select('user_id, tier, status, end_date, trial_end_date')

        if (subError) console.error('Subscription error:', subError)

        // Get all profiles
        const { data: profiles, error: profError } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name')

        if (profError) console.error('Profile error:', profError)

        // Create maps for quick lookup
        const subMap = new Map(subscriptions?.map(s => [s.user_id, s]) || [])
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

        // Format the data
        const formattedUsers = authUsers.map(user => {
            const subscription = subMap.get(user.id)
            const profile = profileMap.get(user.id)
            return {
                id: user.id,
                email: user.email || 'No Email',
                name: profile?.full_name || user.user_metadata?.full_name || 'No Name',
                createdAt: user.created_at,
                tier: subscription?.tier || 'none',
                status: subscription?.status || 'inactive',
                expiresAt: subscription?.end_date || subscription?.trial_end_date || null,
                trialEndDate: subscription?.trial_end_date || null
            }
        })

        // Sort by created_at descending
        formattedUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        return NextResponse.json({
            success: true,
            users: formattedUsers
        })

    } catch (error: any) {
        console.error('Error fetching users:', error)
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        )
    }
}

export async function DELETE(req: NextRequest) {
    const secretKey = req.headers.get('x-admin-secret')

    if (secretKey !== ADMIN_SECRET) {
        return NextResponse.json(
            { success: false, message: 'Unauthorized' },
            { status: 401 }
        )
    }

    try {
        const { userId } = await req.json()

        if (!userId) {
            return NextResponse.json(
                { success: false, message: 'User ID is required' },
                { status: 400 }
            )
        }

        // Delete user using admin API
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (error) throw error

        return NextResponse.json({
            success: true,
            message: 'User deleted successfully'
        })

    } catch (error: any) {
        console.error('Error deleting user:', error)
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        )
    }
}

export async function PATCH(req: NextRequest) {
    const secretKey = req.headers.get('x-admin-secret')

    if (secretKey !== ADMIN_SECRET) {
        return NextResponse.json(
            { success: false, message: 'Unauthorized' },
            { status: 401 }
        )
    }

    try {
        const { userId, action, days, tier, expiryDate } = await req.json()

        if (!userId) {
            return NextResponse.json(
                { success: false, message: 'User ID is required' },
                { status: 400 }
            )
        }

        if (action === 'set_expiry') {
            // Set specific expiry date for subscription

            // Update end_date or trial_end_date based on current tier
            const { data: currentSub } = await supabaseAdmin
                .from('subscriptions')
                .select('tier, status')
                .eq('user_id', userId)
                .single()

            const updateData: Record<string, any> = {}
            if (currentSub?.status === 'trial' || currentSub?.tier === 'free') {
                updateData.trial_end_date = expiryDate
            } else {
                updateData.end_date = expiryDate
            }

            const { error } = await supabaseAdmin
                .from('subscriptions')
                .update(updateData)
                .eq('user_id', userId)

            if (error) throw error

            return NextResponse.json({
                success: true,
                message: `Expiry date updated`
            })

        } else if (action === 'change_tier') {
            // Change subscription tier
            let endDate = null
            let trialEndDate = null
            const isTrial = tier === 'free'

            if (tier !== 'lifetime') {
                const expiry = new Date()
                if (tier === 'free') {
                    // Trial - 15 days default
                    expiry.setDate(expiry.getDate() + 15)
                    trialEndDate = expiry.toISOString()
                } else if (tier === 'pro_monthly') {
                    expiry.setMonth(expiry.getMonth() + 1)
                    endDate = expiry.toISOString()
                } else if (tier === 'pro_quarterly') {
                    expiry.setMonth(expiry.getMonth() + 3)
                    endDate = expiry.toISOString()
                } else if (tier === 'pro_yearly') {
                    expiry.setFullYear(expiry.getFullYear() + 1)
                    endDate = expiry.toISOString()
                }
            }

            const { error } = await supabaseAdmin
                .from('subscriptions')
                .upsert({
                    user_id: userId,
                    tier: tier,
                    status: isTrial ? 'trial' : 'active',
                    start_date: new Date().toISOString(),
                    end_date: endDate,
                    trial_end_date: trialEndDate
                }, { onConflict: 'user_id' })

            if (error) throw error

            return NextResponse.json({
                success: true,
                message: `Tier changed to ${tier}`
            })
        }

        return NextResponse.json(
            { success: false, message: 'Invalid action' },
            { status: 400 }
        )

    } catch (error: any) {
        console.error('Error updating user:', error)
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        )
    }
}
