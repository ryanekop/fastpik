
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest, response: NextResponse) {
    const pathname = request.nextUrl.pathname

    // ============================================================
    // PERFORMANCE: Skip ALL Supabase calls for public routes
    // This avoids the ~1-2s latency from getUser() on every request
    // ============================================================
    const isClientRoute = pathname.includes('/client')
    const isPublicRoute =
        /^\/[a-z]{2}\/?$/.test(pathname) ||       // Landing page: /en, /id, /en/, /id/
        pathname.includes('/pricing') ||
        pathname.includes('/features') ||
        pathname === '/'

    if (isClientRoute || isPublicRoute) {
        return response
    }

    // Only create Supabase client for routes that need auth (dashboard, etc.)
    let supabaseResponse = response

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )

                    supabaseResponse = NextResponse.next({
                        request,
                    })

                    // Copy headers/cookies from the original response (next-intl) to the new one
                    response.headers.forEach((value, key) => {
                        supabaseResponse.headers.set(key, value)
                    })

                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: DO NOT REMOVE auth.getUser()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Protected Routes Logic - now uses /dashboard instead of /admin
    const isDashboardRoute = pathname.includes('/dashboard')

    // Public dashboard routes (no auth required)
    const isPublicDashboardRoute =
        pathname.includes('/dashboard/login') ||
        pathname.includes('/dashboard/forgot-password') ||
        pathname.includes('/dashboard/reset-password') ||
        pathname.includes('/dashboard/register')

    if (isDashboardRoute && !isPublicDashboardRoute && !user) {
        // Redirect unauthenticated user to login
        const segments = pathname.split('/')
        const locale = segments[1] || 'id' // e.g. 'en' or 'id'
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = `/${locale}/dashboard/login`
        loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search || ''}`)
        return NextResponse.redirect(loginUrl)
    }

    // If user is logged in and tries to access login page, redirect to dashboard
    const isTenantAuthHandoff = pathname.includes('/dashboard/login') && request.nextUrl.searchParams.has('handoff')

    if (user && isPublicDashboardRoute && !pathname.includes('/dashboard/reset-password') && !isTenantAuthHandoff) {
        const segments = pathname.split('/')
        const locale = segments[1] || 'id'
        const nextTarget = (request.nextUrl.searchParams.get('next') || '').trim()
        const allowedPrefix = `/${locale}/dashboard`

        if (
            nextTarget &&
            nextTarget.startsWith('/') &&
            !nextTarget.startsWith('//') &&
            nextTarget.startsWith(allowedPrefix)
        ) {
            const nextUrl = request.nextUrl.clone()
            const queryIndex = nextTarget.indexOf('?')
            const nextPath = queryIndex >= 0 ? nextTarget.slice(0, queryIndex) : nextTarget
            const nextQuery = queryIndex >= 0 ? nextTarget.slice(queryIndex + 1) : ''
            nextUrl.pathname = nextPath
            nextUrl.search = nextQuery ? `?${nextQuery}` : ''
            return NextResponse.redirect(nextUrl)
        }

        const dashboardUrl = request.nextUrl.clone()
        dashboardUrl.pathname = `/${locale}/dashboard`
        dashboardUrl.search = ''
        return NextResponse.redirect(dashboardUrl)
    }

    return supabaseResponse
}
