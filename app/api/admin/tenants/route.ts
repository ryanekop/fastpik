import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { invalidateTenantCache } from '@/lib/tenant-resolver'

// CORS headers for cross-origin requests from license portal
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-api-key',
}

function corsResponse(data: unknown, init?: { status?: number }) {
    return NextResponse.json(data, { ...init, headers: CORS_HEADERS })
}

// Preflight
export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

// Verify admin access via API key only
function verifyAdmin(request: NextRequest) {
    const apiKey = request.headers.get('x-admin-api-key')
    return apiKey && apiKey === process.env.ADMIN_API_KEY
}

// GET: List all tenants
export async function GET(request: NextRequest) {
    if (!verifyAdmin(request)) {
        return corsResponse({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: true })

    if (error) {
        return corsResponse({ error: error.message }, { status: 500 })
    }

    return corsResponse(data)
}

// POST: Create new tenant
export async function POST(request: NextRequest) {
    if (!verifyAdmin(request)) {
        return corsResponse({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { slug, name, domain, logo_url, favicon_url, primary_color, footer_text } = body

    if (!slug || !name) {
        return corsResponse({ error: 'slug and name are required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
        .from('tenants')
        .insert({
            slug,
            name,
            domain: domain || null,
            logo_url: logo_url || null,
            favicon_url: favicon_url || null,
            primary_color: primary_color || '#7c3aed',
            footer_text: footer_text || null,
        })
        .select()
        .single()

    if (error) {
        return corsResponse({ error: error.message }, { status: 500 })
    }

    // Clear cache so new domain resolves immediately
    invalidateTenantCache()

    return corsResponse(data, { status: 201 })
}

// PUT: Update existing tenant
export async function PUT(request: NextRequest) {
    if (!verifyAdmin(request)) {
        return corsResponse({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
        return corsResponse({ error: 'id is required' }, { status: 400 })
    }

    // Get old domain before update (for cache invalidation)
    const supabase = createServiceClient()
    const { data: oldTenant } = await supabase
        .from('tenants')
        .select('domain')
        .eq('id', id)
        .single()

    const { data, error } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        return corsResponse({ error: error.message }, { status: 500 })
    }

    // Invalidate cache for both old and new domains
    if (oldTenant?.domain) invalidateTenantCache(oldTenant.domain)
    if (data?.domain) invalidateTenantCache(data.domain)

    return corsResponse(data)
}
