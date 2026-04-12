export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

type PrintSelectionEntry = {
    sizeName?: string
    photos?: string[]
}

// Public endpoint - client finalizes print selection
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { printSelections } = body as { printSelections?: PrintSelectionEntry[] }

        if (!Array.isArray(printSelections)) {
            return NextResponse.json({ error: 'printSelections must be an array' }, { status: 400 })
        }

        const flatSelections: { photo: string, size: string }[] = []
        for (const entry of printSelections) {
            if (!entry?.sizeName || !Array.isArray(entry.photos)) continue
            for (const photo of entry.photos) {
                if (typeof photo === 'string' && photo.trim()) {
                    flatSelections.push({ photo, size: entry.sizeName })
                }
            }
        }

        if (flatSelections.length === 0) {
            return NextResponse.json({ error: 'printSelections must contain at least one selected photo' }, { status: 400 })
        }

        const supabase = createServiceClient()

        const { data: project, error: fetchError } = await supabase
            .from('projects')
            .select('id, project_type, print_enabled, print_expires_at, print_status')
            .eq('id', id)
            .single()

        if (fetchError || !project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        if (project.project_type !== 'print' || !project.print_enabled) {
            return NextResponse.json({ error: 'Print feature not enabled for this project' }, { status: 403 })
        }

        if (project.print_expires_at && new Date(project.print_expires_at).getTime() < Date.now()) {
            return NextResponse.json({ error: 'Print selection has expired' }, { status: 410 })
        }

        if (project.print_status === 'reviewed') {
            return NextResponse.json({ error: 'Print selection already reviewed' }, { status: 409 })
        }

        const now = new Date().toISOString()

        const { error: updateError } = await supabase
            .from('projects')
            .update({
                print_selections: flatSelections,
                print_status: 'submitted',
                print_submitted_at: now,
                print_last_synced_at: now
            })
            .eq('id', id)

        if (updateError) throw updateError

        return NextResponse.json({ success: true, status: 'submitted' })
    } catch (error) {
        console.error('Failed to submit print selection:', error)
        return NextResponse.json({ error: 'Failed to submit print selection' }, { status: 500 })
    }
}
