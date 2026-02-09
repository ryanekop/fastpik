"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useTranslations, useLocale } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Loader2, Eye, EyeOff, Instagram } from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"

export function LoginForm() {
    const t = useTranslations('Admin')
    const locale = useLocale()
    const router = useRouter()
    const supabase = createClient()

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                setError(error.message)
                setLoading(false)
                return
            }

            // Check device limit
            await checkDeviceLimit()

            router.refresh()
            // Use locale-aware redirect
            router.push(`/${locale}/dashboard`)

        } catch (err) {
            setError("An unexpected error occurred")
            setLoading(false)
        }
    }

    const checkDeviceLimit = async () => {
        try {
            await fetch('/api/auth/check-device-limit', { method: 'POST' })
        } catch (e) {
            console.error("Failed to check device limit", e)
        }
    }

    return (
        <Card className="w-full max-w-sm mx-auto shadow-lg">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center">🔐 {t('loginTitle')}</CardTitle>
                <CardDescription className="text-center">
                    {t('loginDescription')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">📧 {t('emailLabel')}</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="admin@example.com"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password">🔑 {t('passwordLabel')}</Label>
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
                        <div className="p-3 bg-destructive/15 text-destructive text-sm rounded-md">
                            {error}
                        </div>
                    )}

                    <Button type="submit" className="w-full cursor-pointer hover:opacity-90 transition-opacity" disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('signingIn')}
                            </>
                        ) : (
                            <>🚀 {t('signIn')}</>
                        )}
                    </Button>
                </form>

                {/* No Account Section */}
                <div className="mt-6 pt-6 border-t text-center space-y-3">
                    <p className="text-sm text-muted-foreground">{t('noAccount')}</p>
                    <Button variant="outline" className="w-full gap-2" asChild>
                        <a href="https://instagram.com/ryaneko.apps/" target="_blank" rel="noopener noreferrer">
                            <Instagram className="h-4 w-4" />
                            {t('contactAdmin')}
                        </a>
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
