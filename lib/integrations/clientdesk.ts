import { createHash, randomBytes, timingSafeEqual } from 'crypto'

export type ClientDeskSyncStatus = 'idle' | 'success' | 'warning' | 'failed' | 'syncing'

export function parseClientDeskApiKey(value: string | null | undefined) {
    const raw = (value || '').trim()
    if (!raw) return null
    const separator = raw.indexOf('.')
    if (separator <= 0 || separator >= raw.length - 1) return null
    const keyId = raw.slice(0, separator).trim()
    const secret = raw.slice(separator + 1).trim()
    if (!keyId || !secret) return null
    return { keyId, secret, raw: `${keyId}.${secret}` }
}

export function hashClientDeskApiKey(rawKey: string) {
    return createHash('sha256').update(rawKey).digest('hex')
}

export function verifyClientDeskApiKey(rawKey: string, expectedHash: string | null | undefined) {
    const expected = Buffer.from((expectedHash || '').trim(), 'utf8')
    if (expected.length === 0) return false
    const actual = Buffer.from(hashClientDeskApiKey(rawKey), 'utf8')
    if (actual.length !== expected.length) return false
    return timingSafeEqual(actual, expected)
}

export function generateClientDeskApiKey() {
    const keyId = `cdk_${randomBytes(6).toString('hex')}`
    const secret = randomBytes(24).toString('hex')
    const apiKey = `${keyId}.${secret}`
    return {
        keyId,
        apiKey,
        apiKeyHash: hashClientDeskApiKey(apiKey),
    }
}

