function normalizeConfiguredOrigin(value: string | undefined) {
    const raw = (value || '').trim()
    if (!raw) return ''

    try {
        const normalized = raw.startsWith('http://') || raw.startsWith('https://')
            ? raw
            : `https://${raw}`
        return new URL(normalized).origin
    } catch {
        return ''
    }
}

export function getCanonicalSiteOrigin() {
    const configuredOrigin = normalizeConfiguredOrigin(process.env.NEXT_PUBLIC_SITE_URL)
    if (configuredOrigin) return configuredOrigin

    if (typeof window !== 'undefined') {
        return window.location.origin
    }

    return ''
}

export function buildRecoveryRedirectUrl(locale: string) {
    const origin = getCanonicalSiteOrigin()
    if (!origin) return ''

    const callbackUrl = new URL(`/${locale}/auth/callback`, `${origin}/`)
    callbackUrl.searchParams.set('type', 'recovery')
    return callbackUrl.toString()
}
