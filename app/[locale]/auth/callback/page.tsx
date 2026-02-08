"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLocale } from 'next-intl'
import { Loader2 } from 'lucide-react'

export default function AuthCallbackPage() {
    const router = useRouter()
    const locale = useLocale()
    const supabase = createClient()
    const searchParams = useSearchParams()
    const [error, setError] = useState<string | null>(null)
    const [debugInfo, setDebugInfo] = useState<string>('')

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                // Check for PKCE code in URL query params (newer Supabase flow)
                const code = searchParams.get('code')
                const type = searchParams.get('type') || ''

                // Also check hash for legacy/implicit flow
                const hashParams = new URLSearchParams(
                    window.location.hash.substring(1)
                )
                const accessToken = hashParams.get('access_token')
                const refreshToken = hashParams.get('refresh_token')
                const hashType = hashParams.get('type')
                const hashError = hashParams.get('error')
                const errorDescription = hashParams.get('error_description')

                // Combine type from query or hash
                const authType = type || hashType || ''

                setDebugInfo(`Code: ${code ? 'yes' : 'no'}, Hash tokens: ${accessToken ? 'yes' : 'no'}, Type: ${authType}`)

                // Check for error in hash
                if (hashError) {
                    setError(errorDescription || hashError)
                    return
                }

                // Handle PKCE flow (code in query params)
                if (code) {
                    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

                    if (exchangeError) {
                        setError(exchangeError.message)
                        return
                    }

                    // Successfully exchanged code for session
                    // Redirect based on type
                    if (authType === 'recovery' || authType === 'invite') {
                        window.location.href = `/${locale}/dashboard/reset-password`
                    } else {
                        window.location.href = `/${locale}/dashboard`
                    }
                    return
                }

                // Handle implicit flow (tokens in hash)
                if (accessToken && refreshToken) {
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    })

                    if (sessionError) {
                        setError(sessionError.message)
                        return
                    }

                    if (authType === 'invite' || authType === 'recovery') {
                        window.location.href = `/${locale}/dashboard/reset-password`
                    } else {
                        window.location.href = `/${locale}/dashboard`
                    }
                    return
                }

                // No code or tokens, check if already authenticated
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    // If type suggests recovery, go to reset password
                    if (authType === 'recovery' || authType === 'invite') {
                        window.location.href = `/${locale}/dashboard/reset-password`
                    } else {
                        window.location.href = `/${locale}/dashboard`
                    }
                } else {
                    setError('No authentication tokens found. Please try the link again or request a new one.')
                }
            } catch (err) {
                setError('Failed to authenticate. Please try again.')
            }
        }

        handleAuthCallback()
    }, [locale, searchParams, supabase.auth])

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
                <div className="w-full max-w-sm space-y-4 text-center">
                    <div className="p-4 bg-destructive/15 text-destructive rounded-md">
                        <p className="font-medium">Authentication Error</p>
                        <p className="text-sm mt-1">{error}</p>
                        {debugInfo && <p className="text-xs mt-2 opacity-60">{debugInfo}</p>}
                    </div>
                    <button
                        onClick={() => window.location.href = `/${locale}/dashboard/login`}
                        className="text-primary hover:underline text-sm"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40">
            <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground">Authenticating...</p>
            </div>
        </div>
    )
}

