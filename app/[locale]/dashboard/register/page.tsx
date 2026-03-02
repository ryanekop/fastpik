
import { RegisterForm } from "@/components/admin/register-form"
import { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
    title: "Register"
}

export default async function RegisterPage({
    params
}: {
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params
    const headersList = await headers()
    const host = headersList.get('host') || ''

    // Redirect to main domain if accessed from a custom tenant domain
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
    const mainHost = new URL(siteUrl).hostname

    if (host && mainHost && !host.includes(mainHost) && !host.includes('localhost')) {
        redirect(`${siteUrl}/${locale}/dashboard/register`)
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <div className="w-full max-w-sm">
                <RegisterForm />
            </div>
        </div>
    )
}
