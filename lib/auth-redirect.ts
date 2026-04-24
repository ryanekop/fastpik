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

export type AuthLocale = 'id' | 'en'

function getFirstHeaderValue(value: string | null): string | null {
    if (!value) return null
    const first = value.split(',')[0]?.trim()
    return first || null
}

function normalizeProto(value: string | null): 'http' | 'https' | null {
    const raw = getFirstHeaderValue(value)?.toLowerCase()
    if (raw === 'http' || raw === 'https') return raw
    return null
}

function normalizeLocaleCandidate(value: string | null | undefined): AuthLocale | null {
    const normalized = (value || '').trim().toLowerCase().split('-')[0]
    if (normalized === 'en' || normalized === 'id') return normalized
    return null
}

function getCookieValue(cookieHeader: string | null, name: string) {
    if (!cookieHeader) return null
    const item = cookieHeader
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${name}=`))

    if (!item) return null
    return decodeURIComponent(item.slice(name.length + 1))
}

function toOrigin(candidate: string | null | undefined): string | null {
    if (!candidate) return null
    try {
        const normalized = candidate.startsWith('http://') || candidate.startsWith('https://')
            ? candidate
            : `https://${candidate}`
        return new URL(normalized).origin
    } catch {
        return null
    }
}

export function normalizeAuthLocale(value: string | null | undefined): AuthLocale {
    return normalizeLocaleCandidate(value) || 'id'
}

export function resolveAuthRequestLocale(request: Request): AuthLocale {
    const url = new URL(request.url)
    const fromHeader = normalizeLocaleCandidate(
        request.headers.get('x-client-locale') || request.headers.get('x-locale')
    )
    if (fromHeader) return fromHeader

    const fromQuery = normalizeLocaleCandidate(url.searchParams.get('locale'))
    if (fromQuery) return fromQuery

    const cookieHeader = request.headers.get('cookie')
    const fromCookie = normalizeLocaleCandidate(
        getCookieValue(cookieHeader, 'NEXT_LOCALE') ||
        getCookieValue(cookieHeader, '__Host-NEXT_LOCALE') ||
        getCookieValue(cookieHeader, 'locale')
    )
    if (fromCookie) return fromCookie

    const referer = request.headers.get('referer')
    if (referer) {
        try {
            const firstSegment = new URL(referer).pathname.split('/').filter(Boolean)[0]
            const fromReferer = normalizeLocaleCandidate(firstSegment)
            if (fromReferer) return fromReferer
        } catch {
            // Ignore invalid referers.
        }
    }

    const fromAcceptLanguage = normalizeLocaleCandidate(
        request.headers.get('accept-language')?.split(',')[0]
    )
    if (fromAcceptLanguage) return fromAcceptLanguage

    return 'id'
}

export function resolvePublicOrigin(request: Request) {
    const requestUrl = new URL(request.url)
    const forwardedHost = getFirstHeaderValue(request.headers.get('x-forwarded-host'))
    const forwardedProto = normalizeProto(request.headers.get('x-forwarded-proto'))
    const hostHeader = getFirstHeaderValue(request.headers.get('host'))
    const configuredOrigin = normalizeConfiguredOrigin(process.env.NEXT_PUBLIC_SITE_URL)

    const fallbackProtocol =
        requestUrl.protocol === 'https:' || requestUrl.protocol === 'http:'
            ? requestUrl.protocol.slice(0, -1)
            : 'https'

    return (
        toOrigin(forwardedHost ? `${forwardedProto || 'https'}://${forwardedHost}` : null) ||
        toOrigin(hostHeader ? `${forwardedProto || fallbackProtocol}://${hostHeader}` : null) ||
        toOrigin(requestUrl.origin) ||
        configuredOrigin ||
        requestUrl.origin
    )
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
