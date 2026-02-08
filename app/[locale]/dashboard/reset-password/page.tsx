"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"

export default function ResetPasswordPage() {
    const router = useRouter()
    const supabase = createClient()
    const locale = useLocale()
    const t = useTranslations('ResetPassword')

    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            setError(t('passwordMismatch'))
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
                            <Input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">🔑 {t('confirmPassword')}</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
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
