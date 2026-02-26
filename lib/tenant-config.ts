import { headers } from 'next/headers'

// =============================================
// Tenant Config Helper — read from request headers
// Use in Server Components / Server Actions
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
}

const DEFAULT_TENANT: TenantConfig = {
    id: 'default',
    slug: 'fastpik',
    name: 'Fastpik',
    domain: null,
    logoUrl: '/fastpik-logo.png',
    faviconUrl: null,
    primaryColor: '#7c3aed',
    footerText: null,
}

/**
 * Read tenant config from request headers.
 * These headers are set by middleware during tenant resolution.
 * Use this in Server Components.
 */
export async function getTenantConfig(): Promise<TenantConfig> {
    const headersList = await headers()

    const id = headersList.get('x-tenant-id')
    if (!id || id === 'default') {
        return DEFAULT_TENANT
    }

    return {
        id,
        slug: headersList.get('x-tenant-slug') || 'fastpik',
        name: headersList.get('x-tenant-name') || 'Fastpik',
        domain: headersList.get('x-tenant-domain'),
        logoUrl: headersList.get('x-tenant-logo') || '/fastpik-logo.png',
        faviconUrl: headersList.get('x-tenant-favicon'),
        primaryColor: headersList.get('x-tenant-color') || '#7c3aed',
        footerText: headersList.get('x-tenant-footer'),
    }
}
