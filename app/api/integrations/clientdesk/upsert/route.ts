export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import {
    buildClientProjectLink,
    createShortProjectId,
    resolveClientDeskPublicOrigin,
    resolveClientDeskIntegrationContext,
    writeClientDeskSyncLog,
} from '../_lib'

type ClientDeskDefaults = {
    max_photos?: number | null
    selection_days?: number | null
    download_days?: number | null
    detect_subfolders?: boolean | null
    default_password?: string | null
}

type UpsertPayload = {
    source_app?: string
    source_ref_id?: string
    booking_id?: string
    locale?: string
    preset_source?: 'clientdesk' | 'fastpik'
    client_name?: string
    client_whatsapp?: string | null
    gdrive_link?: string
    clientdesk_defaults?: ClientDeskDefaults | null
    sync_offset_ms?: number
}

function toPositiveInt(value: unknown, fallback: number) {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return fallback
    if (parsed <= 0) return fallback
    return Math.floor(parsed)
}

function toNullableDays(value: unknown) {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return null
    if (parsed <= 0) return null
    return Math.floor(parsed)
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

    const { supabaseAdmin, settings, tenantDomain } = resolved.context

    try {
        const body = (await request.json()) as UpsertPayload

        const sourceApp = sanitizeString(body.source_app) || 'clientdesk'
        const sourceRefId = sanitizeString(body.source_ref_id) || sanitizeString(body.booking_id)
        const locale = sanitizeString(body.locale) || 'id'
        const clientName = sanitizeString(body.client_name)
        const clientWhatsapp = sanitizeString(body.client_whatsapp)
        const gdriveLink = sanitizeString(body.gdrive_link)
        const now = Date.now()
        const syncOffsetMs = Math.max(0, Math.floor(Number(body.sync_offset_ms) || 0))
        const syncAtIso = new Date(now + syncOffsetMs).toISOString()

        if (!sourceRefId) {
            await writeClientDeskSyncLog(settings.user_id, {
                status: 'failed',
                message: 'Missing source_ref_id',
            })
            return NextResponse.json({ success: false, error: 'source_ref_id is required' }, { status: 400 })
        }

        if (!clientName) {
            await writeClientDeskSyncLog(settings.user_id, {
                status: 'failed',
                message: 'Missing client_name',
            })
            return NextResponse.json({ success: false, error: 'client_name is required' }, { status: 400 })
        }

        if (!gdriveLink) {
            await writeClientDeskSyncLog(settings.user_id, {
                status: 'warning',
                message: 'Skipping sync because gdrive_link is empty',
            })
            return NextResponse.json(
                { success: false, code: 'missing_drive_link', error: 'gdrive_link is required' },
                { status: 422 },
            )
        }

        const publicOrigin = resolveClientDeskPublicOrigin(request, tenantDomain)

        const { data: existingProject, error: findError } = await supabaseAdmin
            .from('projects')
            .select('id, link')
            .eq('user_id', settings.user_id)
            .eq('source_app', sourceApp)
            .eq('source_ref_id', sourceRefId)
            .maybeSingle()

        if (findError) {
            throw findError
        }

        if (existingProject) {
            const canonicalLink = buildClientProjectLink(
                publicOrigin,
                locale,
                settings.vendor_name,
                existingProject.id,
            )
            const shouldRepairLink = (existingProject.link || '') !== canonicalLink
            const updatePayload: Record<string, unknown> = {
                client_name: clientName,
                client_whatsapp: clientWhatsapp || null,
                gdrive_link: gdriveLink,
                source_last_synced_at: syncAtIso,
            }
            if (shouldRepairLink) {
                updatePayload.link = canonicalLink
            }

            const { error: updateError } = await supabaseAdmin
                .from('projects')
                .update(updatePayload)
                .eq('id', existingProject.id)
                .eq('user_id', settings.user_id)

            if (updateError) {
                throw updateError
            }

            await writeClientDeskSyncLog(settings.user_id, {
                status: 'success',
                message: `Updated project ${existingProject.id} from ClientDesk`,
                at: syncAtIso,
            })

            return NextResponse.json({
                success: true,
                action: 'updated',
                project_id: existingProject.id,
                project_link: shouldRepairLink ? canonicalLink : existingProject.link,
            })
        }

        const presetSource = body.preset_source === 'clientdesk' ? 'clientdesk' : 'fastpik'
        const fromClientDesk = body.clientdesk_defaults || {}
        const defaultMaxPhotos = presetSource === 'clientdesk'
            ? toPositiveInt(fromClientDesk.max_photos, 10)
            : toPositiveInt(settings.default_max_photos, 10)
        const defaultSelectionDays = presetSource === 'clientdesk'
            ? toNullableDays(fromClientDesk.selection_days)
            : toNullableDays(settings.default_expiry_days)
        const defaultDownloadDays = presetSource === 'clientdesk'
            ? toNullableDays(fromClientDesk.download_days)
            : toNullableDays(settings.default_download_expiry_days)
        const defaultDetectSubfolders = presetSource === 'clientdesk'
            ? Boolean(fromClientDesk.detect_subfolders)
            : false
        const defaultPassword = presetSource === 'clientdesk'
            ? sanitizeString(fromClientDesk.default_password) || null
            : sanitizeString(settings.default_password) || null

        const projectId = createShortProjectId()
        const createdAtIso = new Date(now + syncOffsetMs).toISOString()
        const expiresAt = defaultSelectionDays
            ? new Date(now + syncOffsetMs + defaultSelectionDays * 24 * 60 * 60 * 1000).toISOString()
            : null
        const downloadExpiresAt = defaultDownloadDays
            ? new Date(now + syncOffsetMs + defaultDownloadDays * 24 * 60 * 60 * 1000).toISOString()
            : null
        const link = buildClientProjectLink(
            publicOrigin,
            locale,
            settings.vendor_name,
            projectId,
        )

        const { data: inserted, error: insertError } = await supabaseAdmin
            .from('projects')
            .insert({
                id: projectId,
                user_id: settings.user_id,
                client_name: clientName,
                gdrive_link: gdriveLink,
                client_whatsapp: clientWhatsapp || null,
                admin_whatsapp: settings.default_admin_whatsapp || null,
                country_code: settings.default_country_code || '+62',
                max_photos: defaultMaxPhotos,
                password: defaultPassword,
                detect_subfolders: defaultDetectSubfolders,
                expires_at: expiresAt,
                download_expires_at: downloadExpiresAt,
                created_at: createdAtIso,
                link,
                folder_id: null,
                project_type: 'edit',
                source_app: sourceApp,
                source_ref_id: sourceRefId,
                source_last_synced_at: syncAtIso,
            })
            .select('id, link')
            .single()

        if (insertError) {
            throw insertError
        }

        await writeClientDeskSyncLog(settings.user_id, {
            status: 'success',
            message: `Created project ${inserted.id} from ClientDesk`,
            at: syncAtIso,
        })

        return NextResponse.json({
            success: true,
            action: 'created',
            project_id: inserted.id,
            project_link: inserted.link,
        })
    } catch (error: any) {
        console.error('[ClientDesk upsert] failed:', error)
        await writeClientDeskSyncLog(settings.user_id, {
            status: 'failed',
            message: error?.message || 'Failed to upsert project from ClientDesk',
        })
        return NextResponse.json(
            { success: false, error: error?.message || 'Failed to upsert project' },
            { status: 500 },
        )
    }
}
