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

    useEffect(() => {
        const handleAuthCallback = async () => {
            // Get the hash fragment from the URL
            const hashParams = new URLSearchParams(
                window.location.hash.substring(1) // Remove the '#' character
            )

            const accessToken = hashParams.get('access_token')
            const refreshToken = hashParams.get('refresh_token')
            const type = hashParams.get('type') // 'invite', 'recovery', 'magiclink', etc.

            // Also check for error in hash
            const hashError = hashParams.get('error')
            const errorDescription = hashParams.get('error_description')

            if (hashError) {
                setError(errorDescription || hashError)
                return
            }

            if (accessToken && refreshToken) {
                try {
                    // Set the session using the tokens from the URL
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    })

                    if (sessionError) {
                        setError(sessionError.message)
                        return
                    }

                    // Handle redirect based on the type of auth
                    // Use window.location for full page navigation to ensure cookies are set
                    if (type === 'invite' || type === 'recovery') {
                        // For invite or password recovery, redirect to reset password page
                        window.location.href = `/${locale}/dashboard/reset-password`
                    } else {
                        // For magic link or other types, redirect to dashboard
                        window.location.href = `/${locale}/dashboard`
                    }
                } catch (err) {
                    setError('Failed to authenticate. Please try again.')
                }
            } else {
                // No tokens in URL, check if already authenticated
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    router.push(`/${locale}/dashboard`)
                } else {
                    setError('No authentication tokens found.')
                }
            }
        }

        handleAuthCallback()
    }, [locale, router, supabase.auth])

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
                <div className="w-full max-w-sm space-y-4 text-center">
                    <div className="p-4 bg-destructive/15 text-destructive rounded-md">
                        <p className="font-medium">Authentication Error</p>
                        <p className="text-sm mt-1">{error}</p>
                    </div>
                    <button
                        onClick={() => router.push(`/${locale}/dashboard/login`)}
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
