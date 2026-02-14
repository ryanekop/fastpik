import { NextResponse } from 'next/server'
import { getFolders, createFolder } from '@/lib/supabase/folders'

export async function GET() {
    try {
        const folders = await getFolders()
        return NextResponse.json(folders)
    } catch (error) {
        console.error('Failed to fetch folders:', error)
        return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const { name, parentId } = await request.json()
        if (!name?.trim()) {
            return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })
        }
        const folder = await createFolder(name.trim(), parentId || null)
        return NextResponse.json(folder)
    } catch (error) {
        console.error('Failed to create folder:', error)
        return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 })
    }
}
