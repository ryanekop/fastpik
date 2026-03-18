export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import {
    resolveClientDeskIntegrationContext,
    writeClientDeskSyncLog,
} from '../_lib'

type DeletePayload = {
    source_app?: string
    source_ref_id?: string
    booking_id?: string
    project_id?: string
}

function sanitizeString(value: unknown) {
    return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: NextRequest) {
    const resolved = await resolveClientDeskIntegrationContext(request)
    if (resolved.error || !resolved.context) {
        return NextResponse.json(
            { success: false, error: resolved.error || 'Unauthorized' },
            { status: resolved.status },
        )
    }

    const { supabaseAdmin, settings } = resolved.context

    try {
        const body = (await request.json()) as DeletePayload
        const sourceApp = sanitizeString(body.source_app) || 'clientdesk'
        const sourceRefId = sanitizeString(body.source_ref_id) || sanitizeString(body.booking_id)
        const fallbackProjectId = sanitizeString(body.project_id)

        if (!sourceRefId && !fallbackProjectId) {
            await writeClientDeskSyncLog(settings.user_id, {
                status: 'failed',
                message: 'Missing source_ref_id and project_id',
            })
            return NextResponse.json(
                { success: false, error: 'source_ref_id or project_id is required' },
                { status: 400 },
            )
        }

        let projectIdToDelete = ''

        if (sourceRefId) {
            const { data: sourceMatchedProject, error: sourceMatchError } = await supabaseAdmin
                .from('projects')
                .select('id')
                .eq('user_id', settings.user_id)
                .eq('source_app', sourceApp)
                .eq('source_ref_id', sourceRefId)
                .maybeSingle()

            if (sourceMatchError) throw sourceMatchError
            projectIdToDelete = sanitizeString(sourceMatchedProject?.id)
        }

        if (!projectIdToDelete && fallbackProjectId) {
            const { data: fallbackMatchedProject, error: fallbackMatchError } = await supabaseAdmin
                .from('projects')
                .select('id')
                .eq('user_id', settings.user_id)
                .eq('id', fallbackProjectId)
                .maybeSingle()

            if (fallbackMatchError) throw fallbackMatchError
            projectIdToDelete = sanitizeString(fallbackMatchedProject?.id)
        }

        if (!projectIdToDelete) {
            const message = sourceRefId
                ? `Project from source_ref_id ${sourceRefId} not found (already deleted)`
                : `Project ${fallbackProjectId} not found (already deleted)`
            await writeClientDeskSyncLog(settings.user_id, {
                status: 'success',
                message,
            })
            return NextResponse.json({
                success: true,
                action: 'not_found',
                project_id: fallbackProjectId || null,
                message: 'Project not found (already deleted).',
            })
        }

        const { error: deleteError } = await supabaseAdmin
            .from('projects')
            .delete()
            .eq('id', projectIdToDelete)
            .eq('user_id', settings.user_id)

        if (deleteError) throw deleteError

        await writeClientDeskSyncLog(settings.user_id, {
            status: 'success',
            message: `Deleted project ${projectIdToDelete} from ClientDesk`,
        })

        return NextResponse.json({
            success: true,
            action: 'deleted',
            project_id: projectIdToDelete,
            message: 'Project deleted successfully.',
        })
    } catch (error: any) {
        console.error('[ClientDesk delete] failed:', error)
        await writeClientDeskSyncLog(settings.user_id, {
            status: 'failed',
            message: error?.message || 'Failed to delete project from ClientDesk',
        })
        return NextResponse.json(
            { success: false, error: error?.message || 'Failed to delete project' },
            { status: 500 },
        )
    }
}
