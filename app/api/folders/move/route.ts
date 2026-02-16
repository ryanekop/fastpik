
import { NextResponse } from 'next/server'
import { moveProjectsToFolder } from '@/lib/supabase/folders'

export async function POST(request: Request) {
    try {
        const { projectIds, folderId } = await request.json()
        if (!Array.isArray(projectIds) || projectIds.length === 0) {
            return NextResponse.json({ error: 'projectIds is required' }, { status: 400 })
        }
        await moveProjectsToFolder(projectIds, folderId ?? null)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to move projects:', error)
        return NextResponse.json({ error: 'Failed to move projects' }, { status: 500 })
    }
}
