export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import {
    buildClientProjectLink,
    buildDashboardProjectEditLink,
    createShortProjectId,
    resolveClientDeskPublicOrigin,
    resolveClientDeskIntegrationContext,
    writeClientDeskSyncLog,
} from '../_lib'

type ClientDeskDefaults = {
    max_photos?: number | null
    selection_days?: number | null
    download_days?: number | null
    selection_enabled?: boolean | null
    download_enabled?: boolean | null
    detect_subfolders?: boolean | null
    default_password?: string | null
}

type UpsertFreelancer = {
    id?: string | null
    name?: string | null
    whatsapp?: string | null
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
    freelancers?: UpsertFreelancer[] | null
    clientdesk_defaults?: ClientDeskDefaults | null
    sync_offset_ms?: number
}

type SyncedProjectRow = {
    id: string
    link: string | null
    max_photos: number | null
    detect_subfolders: boolean | null
    selection_enabled: boolean | null
    download_enabled: boolean | null
    print_enabled: boolean | null
    password: string | null
    expires_at: string | null
    download_expires_at: string | null
    print_expires_at: string | null
    print_sizes: unknown
    project_type: string | null
}

type PrintSize = {
    name: string
    quota: number
}

type PrintTemplate = {
    name: string
    sizes: PrintSize[]
}

const DAY_IN_MS = 24 * 60 * 60 * 1000

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

function normalizePrintSizes(value: unknown) {
    if (!Array.isArray(value)) return []
    return value
        .map((entry) => {
            if (!entry || typeof entry !== 'object') return null
            const typed = entry as { name?: unknown; quota?: unknown }
            const name = typeof typed.name === 'string' ? typed.name.trim() : ''
            if (!name) return null
            return { name, quota: Math.max(1, Number(typed.quota) || 1) }
        })
        .filter((entry): entry is { name: string; quota: number } => Boolean(entry))
}

function getFirstPrintTemplateSizes(value: unknown) {
    return normalizePrintTemplates(value)[0]?.sizes || []
}

function sanitizeString(value: unknown) {
    return typeof value === 'string' ? value.trim() : ''
}

function sanitizeFreelancersSnapshot(value: unknown): { id?: string; name: string; whatsapp: string }[] {
    if (!Array.isArray(value)) return []
    return value
        .slice(0, 5)
        .map((entry) => {
            if (!entry || typeof entry !== 'object') return null
            const typed = entry as UpsertFreelancer
            const name = sanitizeString(typed.name)
            const whatsapp = sanitizeString(typed.whatsapp)
            const id = sanitizeString(typed.id)
            if (!name || !whatsapp) return null
            return id
                ? { id, name, whatsapp }
                : { name, whatsapp }
        })
        .filter((entry): entry is { id?: string; name: string; whatsapp: string } => Boolean(entry))
}

function toNullableNonNegativeInt(value: unknown) {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return null
    const normalized = Math.floor(parsed)
    return normalized >= 0 ? normalized : null
}

function toRemainingDays(expiresAt: string | null | undefined, referenceTimeMs: number) {
    const raw = sanitizeString(expiresAt)
    if (!raw) return null
    const timestamp = Date.parse(raw)
    if (!Number.isFinite(timestamp)) return null
    const diff = timestamp - referenceTimeMs
    if (diff <= 0) return 0
    return Math.ceil(diff / DAY_IN_MS)
}

function normalizePrintTemplates(value: unknown): PrintTemplate[] {
    if (!Array.isArray(value)) return []
    return value
        .map((entry) => {
            if (!entry || typeof entry !== 'object') return null
            const typed = entry as { name?: unknown; sizes?: unknown }
            const name = sanitizeString(typed.name)
            if (!name) return null
            const sizes = normalizePrintSizes(typed.sizes)
            return {
                name,
                sizes,
            }
        })
        .filter((entry): entry is PrintTemplate => Boolean(entry))
}

function arePrintSizesEqual(left: PrintSize[], right: PrintSize[]) {
    if (left.length !== right.length) return false
    return left.every((entry, index) => {
        const counterpart = right[index]
        if (!counterpart) return false
        return entry.name === counterpart.name && entry.quota === counterpart.quota
    })
}

function formatPrintSizesLabel(printSizes: PrintSize[]) {
    if (printSizes.length === 0) return null
    return printSizes.map((size) => `${size.name}x${size.quota}`).join(', ')
}

