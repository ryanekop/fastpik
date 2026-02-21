
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// Public endpoint - client syncs photo selections (debounced from client-side)
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { selectedPhotos } = body

        if (!Array.isArray(selectedPhotos)) {
            return NextResponse.json({ error: 'selectedPhotos must be an array' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // Verify project exists and not expired
        const { data: project, error: fetchError } = await supabase
            .from('projects')
            .select('id, expires_at, selection_status')
            .eq('id', id)
            .single()

        if (fetchError || !project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        if (project.expires_at && new Date(project.expires_at).getTime() < Date.now()) {
            return NextResponse.json({ error: 'Project has expired' }, { status: 410 })
        }

        // Don't allow sync if already submitted or reviewed
        if (project.selection_status === 'submitted' || project.selection_status === 'reviewed') {
            return NextResponse.json({ error: 'Selection already finalized' }, { status: 409 })
        }

        const newStatus = project.selection_status === 'pending' ? 'in_progress' : project.selection_status

        const { error: updateError } = await supabase
            .from('projects')
            .update({
                selected_photos: selectedPhotos,
                selection_status: newStatus,
                selection_last_synced_at: new Date().toISOString()
            })
            .eq('id', id)

        if (updateError) throw updateError

        return NextResponse.json({ success: true, status: newStatus })
    } catch (error) {
        console.error('Failed to sync selection:', error)
        return NextResponse.json({ error: 'Failed to sync selection' }, { status: 500 })
    }
}
