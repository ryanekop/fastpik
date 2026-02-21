
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Admin endpoint - mark/unmark selection as reviewed (requires auth via RLS)
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()

        // Check if body contains a specific status to set
        let targetStatus = 'reviewed'
        try {
            const body = await request.json()
            if (body.status && ['in_progress', 'pending', 'reviewed'].includes(body.status)) {
                targetStatus = body.status
            }
        } catch {
            // No body or invalid JSON — default to 'reviewed'
        }

        const { error } = await supabase
            .from('projects')
            .update({
                selection_status: targetStatus
            })
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true, status: targetStatus })
    } catch (error) {
        console.error('Failed to update review status:', error)
        return NextResponse.json({ error: 'Failed to update review status' }, { status: 500 })
    }
}
