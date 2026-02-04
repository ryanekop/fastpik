
import { createClient } from './server'

export async function checkDeviceLimit(userAgent: string = "Web Browser") {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get current session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    // Use access token as identifier
    const currentToken = session.access_token

    // 1. Register/Update current session
    // We try to find by session_token. 
    // Ideally we should hash this token for privacy if we were logging it, but for comparison we need it.
    // Since this is internal server-side logic, storing it is okay-ish, or better: store a hash.
    // For simplicity, let's store it directly as per existing schema logic.

    // First, cleanup old sessions (e.g. > 30 days inactive) to keep table small
    // await supabase.from('user_sessions').delete().lt('last_active', thirtyDaysAgo)

    const { data: existingSession } = await supabase
        .from('user_sessions')
        .select('id')
        .eq('session_token', currentToken)
        .single()

    if (!existingSession) {
        await supabase.from('user_sessions').insert({
            user_id: user.id,
            session_token: currentToken,
            device_info: userAgent
        })
    } else {
        // Update last active
        await supabase.from('user_sessions')
            .update({ last_active: new Date().toISOString() })
            .eq('id', existingSession.id)
    }

    // 2. Check total sessions and enforce limit
    const { data: sessions, error } = await supabase
        .from('user_sessions')
        .select('id, created_at')
        .eq('user_id', user.id) // IMPORTANT: Filter by user_id
        .order('created_at', { ascending: true }) // Oldest first

    if (error || !sessions) return

    const MAX_DEVICES = 2
    if (sessions.length > MAX_DEVICES) {
        // Remove oldest sessions, keeping only the most recent (MAX_DEVICES)
        const sessionsToRemove = sessions.slice(0, sessions.length - MAX_DEVICES)
        const idsToRemove = sessionsToRemove.map(s => s.id)

        if (idsToRemove.length > 0) {
            await supabase
                .from('user_sessions')
                .delete()
                .in('id', idsToRemove)

            console.log(`[DeviceLimit] Removed ${idsToRemove.length} excess sessions for user ${user.id}`)
        }
    }
}

export async function isValidSession(accessToken: string): Promise<boolean> {
    const supabase = await createClient()

    // Check if this token exists in our tracked sessions
    // If we enforced a limit and deleted it, this will return null
    const { data } = await supabase
        .from('user_sessions')
        .select('id')
        .eq('session_token', accessToken)
        .single()

    return !!data
}
