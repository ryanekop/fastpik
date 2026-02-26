import { createClient } from '@supabase/supabase-js'

// =============================================
// Tenant Resolver — hostname-based multi-tenancy
// =============================================

export interface TenantConfig {
    id: string
    slug: string
    name: string
    domain: string | null
    logoUrl: string | null
    faviconUrl: string | null
    primaryColor: string
    footerText: string | null
    isActive: boolean
}

// Default tenant config (Fastpik)
const DEFAULT_TENANT: TenantConfig = {
    id: 'default',
    slug: 'fastpik',
    name: 'Fastpik',
    domain: null,
    logoUrl: '/fastpik-logo.png',
    faviconUrl: null,
    primaryColor: '#7c3aed',
    footerText: null,
    isActive: true,
}

// In-memory cache: hostname → { tenant, expiry }
const tenantCache = new Map<string, { tenant: TenantConfig; expiry: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Resolve a hostname to a TenantConfig.
 * Uses in-memory cache to avoid DB calls on every request.
 */
export async function resolveTenant(hostname: string): Promise<TenantConfig> {
    // Strip port (e.g. localhost:3000 → localhost)
    const cleanHost = hostname.split(':')[0]

    // Check cache first
    const cached = tenantCache.get(cleanHost)
    if (cached && Date.now() < cached.expiry) {
        return cached.tenant
    }

    // Lookup from database using service role (bypasses RLS)
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        const { data, error } = await supabase
            .from('tenants')
            .select('id, slug, name, domain, logo_url, favicon_url, primary_color, footer_text, is_active')
            .eq('domain', cleanHost)
            .eq('is_active', true)
            .single()

        if (data && !error) {
            const tenant: TenantConfig = {
                id: data.id,
                slug: data.slug,
                name: data.name,
                domain: data.domain,
                logoUrl: data.logo_url,
                faviconUrl: data.favicon_url,
                primaryColor: data.primary_color || '#7c3aed',
                footerText: data.footer_text,
                isActive: data.is_active,
            }
            tenantCache.set(cleanHost, { tenant, expiry: Date.now() + CACHE_TTL_MS })
            return tenant
        }
    } catch (err) {
        console.error('[Tenant Resolver] DB lookup failed:', err)
    }

    // Fallback: return default Fastpik tenant
    tenantCache.set(cleanHost, { tenant: DEFAULT_TENANT, expiry: Date.now() + CACHE_TTL_MS })
    return DEFAULT_TENANT
}

/**
 * Clear cached tenant for a specific hostname.
 * Call this when tenant config is updated via admin panel.
 */
export function invalidateTenantCache(hostname?: string) {
    if (hostname) {
        tenantCache.delete(hostname.split(':')[0])
    } else {
        tenantCache.clear()
    }
}
