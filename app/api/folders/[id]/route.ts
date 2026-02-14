import { NextResponse } from 'next/server'
import { renameFolder, deleteFolder } from '@/lib/supabase/folders'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const { name } = await request.json()
        if (!name?.trim()) {
            return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })
        }
        await renameFolder(id, name.trim())
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to rename folder:', error)
        return NextResponse.json({ error: 'Failed to rename folder' }, { status: 500 })
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
