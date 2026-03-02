"use client"

import { useState, useRef } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Loader2, Eye, EyeOff, UserPlus, Mail, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile"
import { isDisposableEmail } from "@/lib/disposable-emails"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Use implicit flow for registration so the confirmation link uses token hash
// (works on any device, not tied to the original browser/device's PKCE verifier)
function createImplicitClient() {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { flowType: 'implicit' } }
    )
}

export function RegisterForm() {
    const t = useTranslations('Admin')
    const locale = useLocale()

    const [fullName, setFullName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
    const turnstileRef = useRef<TurnstileInstance>(null)

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        // Client-side validation
        if (!fullName.trim()) {
            setError(t('fullNameRequired'))
            setLoading(false)
            return
        }

        if (password !== confirmPassword) {
            setError(t('passwordMismatch'))
            setLoading(false)
            return
        }

        if (password.length < 6) {
            setError(t('passwordMinLength'))
            setLoading(false)
            return
        }

        if (isDisposableEmail(email)) {
            setError(t('disposableEmailError'))
            setLoading(false)
            return
        }

        if (!turnstileToken) {
            setError(t('captchaRequired'))
            setLoading(false)
            return
        }

        try {
            // Step 1: Server validates Turnstile + disposable email
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, turnstileToken }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Terjadi kesalahan')
                turnstileRef.current?.reset()
                setTurnstileToken(null)
                setLoading(false)
                return
            }

            // Step 2: Call signUp client-side with implicit flow so confirmation email
            // uses token hash (works on any device, no PKCE verifier needed)
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
            const supabase = createImplicitClient()
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    // Point to client-side callback so PKCE exchange works on any device
                    emailRedirectTo: `${siteUrl}/${locale}/auth/callback?type=signup`,
                    data: {
                        full_name: fullName.trim(),
                    },
                },
            })

            if (signUpError) {
                if (signUpError.message.includes('already registered') || signUpError.message.includes('User already registered')) {
                    setError('Email ini sudah terdaftar. Silakan login.')
                } else {
                    setError(signUpError.message)
                }
                turnstileRef.current?.reset()
                setTurnstileToken(null)
                setLoading(false)
                return
            }

            setSuccess(true)
        } catch (err) {
            setError("An unexpected error occurred")
        } finally {
            setLoading(false)
        }
    }


    // Success screen — check your email
    if (success) {
        return (
            <Card className="w-full max-w-sm mx-auto shadow-lg">
                <CardContent className="pt-8 pb-8 text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mail className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold">{t('checkEmail')}</h2>
                    <p className="text-muted-foreground text-sm">
                        {t('checkEmailDesc')}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono bg-muted rounded-md px-3 py-2">
                        {email}
                    </p>
                    <Button variant="outline" className="w-full mt-4" asChild>
                        <Link href={`/${locale}/dashboard/login`}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {t('backToLogin')}
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-full max-w-sm mx-auto shadow-lg">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
                    <UserPlus className="h-6 w-6" />
                    {t('registerTitle')}
                </CardTitle>
                <CardDescription className="text-center">
                    {t('registerDescription')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="fullName">{t('fullName')}</Label>
                        <Input
                            id="fullName"
                            type="text"
                            placeholder={t('fullNamePlaceholder')}
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">{t('emailLabel')}</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">{t('passwordLabel')}</Label>
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
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
                        <div className="relative">
                            <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Cloudflare Turnstile */}
                    <div className="flex justify-center">
                        <Turnstile
                            ref={turnstileRef}
                            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                            onSuccess={(token) => setTurnstileToken(token)}
                            onError={() => setTurnstileToken(null)}
                            onExpire={() => setTurnstileToken(null)}
                            options={{
                                theme: 'auto',
                                size: 'normal',
                            }}
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-destructive/15 text-destructive text-sm rounded-md">
                            {error}
                        </div>
                    )}

                    <Button type="submit" className="w-full cursor-pointer hover:opacity-90 transition-opacity" disabled={loading || !turnstileToken}>
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('signingUp')}
                            </>
                        ) : (
                            <>{t('signUp')}</>
                        )}
                    </Button>
                </form>

                {/* Already have account */}
                <div className="mt-6 pt-6 border-t text-center space-y-3">
                    <p className="text-sm text-muted-foreground">{t('hasAccount')}</p>
                    <Button variant="outline" className="w-full gap-2" asChild>
                        <Link href={`/${locale}/dashboard/login`}>
                            {t('signIn')}
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
