"use client"

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLocale, useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'

type ErrorAction = 'forgot-password' | 'register' | null

function resolveSafeNextPath(locale: string, nextPath?: string | null) {
    const fallback = `/${locale}/dashboard`
    const raw = (nextPath || "").trim()
    if (!raw) return fallback
    if (!raw.startsWith("/") || raw.startsWith("//")) return fallback
    if (!raw.startsWith(`/${locale}/dashboard`)) return fallback
    return raw
}

function applyRememberMeSelection(rememberMe: boolean) {
    if (rememberMe) {
        sessionStorage.removeItem('fastpik_session_only')
        localStorage.removeItem('fastpik_session_only_user')
        localStorage.removeItem('fastpik_session_login_time')
        return
    }

    sessionStorage.setItem('fastpik_session_only', 'true')
    localStorage.setItem('fastpik_session_login_time', Date.now().toString())
}

export default function AuthCallbackPage() {
    const locale = useLocale()
    const t = useTranslations('Admin')
    const supabase = createClient()
    const searchParams = useSearchParams()
    const [error, setError] = useState<string | null>(null)
    const [errorAction, setErrorAction] = useState<ErrorAction>(null)
    const [debugInfo, setDebugInfo] = useState<string>('')

    const getErrorAction = useCallback((message: string, authType: string): ErrorAction => {
        const normalizedMessage = message.toLowerCase()
        if (authType === 'signup') {
            return 'register'
        }
        if (
            authType === 'recovery' ||
            authType === 'invite' ||
            normalizedMessage.includes('expired') ||
            normalizedMessage.includes('invalid token') ||
            normalizedMessage.includes('token')
        ) {
            return 'forgot-password'
        }

        return null
    }, [])

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                // Check for PKCE code in URL query params (newer Supabase flow)
                const code = searchParams.get('code')
                const type = searchParams.get('type') || ''
                const nextPath = resolveSafeNextPath(locale, searchParams.get('next'))

                // Also check hash for legacy/implicit flow
                const hashParams = new URLSearchParams(
                    window.location.hash.substring(1)
                )
                const accessToken = hashParams.get('access_token')
                const refreshToken = hashParams.get('refresh_token')
                const hashType = hashParams.get('type')
                const hashError = hashParams.get('error')
                const errorDescription = hashParams.get('error_description')
                const rememberMe = hashParams.get('remember_me')

                // Combine type from query or hash
                const authType = type || hashType || ''

                setDebugInfo(`Code: ${code ? 'yes' : 'no'}, Hash tokens: ${accessToken ? 'yes' : 'no'}, Type: ${authType}`)

                // Check for error in hash
                if (hashError) {
                    const message = errorDescription || hashError
                    setError(message)
                    setErrorAction(getErrorAction(message, authType))
                    return
                }

                const postTrialCreation = async () => {
                    const { data: { user } } = await supabase.auth.getUser()
                    if (!user) return

                    await fetch('/api/auth/callback', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: user.id,
                            email: user.email,
                            fullName: user.user_metadata?.full_name || '',
                        }),
                    })
                }

                // Handle PKCE flow (code in query params)
                if (code) {
                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

                    if (exchangeError) {
                        setError(exchangeError.message)
                        setErrorAction(getErrorAction(exchangeError.message, authType))
                        return
                    }

                    // Successfully exchanged code for session
                    // For new signups, create trial subscription via API
                    if (authType === 'signup') {
                        try {
                            await postTrialCreation()
                        } catch (_) { /* non-critical, trial will be checked on next login */ }
                        window.location.href = `/${locale}/dashboard`
                    } else if (authType === 'recovery' || authType === 'invite') {
                        window.location.href = `/${locale}/dashboard/reset-password`
                    } else if (authType === 'login') {
                        window.location.replace(nextPath)
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
                        setErrorAction(getErrorAction(sessionError.message, authType))
                        return
                    }
                    if (authType === 'login') {
                        applyRememberMeSelection(rememberMe !== 'false')
                    }

                    // For new signups, create trial subscription
                    if (authType === 'signup') {
                        try {
                            await postTrialCreation()
                        } catch (_) { /* non-critical */ }
                        window.location.href = `/${locale}/dashboard`
                    } else if (authType === 'invite' || authType === 'recovery') {
                        window.location.href = `/${locale}/dashboard/reset-password`
                    } else if (authType === 'login') {
                        window.location.replace(nextPath)
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
                    } else if (authType === 'login') {
                        window.location.replace(nextPath)
                    } else {
                        window.location.href = `/${locale}/dashboard`
                    }
                } else {
                    const message = t('authTokenNotFound')
                    setError(message)
                    setErrorAction(getErrorAction(message, authType))
                }
            } catch (err) {
                setError(t('authFailed'))
            }
        }

        handleAuthCallback()
    }, [getErrorAction, locale, searchParams, supabase.auth, t])

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
                <div className="w-full max-w-sm space-y-4 text-center">
                    <div className="p-4 bg-destructive/15 text-destructive rounded-md">
                        <p className="font-medium">{t('authError')}</p>
                        <p className="text-sm mt-1">{error}</p>
                        {debugInfo && <p className="text-xs mt-2 opacity-60">{debugInfo}</p>}
                    </div>
                    <button
                        onClick={() => window.location.href = `/${locale}/dashboard/login`}
                        className="text-primary hover:underline text-sm"
                    >
                        {t('backToLogin')}
                    </button>
                    {errorAction === 'forgot-password' && (
                        <button
                            onClick={() => window.location.href = `/${locale}/dashboard/forgot-password`}
                            className="block w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                        >
                            {t('requestNewResetLink')}
                        </button>
                    )}
                    {errorAction === 'register' && (
                        <button
                            onClick={() => window.location.href = `/${locale}/dashboard/register`}
                            className="block w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                        >
                            {t('requestNewVerificationLink')}
                        </button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40">
            <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground">{t('authenticating')}</p>
            </div>
        </div>
    )
}
