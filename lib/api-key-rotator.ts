/**
 * API Key Rotation for Google Drive API
 * 
 * Distributes requests across multiple API keys to increase quota.
 * Each project has 100 requests/100 seconds, so 3 keys = 300 requests/100 seconds.
 */

class ApiKeyRotator {
    private keys: string[] = []
    private currentIndex: number = 0
    private requestCounts: Map<string, number> = new Map()
    private lastReset: number = Date.now()

    constructor() {
        this.loadKeys()
    }

    private loadKeys(): void {
        // Load from environment variable (comma-separated)
        const keysEnv = process.env.GOOGLE_API_KEYS || ''

        if (keysEnv) {
            this.keys = keysEnv.split(',').map(k => k.trim()).filter(k => k.length > 0)
        }

        // Fallback to single key if no rotation keys
        if (this.keys.length === 0) {
            const singleKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY
            if (singleKey) {
                this.keys = [singleKey]
            }
        }

        // Initialize request counts
        this.keys.forEach(key => {
            this.requestCounts.set(key, 0)
        })

        console.log(`[API Key Rotator] Loaded ${this.keys.length} API key(s)`)
        if (this.keys.length > 0) {
            console.log(`[API Key Rotator] First key: ${this.keys[0].substring(0, 10)}...`)
        } else {
            console.warn(`[API Key Rotator] ⚠️ NO KEYS LOADED! Check .env.local`)
        }
    }

    /**
     * Get the next API key using round-robin rotation
     */
    getNextKey(): string | null {
        if (this.keys.length === 0) {
            return null
        }

        // Reset counts every 100 seconds
        const now = Date.now()
        if (now - this.lastReset > 100000) {
            this.requestCounts.forEach((_, key) => {
                this.requestCounts.set(key, 0)
            })
            this.lastReset = now
        }

        // Round-robin selection
        const key = this.keys[this.currentIndex]
        this.currentIndex = (this.currentIndex + 1) % this.keys.length

        // Track request count
        const count = this.requestCounts.get(key) || 0
        this.requestCounts.set(key, count + 1)

        return key
    }

    /**
     * Get a key that hasn't hit rate limit yet
     * Falls back to round-robin if all keys are exhausted
     */
    getLeastUsedKey(): string | null {
        if (this.keys.length === 0) {
            return null
        }

        // Reset counts every 100 seconds
        const now = Date.now()
        if (now - this.lastReset > 100000) {
            this.requestCounts.forEach((_, key) => {
                this.requestCounts.set(key, 0)
            })
            this.lastReset = now
        }

        // Find key with lowest count
        let minCount = Infinity
        let selectedKey = this.keys[0]

        for (const key of this.keys) {
            const count = this.requestCounts.get(key) || 0
            if (count < minCount) {
                minCount = count
                selectedKey = key
            }
        }

        // Track request count
        const count = this.requestCounts.get(selectedKey) || 0
        this.requestCounts.set(selectedKey, count + 1)

        return selectedKey
    }

    /**
     * Mark a key as rate limited (429 error)
     * This will temporarily skip this key
     */
    markRateLimited(key: string): void {
        // Set count to high number to avoid this key temporarily
        this.requestCounts.set(key, 1000)
    }

    /**
     * Get stats about key usage
     */
    getStats(): {
        totalKeys: number
        counts: Record<string, number>
    } {
        const counts: Record<string, number> = {}
        this.requestCounts.forEach((count, key) => {
            // Mask key for security (show first 10 chars)
            const maskedKey = key.substring(0, 10) + '...'
            counts[maskedKey] = count
        })

        return {
            totalKeys: this.keys.length,
            counts
        }
    }
}

// Singleton instance
export const apiKeyRotator = new ApiKeyRotator()
