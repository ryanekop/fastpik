"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useTranslations, useLocale } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Loader2, Eye, EyeOff, UserPlus, Lock, Send } from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile"

type LoginFormProps = {
    nextPath?: string | null
    handoffTarget?: {
        origin: string
        returnPath: string
    } | null
    handoffError?: boolean
}

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

function buildHandoffCallbackUrl(args: {
    origin: string
    locale: string
    returnPath: string
    accessToken: string
    refreshToken: string
    rememberMe: boolean
}) {
    const callbackUrl = new URL(`/${args.locale}/auth/callback`, args.origin)
    callbackUrl.searchParams.set('type', 'login')
    callbackUrl.searchParams.set('next', args.returnPath)

    const hashParams = new URLSearchParams()
    hashParams.set('access_token', args.accessToken)
    hashParams.set('refresh_token', args.refreshToken)
    hashParams.set('type', 'login')
    hashParams.set('remember_me', args.rememberMe ? 'true' : 'false')
    callbackUrl.hash = hashParams.toString()

    return callbackUrl.toString()
}

export function LoginForm({ nextPath = null, handoffTarget = null, handoffError = false }: LoginFormProps) {
    const t = useTranslations('Admin')
    const locale = useLocale()
    const router = useRouter()
    const supabase = createClient()
    const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || ""
    const isTurnstileConfigured = Boolean(turnstileSiteKey)

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [autoHandoffChecking, setAutoHandoffChecking] = useState(Boolean(handoffTarget && !handoffError))
    const [resending, setResending] = useState(false)
    const [error, setError] = useState<string | null>(handoffError ? t('authHandoffExpired') : null)
    const [feedbackTone, setFeedbackTone] = useState<"error" | "success">("error")
    const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null)
    const turnstileRef = useRef<TurnstileInstance>(null)

    const resetTurnstile = () => {
        turnstileRef.current?.reset()
        setTurnstileToken(null)
    }

    useEffect(() => {
        if (!handoffTarget || handoffError) {
            setAutoHandoffChecking(false)
            return
        }

        let cancelled = false

        const attemptExistingSessionHandoff = async () => {
            setAutoHandoffChecking(true)

            const {
                data: { session },
                error: sessionError,
            } = await supabase.auth.getSession()

            if (cancelled) return

            if (sessionError || !session?.access_token || !session.refresh_token) {
                setAutoHandoffChecking(false)
                return
            }

            const sessionOnlyUser = localStorage.getItem('fastpik_session_only_user')
            const sessionOnlyFlag = sessionStorage.getItem('fastpik_session_only')
            const loginTime = parseInt(localStorage.getItem('fastpik_session_login_time') || '0', 10)
            const twoHours = 2 * 60 * 60 * 1000

            if (sessionOnlyUser === session.user.id) {
                const expired = loginTime > 0 && Date.now() - loginTime > twoHours

                if (sessionOnlyFlag !== 'true' || expired) {
                    localStorage.removeItem('fastpik_session_only_user')
                    localStorage.removeItem('fastpik_session_login_time')
                    sessionStorage.removeItem('fastpik_session_only')
                    await supabase.auth.signOut()

                    if (!cancelled) {
                        setAutoHandoffChecking(false)
                    }
                    return
                }
            }

            const rememberExistingSession = sessionOnlyFlag !== 'true'

            window.location.replace(buildHandoffCallbackUrl({
                origin: handoffTarget.origin,
                locale,
                returnPath: handoffTarget.returnPath,
                accessToken: session.access_token,
                refreshToken: session.refresh_token,
                rememberMe: rememberExistingSession,
            }))
        }

        attemptExistingSessionHandoff()

        return () => {
            cancelled = true
        }
    }, [handoffError, handoffTarget, locale, supabase.auth])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setFeedbackTone("error")
        setUnconfirmedEmail(null)

        if (!isTurnstileConfigured) {
            setError(t('captchaConfigMissing'))
            setLoading(false)
            return
        }

        if (!turnstileToken) {
            setError(t('captchaRequired'))
            setLoading(false)
            return
        }

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
                options: {
                    captchaToken: turnstileToken,
                },
            })

            if (error) {
                resetTurnstile()

                if (error.message.toLowerCase().includes('email not confirmed')) {
                    setError(t('emailNotConfirmedResend'))
                    setUnconfirmedEmail(email.trim())
                } else if (error.message.toLowerCase().includes('invalid login credentials')) {
                    setError(t('invalidCredentials'))
                } else {
                    setError(error.message)
                }
                setLoading(false)
                return
            }

            // Remember Me: if NOT checked, mark session as temporary (2 hours)
            applyRememberMeSelection(rememberMe)

            const accessToken = data.session?.access_token || ""
            const refreshToken = data.session?.refresh_token || ""
            if (handoffTarget && accessToken && refreshToken) {
                window.location.href = buildHandoffCallbackUrl({
                    origin: handoffTarget.origin,
                    locale,
                    returnPath: handoffTarget.returnPath,
                    accessToken,
                    refreshToken,
                    rememberMe,
                })
                return
            }

            router.refresh()
            router.push(resolveSafeNextPath(locale, nextPath))

        } catch {
            resetTurnstile()
            setError(t('genericError'))
            setLoading(false)
        }
    }

    const handleResendVerification = async () => {
        const targetEmail = unconfirmedEmail || email.trim()
        if (!targetEmail) return

        setResending(true)
        setError(null)
        setFeedbackTone("error")

        try {
            const res = await fetch('/api/auth/resend-confirmation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-client-locale': locale,
                },
                body: JSON.stringify({ email: targetEmail, captchaToken: turnstileToken, locale }),
            })
            const data = await res.json()

            if (!res.ok) {
                setError(data.error || t('resendVerificationFailed'))
                resetTurnstile()
                return
            }

            setError(t('resendVerificationSent'))
            setFeedbackTone("success")
            setUnconfirmedEmail(null)
        } catch {
            setError(t('resendVerificationFailed'))
            resetTurnstile()
        } finally {
            setResending(false)
        }
    }

    if (autoHandoffChecking) {
        return (
            <Card className="w-full max-w-sm mx-auto shadow-lg">
                <CardContent className="flex flex-col items-center justify-center gap-4 py-10 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">{t('authenticating')}</p>
                </CardContent>
            </Card>
        )
    }



    return (
        <Card className="w-full max-w-sm mx-auto shadow-lg">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
                    <Lock className="h-6 w-6" />
                    {t('loginTitle')}
                </CardTitle>
                <CardDescription className="text-center">
                    {t('loginDescription')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">{t('emailLabel')}</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="admin@example.com"
                            required
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value)
                                setUnconfirmedEmail(null)
                            }}
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password">{t('passwordLabel')}</Label>
                            <Link href={`/${locale}/dashboard/forgot-password`} className="text-xs text-primary hover:underline cursor-pointer">
                                {t('forgotPassword')}
                            </Link>
                        </div>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="remember"
                            checked={rememberMe}
                            onCheckedChange={(c) => setRememberMe(c as boolean)}
                            className="cursor-pointer"
                        />
                        <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                            {t('rememberMe')}
                        </Label>
                    </div>

                    {error && (
                        <div className={`space-y-3 rounded-md p-3 text-sm ${feedbackTone === "success" ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/15 text-destructive"}`}>
                            <p>{error}</p>
                            {unconfirmedEmail && (
                                <div className="space-y-3 text-foreground">
                                    <p className="text-xs text-muted-foreground">
                                        {t('resendVerificationHint')}
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full gap-2 bg-background"
                                        disabled={resending || !turnstileToken}
                                        onClick={handleResendVerification}
                                    >
                                        {resending ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                {t('sendingLink')}
                                            </>
                                        ) : (
                                            <>
                                                <Send className="h-4 w-4" />
                                                {t('resendVerification')}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="w-full">
                        {isTurnstileConfigured ? (
                            <Turnstile
                                ref={turnstileRef}
                                className="w-full"
                                siteKey={turnstileSiteKey}
                                onSuccess={(token) => setTurnstileToken(token)}
                                onError={() => setTurnstileToken(null)}
                                onExpire={() => setTurnstileToken(null)}
                                options={{
                                    theme: 'auto',
                                    size: 'flexible',
                                }}
                            />
                        ) : (
                            <div className="w-full rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                                {t('captchaConfigMissing')}
                            </div>
                        )}
                    </div>

                    <Button type="submit" className="w-full cursor-pointer hover:opacity-90 transition-opacity" disabled={loading || !turnstileToken || !isTurnstileConfigured}>
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('signingIn')}
                            </>
                        ) : (
                            <>{t('signIn')}</>
                        )}
                    </Button>
                </form>

                {/* No Account Section */}
                <div className="mt-6 pt-6 border-t text-center space-y-3">
                    <p className="text-sm text-muted-foreground">{t('noAccount')}</p>
                    <Button variant="outline" className="w-full gap-2" asChild>
                        <Link href={`/${locale}/dashboard/register`}>
                            <UserPlus className="h-4 w-4" />
                            {t('registerNow')}
                        </Link>
                    </Button>
                </div>
            </CardContent>
            <CardFooter className="flex justify-center gap-2 pt-0">
                <LanguageToggle />
                <ThemeToggle />
            </CardFooter>
        </Card>
    )
}
