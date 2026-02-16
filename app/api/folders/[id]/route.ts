
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { renameFolder, deleteFolder, moveFolder } from '@/lib/supabase/folders'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const body = await request.json()

        // Support both rename and move operations
        if (body.name?.trim()) {
            await renameFolder(id, body.name.trim())
        }
        if ('parentId' in body) {
            await moveFolder(id, body.parentId)
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to update folder:', error)
        return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        await deleteFolder(id)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to delete folder:', error)
        return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 })
    }
}
