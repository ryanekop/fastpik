"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"

export default function ResetPasswordPage() {
    const router = useRouter()
    const supabase = createClient()
    const locale = useLocale()
    const t = useTranslations('ResetPassword')

    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [initializing, setInitializing] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [sessionReady, setSessionReady] = useState(false)

    useEffect(() => {
        const initSession = async () => {
            try {
                // Check for tokens in URL hash (from email link)
                const hashParams = new URLSearchParams(window.location.hash.substring(1))
                const accessToken = hashParams.get('access_token')
                const refreshToken = hashParams.get('refresh_token')
                const type = hashParams.get('type')

                if (accessToken && refreshToken) {
                    // Set session from URL tokens
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    })

                    if (sessionError) {
                        setError(`Session error: ${sessionError.message}`)
                        setInitializing(false)
                        return
                    }

                    // Clear hash from URL for cleaner look
                    window.history.replaceState(null, '', window.location.pathname)
                    setSessionReady(true)
                } else {
                    // No tokens in hash, check if already authenticated
                    const { data: { user } } = await supabase.auth.getUser()
                    if (user) {
                        setSessionReady(true)
                    } else {
                        setError("Auth session missing!")
                    }
                }
            } catch (err) {
                setError("Failed to initialize session")
            } finally {
                setInitializing(false)
            }
        }

        initSession()
    }, [supabase.auth])

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            setError(t('passwordMismatch'))
            return
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters")
            return
        }

        setLoading(true)
        setError(null)

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            })

            if (error) {
                setError(error.message)
                setLoading(false)
            } else {
                // Success - redirect to dashboard
                router.push(`/${locale}/dashboard`)
            }
        } catch (err) {
            setError(t('unexpectedError'))
            setLoading(false)
        }
    }

    if (initializing) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-muted/40">
                <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-sm shadow-lg">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">🔐 {t('title')}</CardTitle>
                    <CardDescription className="text-center">
                        {t('description')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">🔑 {t('newPassword')}</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={!sessionReady}
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
                            <Label htmlFor="confirmPassword">🔑 {t('confirmPassword')}</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={!sessionReady}
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

                        {error && (
                            <div className="p-3 bg-destructive/15 text-destructive text-sm rounded-md">
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="w-full cursor-pointer" disabled={loading || !sessionReady}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('updating')}
                                </>
                            ) : (
                                <>✅ {t('updateButton')}</>
                            )}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center gap-2 pt-0">
                    <LanguageToggle />
                    <ThemeToggle />
                </CardFooter>
            </Card>
        </div>
    )
}

