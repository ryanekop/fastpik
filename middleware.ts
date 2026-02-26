
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { updateSession } from './lib/supabase/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from './lib/tenant-resolver';

export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // ============================================================
    // MULTI-TENANT: Resolve tenant from hostname
    // ============================================================
    const hostname = request.headers.get('host') || '';
    const tenant = await resolveTenant(hostname);

    // Inject tenant info as request headers (readable by server components)
    request.headers.set('x-tenant-id', tenant.id);
    request.headers.set('x-tenant-slug', tenant.slug);
    request.headers.set('x-tenant-name', tenant.name);
    request.headers.set('x-tenant-domain', tenant.domain || '');
    request.headers.set('x-tenant-logo', tenant.logoUrl || '/fastpik-logo.png');
    request.headers.set('x-tenant-favicon', tenant.faviconUrl || '');
    request.headers.set('x-tenant-color', tenant.primaryColor || '');
    request.headers.set('x-tenant-footer', tenant.footerText || '');

    // Skip i18n middleware for API routes - they don't need locale prefixes
    if (pathname.startsWith('/api/')) {
        // Still run Supabase session update for auth on API routes
        return await updateSession(request, NextResponse.next({
            request: { headers: request.headers },
        }));
    }

    // 1. Run next-intl middleware first to handle localization
    const handleI18n = createMiddleware(routing);
    const response = handleI18n(request);

    // 2. Copy tenant headers to the response so they're available in server components
    response.headers.set('x-tenant-id', tenant.id);
    response.headers.set('x-tenant-slug', tenant.slug);
    response.headers.set('x-tenant-name', tenant.name);
    response.headers.set('x-tenant-domain', tenant.domain || '');
    response.headers.set('x-tenant-logo', tenant.logoUrl || '/fastpik-logo.png');
    response.headers.set('x-tenant-favicon', tenant.faviconUrl || '');
    response.headers.set('x-tenant-color', tenant.primaryColor || '');
    response.headers.set('x-tenant-footer', tenant.footerText || '');

    // 3. Pass the response to Supabase middleware to handle session refreshing and auth protection
    return await updateSession(request, response);
}

export const config = {
    // Match all routes including those without locale prefix
    // This allows the middleware to redirect /dashboard/login -> /id/dashboard/login
    matcher: ['/', '/(id|en)/:path*', '/dashboard/:path*', '/client/:path*', '/auth/:path*', '/api/:path*']
};
