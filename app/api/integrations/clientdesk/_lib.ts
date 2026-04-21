import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { parseClientDeskApiKey, verifyClientDeskApiKey } from '@/lib/integrations/clientdesk'

export type IntegrationSettingsRow = {
    user_id: string
    vendor_name: string | null
    default_admin_whatsapp: string | null
    default_country_code: string | null
    default_max_photos: number | null
    default_detect_subfolders: boolean | null
    default_expiry_days: number | null
    default_download_expiry_days: number | null
    default_selection_enabled: boolean | null
    default_download_enabled: boolean | null
    default_extra_enabled: boolean | null
    default_extra_max_photos: number | null
    default_extra_expiry_days: number | null
    print_enabled: boolean | null
    default_print_selection_enabled: boolean | null
    default_print_expiry_days: number | null
    print_templates: unknown
    default_password: string | null
    clientdesk_integration_enabled: boolean | null
    clientdesk_api_key_id: string | null
    clientdesk_api_key_hash: string | null
    tenant_id: string | null
}

export function slugifyVendorName(value: string | null | undefined) {
    return (value || '')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}

export function buildClientProjectLink(origin: string, locale: string, vendorName: string | null | undefined, projectId: string) {
    const safeLocale = locale?.trim() || 'id'
    const slug = slugifyVendorName(vendorName)
    if (slug) {
        return `${origin}/${safeLocale}/client/${slug}/${projectId}`
    }
    return `${origin}/${safeLocale}/client/${projectId}`
}

export function buildDashboardProjectEditLink(origin: string, locale: string, projectId: string) {
    const safeLocale = locale?.trim() || 'id'
    const safeProjectId = encodeURIComponent((projectId || '').trim())
    return `${origin}/${safeLocale}/dashboard/projects/${safeProjectId}/edit`
}

export function createShortProjectId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let id = ''
    for (let i = 0; i < 12; i += 1) {
        id += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return id
}

function readFirstHeaderValue(value: string | null | undefined) {
    const raw = (value || '').trim()
    if (!raw) return ''
    return raw.split(',')[0]?.trim() || ''
}

function normalizeHost(value: string | null | undefined) {
    const raw = readFirstHeaderValue(value)
    if (!raw) return ''
    return raw
        .replace(/^https?:\/\//i, '')
        .split('/')[0]
        .trim()
}

function isLocalHost(host: string) {
    const normalized = host.split(':')[0]?.toLowerCase()
    return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1'
}

export function resolveClientDeskPublicOrigin(request: NextRequest, tenantDomainInput?: string | null) {
    const tenantDomain = normalizeHost(tenantDomainInput || '')
    if (tenantDomain) {
        const protocol = isLocalHost(tenantDomain) ? 'http' : 'https'
        return `${protocol}://${tenantDomain}`
    }

    const forwardedHost = normalizeHost(request.headers.get('x-forwarded-host'))
    const headerHost = normalizeHost(request.headers.get('host'))
    const requestHost = normalizeHost(request.nextUrl.host)
    const host = forwardedHost || headerHost || requestHost

    if (host) {
        const forwardedProto = readFirstHeaderValue(request.headers.get('x-forwarded-proto')).toLowerCase()
        const requestProto = (request.nextUrl.protocol || '').replace(':', '').toLowerCase()
        const protocol = forwardedProto === 'http' || forwardedProto === 'https'
            ? forwardedProto
            : isLocalHost(host)
                ? 'http'
                : requestProto === 'http' || requestProto === 'https'
                    ? requestProto
                    : 'https'
        return `${protocol}://${host}`
    }

    return request.nextUrl.origin
}

export async function resolveClientDeskIntegrationContext(request: NextRequest) {
    const headerKey = request.headers.get('x-clientdesk-api-key') || request.headers.get('authorization')
    const normalizedRaw = headerKey?.toLowerCase().startsWith('bearer ')
        ? headerKey.slice(7).trim()
        : (headerKey || '').trim()
    const parsed = parseClientDeskApiKey(normalizedRaw)
    if (!parsed) {
        return { error: 'Invalid API key format', status: 401 as const, context: null }
    }

    const supabaseAdmin = createServiceClient()
    const { data, error } = await supabaseAdmin
        .from('settings')
        .select('user_id, vendor_name, default_admin_whatsapp, default_country_code, default_max_photos, default_detect_subfolders, default_expiry_days, default_download_expiry_days, default_selection_enabled, default_download_enabled, default_extra_enabled, default_extra_max_photos, default_extra_expiry_days, print_enabled, default_print_selection_enabled, default_print_expiry_days, print_templates, default_password, clientdesk_integration_enabled, clientdesk_api_key_id, clientdesk_api_key_hash, tenant_id')
        .eq('clientdesk_api_key_id', parsed.keyId)
        .maybeSingle()

    if (error || !data) {
        return { error: 'Integration credential not found', status: 401 as const, context: null }
    }

    const settings = data as IntegrationSettingsRow
    if (!settings.clientdesk_integration_enabled) {
        return { error: 'ClientDesk integration is disabled', status: 403 as const, context: null }
    }

    if (!verifyClientDeskApiKey(parsed.raw, settings.clientdesk_api_key_hash)) {
        return { error: 'Invalid API key', status: 401 as const, context: null }
    }

    let tenantDomain: string | null = null
    if (settings.tenant_id) {
        const { data: tenantData } = await supabaseAdmin
            .from('tenants')
            .select('domain')
            .eq('id', settings.tenant_id)
            .maybeSingle()
        const normalizedTenantDomain = normalizeHost((tenantData as { domain?: string | null } | null)?.domain || '')
        tenantDomain = normalizedTenantDomain || null
    }

    return {
        error: null,
        status: 200 as const,
        context: {
            supabaseAdmin,
            settings,
            tenantDomain,
            keyId: parsed.keyId,
            rawKey: parsed.raw,
        },
    }
}

export async function writeClientDeskSyncLog(
    userId: string,
    payload: { status: string; message: string; at?: string },
) {
    const supabaseAdmin = createServiceClient()
    await supabaseAdmin
        .from('settings')
        .update({
            clientdesk_last_sync_status: payload.status,
            clientdesk_last_sync_message: payload.message,
            clientdesk_last_sync_at: payload.at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
}
