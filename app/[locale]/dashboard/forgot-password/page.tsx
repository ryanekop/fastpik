"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Loader2, ArrowLeft, Mail } from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"

export default function ForgotPasswordPage() {
    const supabase = createClient()
    const locale = useLocale()
    const t = useTranslations('Admin')

    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/api/auth/callback?type=recovery&locale=${locale}`,
            })

            if (error) {
                setError(error.message)
            } else {
                setSuccess(true)
            }
        } catch (err) {
            setError("An unexpected error occurred")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-sm shadow-lg">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">🔑 {t('resetPasswordTitle')}</CardTitle>
                    <CardDescription className="text-center">
                        {t('resetPasswordDesc')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {success ? (
                        <div className="text-center space-y-4">
                            <div className="flex justify-center">
                                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                    <Mail className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {t('checkEmailForLink')}
                            </p>
                            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 p-2 rounded-md">
                                {t('resetLinkNote')}
                            </p>
                            <Button variant="outline" className="w-full cursor-pointer" asChild>
                                <Link href={`/${locale}/dashboard/login`}>⬅️ {t('backToLogin')}</Link>
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleReset} className="space-y-4">
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

                            {error && (
                                <div className="p-3 bg-destructive/15 text-destructive text-sm rounded-md">
                                    {error}
                                </div>
                            )}

                            <Button type="submit" className="w-full cursor-pointer" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t('sendingLink')}
                                    </>
                                ) : (
                                    <>📨 {t('sendResetLink')}</>
                                )}
                            </Button>

                            <div className="text-center">
                                <Link href={`/${locale}/dashboard/login`} className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-2 cursor-pointer">
                                    <ArrowLeft className="w-3 h-3" /> {t('backToLogin')}
                                </Link>
                            </div>
                        </form>
                    )}
                </CardContent>
                <CardFooter className="flex justify-center gap-2 pt-0">
                    <LanguageToggle />
                    <ThemeToggle />
                </CardFooter>
            </Card>
        </div>
    )
}