function resolvePrintTemplateDetail(
    projectPrintSizesInput: unknown,
    settingsPrintTemplatesInput: unknown,
) {
    const projectPrintSizes = normalizePrintSizes(projectPrintSizesInput)
    const printSizeLabel = formatPrintSizesLabel(projectPrintSizes)
    const printTemplates = normalizePrintTemplates(settingsPrintTemplatesInput)
    const matchedTemplate = printTemplates.find((template) =>
        arePrintSizesEqual(template.sizes, projectPrintSizes),
    ) || null

    return {
        printSizeLabel,
        printTemplateLabel: matchedTemplate?.name || null,
    }
}

function buildProjectInfoSnapshot(
    project: SyncedProjectRow,
    referenceTimeMs: number,
    settingsPrintTemplatesInput: unknown,
) {
    const printDetail = resolvePrintTemplateDetail(
        project.print_sizes,
        settingsPrintTemplatesInput,
    )

    return {
        password: sanitizeString(project.password) || null,
        max_photos: toNullableNonNegativeInt(project.max_photos),
        detect_subfolders: Boolean(project.detect_subfolders),
        selection_enabled: project.selection_enabled !== false,
        download_enabled: project.download_enabled !== false,
        print_enabled: Boolean(project.print_enabled),
        selection_days: toRemainingDays(project.expires_at, referenceTimeMs),
        download_days: toRemainingDays(project.download_expires_at, referenceTimeMs),
        print_days: toRemainingDays(project.print_expires_at, referenceTimeMs),
        project_type: sanitizeString(project.project_type) || null,
        print_template: printDetail.printTemplateLabel
            ? {
                label: printDetail.printTemplateLabel,
                description: printDetail.printSizeLabel,
                print_size: {
                    label: printDetail.printSizeLabel,
                    description: null,
                },
            }
            : null,
        print_size: printDetail.printSizeLabel
            ? {
                label: printDetail.printSizeLabel,
                description: null,
            }
            : null,
    }
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
        const freelancersSnapshot = Array.isArray(body.freelancers)
            ? sanitizeFreelancersSnapshot(body.freelancers)
            : null
        const now = Date.now()
        const syncOffsetMs = Math.max(0, Math.floor(Number(body.sync_offset_ms) || 0))
        const syncAtMs = now + syncOffsetMs
        const syncAtIso = new Date(syncAtMs).toISOString()

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
            .select('id, link, max_photos, detect_subfolders, selection_enabled, download_enabled, print_enabled, password, expires_at, download_expires_at, print_expires_at, print_sizes, project_type')
            .eq('user_id', settings.user_id)
            .eq('source_app', sourceApp)
            .eq('source_ref_id', sourceRefId)
            .maybeSingle()

        if (findError) {
            throw findError
        }

        if (existingProject) {
            const existingProjectRow = existingProject as SyncedProjectRow
            const canonicalLink = buildClientProjectLink(
                publicOrigin,
                locale,
                settings.vendor_name,
                existingProjectRow.id,
            )
            const shouldRepairLink = (existingProjectRow.link || '') !== canonicalLink
            const updatePayload: Record<string, unknown> = {
                client_name: clientName,
                client_whatsapp: clientWhatsapp || null,
                gdrive_link: gdriveLink,
                source_last_synced_at: syncAtIso,
            }
            if (freelancersSnapshot !== null) {
                updatePayload.freelancers_snapshot = freelancersSnapshot
            }
            if (shouldRepairLink) {
                updatePayload.link = canonicalLink
            }

            const { error: updateError } = await supabaseAdmin
                .from('projects')
                .update(updatePayload)
                .eq('id', existingProjectRow.id)
                .eq('user_id', settings.user_id)

            if (updateError) {
                throw updateError
            }

            await writeClientDeskSyncLog(settings.user_id, {
                status: 'success',
                message: `Updated project ${existingProjectRow.id} from ClientDesk`,
                at: syncAtIso,
            })

            const projectInfo = buildProjectInfoSnapshot(
                existingProjectRow,
                syncAtMs,
                settings.print_templates,
            )
            const projectLink = shouldRepairLink ? canonicalLink : existingProjectRow.link
            return NextResponse.json({
                success: true,
                action: 'updated',
                project_id: existingProjectRow.id,
                project_link: projectLink,
                project_edit_link: buildDashboardProjectEditLink(
                    publicOrigin,
                    locale,
                    existingProjectRow.id,
                ),
                password: projectInfo.password,
                max_photos: projectInfo.max_photos,
                selection_enabled: projectInfo.selection_enabled,
                download_enabled: projectInfo.download_enabled,
                print_enabled: projectInfo.print_enabled,
                detect_subfolders: projectInfo.detect_subfolders,
                selection_days: projectInfo.selection_days,
                download_days: projectInfo.download_days,
                print_days: projectInfo.print_days,
                project_type: projectInfo.project_type,
                project_info: projectInfo,
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
        const defaultSelectionEnabled = presetSource === 'clientdesk'
            ? fromClientDesk.selection_enabled !== false
            : settings.default_selection_enabled !== false
        const defaultDownloadEnabled = presetSource === 'clientdesk'
            ? fromClientDesk.download_enabled !== false
            : settings.default_download_enabled !== false
        const defaultExtraEnabled = presetSource === 'fastpik' && Boolean(settings.default_extra_enabled)
        const defaultExtraMaxPhotos = defaultExtraEnabled
            ? toPositiveInt(settings.default_extra_max_photos, 1)
            : null
        const defaultExtraDays = defaultExtraEnabled
            ? toNullableDays(settings.default_extra_expiry_days)
            : null
        const defaultPrintSizes = presetSource === 'fastpik' && settings.print_enabled && settings.default_print_selection_enabled
            ? getFirstPrintTemplateSizes(settings.print_templates)
            : []
        const defaultPrintEnabled = defaultPrintSizes.length > 0
        const defaultPrintDays = defaultPrintEnabled
            ? toNullableDays(settings.default_print_expiry_days)
            : null
        const defaultDetectSubfolders = presetSource === 'clientdesk'
            ? Boolean(fromClientDesk.detect_subfolders)
            : Boolean(settings.default_detect_subfolders)
        const defaultPassword = presetSource === 'clientdesk'
            ? sanitizeString(fromClientDesk.default_password) || null
            : sanitizeString(settings.default_password) || null

        const projectId = createShortProjectId()
        const createdAtIso = new Date(syncAtMs).toISOString()
        const expiresAt = defaultSelectionDays
            ? new Date(syncAtMs + defaultSelectionDays * DAY_IN_MS).toISOString()
            : null
        const downloadExpiresAt = defaultDownloadDays
            ? new Date(syncAtMs + defaultDownloadDays * DAY_IN_MS).toISOString()
            : null
        const extraExpiresAt = defaultExtraDays
            ? new Date(syncAtMs + defaultExtraDays * DAY_IN_MS).toISOString()
            : null
        const printExpiresAt = defaultPrintDays
            ? new Date(syncAtMs + defaultPrintDays * DAY_IN_MS).toISOString()
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
                selection_enabled: defaultSelectionEnabled,
                download_enabled: defaultDownloadEnabled,
                extra_enabled: defaultExtraEnabled,
                extra_max_photos: defaultExtraMaxPhotos,
                extra_expires_at: extraExpiresAt,
                print_enabled: defaultPrintEnabled,
                print_sizes: defaultPrintSizes,
                print_expires_at: printExpiresAt,
                created_at: createdAtIso,
                link,
                folder_id: null,
                project_type: 'edit',
                freelancers_snapshot: freelancersSnapshot || [],
                source_app: sourceApp,
                source_ref_id: sourceRefId,
                source_last_synced_at: syncAtIso,
            })
            .select('id, link, max_photos, detect_subfolders, selection_enabled, download_enabled, print_enabled, password, expires_at, download_expires_at, print_expires_at, print_sizes, project_type')
            .single()

        if (insertError) {
            throw insertError
        }

        const insertedProject = inserted as SyncedProjectRow
        await writeClientDeskSyncLog(settings.user_id, {
            status: 'success',
            message: `Created project ${insertedProject.id} from ClientDesk`,
            at: syncAtIso,
        })

        const projectInfo = buildProjectInfoSnapshot(
            insertedProject,
            syncAtMs,
            settings.print_templates,
        )
        return NextResponse.json({
            success: true,
            action: 'created',
            project_id: insertedProject.id,
            project_link: insertedProject.link,
            project_edit_link: buildDashboardProjectEditLink(
                publicOrigin,
                locale,
                insertedProject.id,
            ),
            password: projectInfo.password,
            max_photos: projectInfo.max_photos,
            selection_enabled: projectInfo.selection_enabled,
            download_enabled: projectInfo.download_enabled,
            print_enabled: projectInfo.print_enabled,
            detect_subfolders: projectInfo.detect_subfolders,
            selection_days: projectInfo.selection_days,
            download_days: projectInfo.download_days,
            print_days: projectInfo.print_days,
            project_type: projectInfo.project_type,
            project_info: projectInfo,
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
