
import { NextResponse } from 'next/server'
import { getProjects, createProject } from '@/lib/supabase/projects'
import type { Project } from '@/lib/project-store'

export async function GET() {
    try {
        const projects = await getProjects()
        return NextResponse.json(projects)
    } catch (error) {
        console.error('Failed to fetch projects:', error)
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const project = await createProject(body as Project)
        return NextResponse.json(project)
    } catch (error) {
        console.error('Failed to create project:', error)
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
    }
}
