
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { getUserId, createBatchProjects } from '@/lib/supabase/projects'
import { checkSubscriptionStatus } from '@/lib/subscription-service'
import type { Project } from '@/lib/project-store'

export async function POST(request: Request) {
    try {
        const userId = await getUserId()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check subscription limits
        const subStatus = await checkSubscriptionStatus(userId)
        const body = await request.json()
        const projects: Project[] = body.projects

        if (!Array.isArray(projects) || projects.length === 0) {
            return NextResponse.json({ error: 'No projects provided' }, { status: 400 })
        }

        // Check if user has enough capacity
        const remaining = subStatus.projectLimit - subStatus.projectCount
        if (!subStatus.canCreateProject || projects.length > remaining) {
            return NextResponse.json({
                error: 'Project limit exceeded',
                message: subStatus.isExpired
                    ? 'Langganan Anda telah berakhir. Upgrade ke Pro untuk melanjutkan.'
                    : `Batas project terlampaui. Tersisa ${remaining} slot, mencoba import ${projects.length} project. Upgrade ke Pro untuk unlimited.`,
                upgradeRequired: true,
                remaining,
                requested: projects.length
            }, { status: 403 })
        }

        const created = await createBatchProjects(projects)
        return NextResponse.json({ projects: created, count: created.length })
    } catch (error) {
        console.error('Failed to batch create projects:', error)
        return NextResponse.json({ error: 'Failed to batch create projects' }, { status: 500 })
    }
}
