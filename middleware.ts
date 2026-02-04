
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { updateSession } from './lib/supabase/middleware';
import { NextRequest, NextResponse } from 'next/server';

export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip i18n middleware for API routes - they don't need locale prefixes
    if (pathname.startsWith('/api/')) {
        // Still run Supabase session update for auth on API routes
        return await updateSession(request, NextResponse.next());
    }

    // 1. Run next-intl middleware first to handle localization
    const handleI18n = createMiddleware(routing);
    const response = handleI18n(request);

    // 2. Pass the response to Supabase middleware to handle session refreshing and auth protection
    return await updateSession(request, response);
}

export const config = {
    // Match all routes including those without locale prefix
    // This allows the middleware to redirect /dashboard/login -> /id/dashboard/login
    matcher: ['/', '/(id|en)/:path*', '/dashboard/:path*', '/client/:path*', '/api/:path*']
};
