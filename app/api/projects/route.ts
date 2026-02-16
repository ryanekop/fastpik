
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { getProjects, createProject, getUserId } from '@/lib/supabase/projects'
import { checkSubscriptionStatus } from '@/lib/subscription-service'
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
        // Check subscription limits
        const userId = await getUserId()
        if (userId) {
            const subStatus = await checkSubscriptionStatus(userId)
            if (!subStatus.canCreateProject) {
                return NextResponse.json({
                    error: 'Project limit reached',
                    message: subStatus.isExpired
                        ? 'Langganan Anda telah berakhir. Upgrade ke Pro untuk melanjutkan.'
                        : `Batas project tercapai (${subStatus.projectCount}/${subStatus.projectLimit}). Upgrade ke Pro untuk unlimited project.`,
                    upgradeRequired: true
                }, { status: 403 })
            }
        }

        const body = await request.json()
        const project = await createProject(body as Project)
        return NextResponse.json(project)
    } catch (error) {
        console.error('Failed to create project:', error)
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
    }
}

