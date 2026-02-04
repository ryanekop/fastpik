// Simple in-memory cache with TTL and size limits
interface CacheEntry<T> {
    data: T
    expiresAt: number
    lastAccessed: number
}

interface CacheConfig {
    defaultTTL: number      // Time to live in ms
    maxEntries: number      // Maximum cache entries
    cleanupInterval: number // Cleanup interval in ms
}

class MemoryCache {
    private cache: Map<string, CacheEntry<unknown>> = new Map()
    private config: CacheConfig
    private cleanupTimer: ReturnType<typeof setInterval> | null = null

    constructor(config?: Partial<CacheConfig>) {
        this.config = {
            defaultTTL: 30 * 60 * 1000,      // 30 minutes default
            maxEntries: 100,                  // Max 100 projects cached
            cleanupInterval: 5 * 60 * 1000,   // Cleanup every 5 minutes
            ...config
        }

        // Start cleanup timer
        this.startCleanup()
    }

    get<T>(key: string): T | null {
        const entry = this.cache.get(key) as CacheEntry<T> | undefined

        if (!entry) {
            return null
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key)
            return null
        }

        // Update last accessed time
        entry.lastAccessed = Date.now()

        return entry.data
    }

    set<T>(key: string, data: T, ttlMs?: number): void {
        // Enforce max entries - remove oldest if at limit
        if (this.cache.size >= this.config.maxEntries && !this.cache.has(key)) {
            this.evictOldest()
        }

        const ttl = ttlMs ?? this.config.defaultTTL
        const now = Date.now()

        this.cache.set(key, {
            data,
            expiresAt: now + ttl,
            lastAccessed: now
        })
    }

    delete(key: string): boolean {
        return this.cache.delete(key)
    }

    // Evict the oldest (least recently accessed) entry
    private evictOldest(): void {
        let oldestKey: string | null = null
        let oldestTime = Infinity

        for (const [key, entry] of this.cache.entries()) {
            if (entry.lastAccessed < oldestTime) {
                oldestTime = entry.lastAccessed
                oldestKey = key
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey)
            console.log(`[Cache EVICT] Removed oldest entry: ${oldestKey}`)
        }
    }

    // Clear expired entries
    cleanup(): number {
        const now = Date.now()
        let removed = 0

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key)
                removed++
            }
        }

        if (removed > 0) {
            console.log(`[Cache CLEANUP] Removed ${removed} expired entries`)
        }

        return removed
    }

    // Start automatic cleanup
    private startCleanup(): void {
        if (typeof window === 'undefined' && !this.cleanupTimer) {
            this.cleanupTimer = setInterval(() => {
                this.cleanup()
            }, this.config.cleanupInterval)
        }
    }

    // Stop cleanup timer
    destroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer)
            this.cleanupTimer = null
        }
    }

    // Get cache stats
    stats(): {
        size: number
        maxEntries: number
        ttlMinutes: number
        keys: string[]
    } {
        return {
            size: this.cache.size,
            maxEntries: this.config.maxEntries,
            ttlMinutes: this.config.defaultTTL / 60000,
            keys: Array.from(this.cache.keys())
        }
    }

    // Check if key exists and is not expired
    has(key: string): boolean {
        const entry = this.cache.get(key)
        if (!entry) return false
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key)
            return false
        }
        return true
    }
}

// Singleton instance with 30 min TTL and max 100 entries
export const photoCache = new MemoryCache({
    defaultTTL: 30 * 60 * 1000,  // 30 minutes
    maxEntries: 100,              // Max 100 projects
    cleanupInterval: 5 * 60 * 1000 // Cleanup every 5 min
})

// Generate cache key from Google Drive folder ID
export function generateCacheKey(folderId: string, detectSubfolders: boolean): string {
    return `photos:${folderId}:${detectSubfolders ? 'sub' : 'nosub'}`
}

// Preload photos for a project with delay to avoid rate limiting
// Default delay: 2 seconds after project creation
export async function preloadProjectPhotos(
    gdriveLink: string,
    detectSubfolders: boolean,
    delayMs: number = 2000 // Wait 2 seconds before preloading
): Promise<boolean> {
    return new Promise((resolve) => {
        // Delay the request to avoid rate limiting
        setTimeout(async () => {
            try {
                const params = new URLSearchParams({
                    gdriveLink,
                    detectSubfolders: detectSubfolders ? 'true' : 'false'
                })

                console.log('[Preload] Starting preload after delay...')
                const response = await fetch(`/api/photos?${params}`)

                if (response.ok) {
                    console.log('[Preload] ✅ Photos preloaded successfully')
                    resolve(true)
                } else {
                    console.log('[Preload] ⚠️ Preload failed:', response.status)
                    resolve(false)
                }
            } catch (error) {
                console.error('[Preload] Failed to preload photos:', error)
                resolve(false)
            }
        }, delayMs)
    })
}
