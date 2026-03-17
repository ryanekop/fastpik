import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { parseClientDeskApiKey, verifyClientDeskApiKey } from '@/lib/integrations/clientdesk'

export type IntegrationSettingsRow = {
    user_id: string
    vendor_name: string | null
    default_admin_whatsapp: string | null
    default_country_code: string | null
    default_max_photos: number | null
    default_expiry_days: number | null
    default_download_expiry_days: number | null
    default_password: string | null
    clientdesk_integration_enabled: boolean | null
    clientdesk_api_key_id: string | null
    clientdesk_api_key_hash: string | null
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

export function createShortProjectId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let id = ''
    for (let i = 0; i < 12; i += 1) {
        id += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return id
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
        .select('user_id, vendor_name, default_admin_whatsapp, default_country_code, default_max_photos, default_expiry_days, default_download_expiry_days, default_password, clientdesk_integration_enabled, clientdesk_api_key_id, clientdesk_api_key_hash')
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

    return {
        error: null,
        status: 200 as const,
        context: {
            supabaseAdmin,
            settings,
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

