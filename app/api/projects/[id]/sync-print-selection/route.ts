
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// Public endpoint - client syncs print selections (debounced from client-side)
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { printSelections } = body

        if (!Array.isArray(printSelections)) {
            return NextResponse.json({ error: 'printSelections must be an array' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // Verify project exists and not expired
        const { data: project, error: fetchError } = await supabase
            .from('projects')
            .select('id, print_expires_at, print_status, print_enabled')
            .eq('id', id)
            .single()

        if (fetchError || !project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        if (!project.print_enabled) {
            return NextResponse.json({ error: 'Print feature not enabled for this project' }, { status: 403 })
        }

        if (project.print_expires_at && new Date(project.print_expires_at).getTime() < Date.now()) {
            return NextResponse.json({ error: 'Print selection has expired' }, { status: 410 })
        }

        // Don't allow sync if already submitted or reviewed
        if (project.print_status === 'submitted' || project.print_status === 'reviewed') {
            return NextResponse.json({ error: 'Print selection already finalized' }, { status: 409 })
        }

        const newStatus = project.print_status === 'pending' ? 'in_progress' : project.print_status

        // Flatten from [{sizeName, photos[]}] to [{photo, size}] format
        const flatSelections: { photo: string, size: string }[] = []
        for (const entry of printSelections) {
            if (entry.sizeName && Array.isArray(entry.photos)) {
                for (const photo of entry.photos) {
                    flatSelections.push({ photo, size: entry.sizeName })
                }
            }
        }

        const { error: updateError } = await supabase
            .from('projects')
            .update({
                print_selections: flatSelections,
                print_status: newStatus,
                print_last_synced_at: new Date().toISOString()
            })
            .eq('id', id)

        if (updateError) throw updateError

        return NextResponse.json({ success: true, status: newStatus })
    } catch (error) {
        console.error('Failed to sync print selection:', error)
        return NextResponse.json({ error: 'Failed to sync print selection' }, { status: 500 })
    }
}
