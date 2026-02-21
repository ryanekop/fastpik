
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// Public endpoint - client finalizes photo selection
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { selectedPhotos } = body

        if (!Array.isArray(selectedPhotos) || selectedPhotos.length === 0) {
            return NextResponse.json({ error: 'selectedPhotos must be a non-empty array' }, { status: 400 })
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

        if (project.selection_status === 'reviewed') {
            return NextResponse.json({ error: 'Selection already reviewed' }, { status: 409 })
        }

        const { error: updateError } = await supabase
            .from('projects')
            .update({
                selected_photos: selectedPhotos,
                selection_status: 'submitted',
                selection_submitted_at: new Date().toISOString(),
                selection_last_synced_at: new Date().toISOString()
            })
            .eq('id', id)

        if (updateError) throw updateError

        return NextResponse.json({ success: true, status: 'submitted' })
    } catch (error) {
        console.error('Failed to submit selection:', error)
        return NextResponse.json({ error: 'Failed to submit selection' }, { status: 500 })
    }
}
