
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
        let parsedBody: any = null

        // Check if body contains a specific status to set
        let targetStatus = 'reviewed'
        try {
            parsedBody = await request.json()
            if (parsedBody.status && ['in_progress', 'pending', 'reviewed', 'submitted'].includes(parsedBody.status)) {
                targetStatus = parsedBody.status
            }
        } catch {
            // No body or invalid JSON — default to 'reviewed'
        }

        let target: 'selection' | 'extra' | 'print' = 'selection'
        const { data: project } = await supabase
            .from('projects')
            .select('project_type, extra_enabled, print_enabled')
            .eq('id', id)
            .single()

        if (parsedBody?.target && ['selection', 'extra', 'print'].includes(parsedBody.target)) {
            target = parsedBody.target
        } else if (project?.project_type === 'print') {
            target = 'print'
        }

        const updatePayload = target === 'print'
            ? { print_status: targetStatus }
            : target === 'extra'
                ? { extra_status: targetStatus }
                : { selection_status: targetStatus }

        const { error } = await supabase
            .from('projects')
            .update(updatePayload)
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true, status: targetStatus })
    } catch (error) {
        console.error('Failed to update review status:', error)
        return NextResponse.json({ error: 'Failed to update review status' }, { status: 500 })
    }
}
