
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest, response: NextResponse) {
    // Use the provided response (from next-intl) or create a new one
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
                    cookiesToSet.forEach(({ name, value, options }) =>
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

    const pathname = request.nextUrl.pathname

    // Protected Routes Logic - now uses /dashboard instead of /admin
    const isDashboardRoute = pathname.includes('/dashboard')

    // Public dashboard routes (no auth required)
    const isPublicDashboardRoute =
        pathname.includes('/dashboard/login') ||
        pathname.includes('/dashboard/forgot-password') ||
        pathname.includes('/dashboard/reset-password')

    if (isDashboardRoute && !isPublicDashboardRoute && !user) {
        // Redirect unauthenticated user to login
        const segments = pathname.split('/')
        const locale = segments[1] // e.g. 'en' or 'id'
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = `/${locale}/dashboard/login`
        return NextResponse.redirect(loginUrl)
    }

    // ENFORCE DEVICE LIMIT: Check if session is valid in our tracking table
    if (user && isDashboardRoute && !isPublicDashboardRoute) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
            const { data: validSession } = await supabase
                .from('user_sessions')
                .select('id')
                .eq('session_token', session.access_token)
                .single()

            if (!validSession) {
                // Session is not in our tracking table (means it was removed by a newer login)
                // Force sign out
                await supabase.auth.signOut()

                const segments = pathname.split('/')
                const locale = segments[1]
                const loginUrl = request.nextUrl.clone()
                loginUrl.pathname = `/${locale}/dashboard/login`
                return NextResponse.redirect(loginUrl)
            }
        }
    }

    // If user is logged in and tries to access login page, redirect to dashboard
    if (user && isPublicDashboardRoute && !pathname.includes('/dashboard/reset-password')) {
        const segments = pathname.split('/')
        const locale = segments[1]
        const dashboardUrl = request.nextUrl.clone()
        dashboardUrl.pathname = `/${locale}/dashboard`
        return NextResponse.redirect(dashboardUrl)
    }

    return supabaseResponse
}
