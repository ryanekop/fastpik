
import { LoginForm } from "@/components/admin/login-form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
    createSignedAuthHandoffState,
    sanitizeAuthHandoffReturnPath,
    shouldUseMainFastpikAuthOrigin,
    verifySignedAuthHandoffState,
} from "@/lib/auth-handoff"
import { normalizeAuthLocale } from "@/lib/auth-redirect"
import { resolveTenant } from "@/lib/tenant-resolver"
import { CheckCircle2 } from "lucide-react"
import { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
    title: "Login"
}

type Props = {
    params: Promise<{ locale: string }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

function getFirstHeaderValue(value: string | null) {
    return value?.split(',')[0]?.trim() || ''
}

function getRequestOrigin(headersList: Headers) {
    const forwardedHost = getFirstHeaderValue(headersList.get('x-forwarded-host'))
    const host = forwardedHost || getFirstHeaderValue(headersList.get('host'))
    const forwardedProto = getFirstHeaderValue(headersList.get('x-forwarded-proto'))
    const proto = forwardedProto === 'http' || forwardedProto === 'https' ? forwardedProto : 'https'
    const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')

    return host ? `${proto}://${host}` : configuredOrigin || ''
}

function getMainFastpikOrigin() {
    return process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '') || ''
}

export default async function LoginPage({ params, searchParams }: Props) {
    const { locale: rawLocale } = await params
    const locale = normalizeAuthLocale(rawLocale)
    const query = await searchParams
    const headersList = await headers()
    const host = getFirstHeaderValue(headersList.get('x-forwarded-host')) || getFirstHeaderValue(headersList.get('host'))
    const requestOrigin = getRequestOrigin(headersList)
    const mainOrigin = getMainFastpikOrigin()
    const rawNextPath = typeof query.next === 'string' ? query.next : null
    const nextPath = sanitizeAuthHandoffReturnPath(rawNextPath, locale)
    const paymentSuccess = query.payment_success === 'true'

    if (mainOrigin && shouldUseMainFastpikAuthOrigin(host)) {
        const tenant = await resolveTenant(host, { bypassCache: true })

        if (tenant.id !== 'default') {
            const targetUrl = new URL(`/${locale}/dashboard/login`, mainOrigin)
            const handoff = createSignedAuthHandoffState({
                origin: requestOrigin,
                returnPath: nextPath,
                locale,
            })

            if (handoff) {
                targetUrl.searchParams.set('handoff', handoff)
            }
            if (paymentSuccess) {
                targetUrl.searchParams.set('payment_success', 'true')
            }

            redirect(targetUrl.toString())
        }
    }

    let handoffTarget: { origin: string; returnPath: string } | null = null
    let handoffError = false
    const handoff = typeof query.handoff === 'string' ? query.handoff : null
    if (handoff) {
        const verification = await verifySignedAuthHandoffState(handoff)
        if (verification.valid) {
            handoffTarget = {
                origin: verification.payload.origin,
                returnPath: verification.payload.returnPath,
            }
        } else {
            handoffError = true
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <div className="w-full max-w-sm space-y-4">
                {paymentSuccess && (
                    <Alert className="border-green-500 bg-green-50 dark:bg-green-900/10">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <AlertTitle className="text-green-600 dark:text-green-400">Pembayaran Berhasil!</AlertTitle>
                        <AlertDescription className="text-green-600/90 dark:text-green-400/90">
                            Silakan cek email Anda untuk mendapatkan link password akun Pro Anda.
                        </AlertDescription>
                    </Alert>
                )}
                <LoginForm
                    nextPath={nextPath}
                    handoffTarget={handoffTarget}
                    handoffError={handoffError}
                />
            </div>
        </div>
    )
}
