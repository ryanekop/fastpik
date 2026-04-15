export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// Public endpoint - client finalizes extra photo selection
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
        const { data: project, error: fetchError } = await supabase
            .from('projects')
            .select('id, extra_enabled, extra_expires_at, extra_status')
            .eq('id', id)
            .single()

        if (fetchError || !project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        if (!project.extra_enabled) {
            return NextResponse.json({ error: 'Extra feature not enabled for this project' }, { status: 403 })
        }

        if (project.extra_expires_at && new Date(project.extra_expires_at).getTime() < Date.now()) {
            return NextResponse.json({ error: 'Extra selection has expired' }, { status: 410 })
        }

        if (project.extra_status === 'reviewed') {
            return NextResponse.json({ error: 'Extra selection already reviewed' }, { status: 409 })
        }

        const { error: updateError } = await supabase
            .from('projects')
            .update({
                extra_selected_photos: selectedPhotos,
                extra_status: 'submitted',
                extra_submitted_at: new Date().toISOString(),
                extra_last_synced_at: new Date().toISOString()
            })
            .eq('id', id)

        if (updateError) throw updateError

        return NextResponse.json({ success: true, status: 'submitted' })
    } catch (error) {
        console.error('Failed to submit extra selection:', error)
        return NextResponse.json({ error: 'Failed to submit extra selection' }, { status: 500 })
    }
}
