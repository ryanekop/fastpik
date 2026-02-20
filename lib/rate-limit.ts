/**
 * In-memory rate limiter for API routes.
 * Uses sliding window algorithm with auto-cleanup to prevent memory leaks.
 * 
 * Usage:
 *   const limiter = createRateLimiter({ limit: 10, windowMs: 60_000 });
 *   
 *   export async function POST(request: NextRequest) {
 *     const ip = request.headers.get('x-forwarded-for') || 'unknown';
 *     const { allowed, remaining, retryAfterMs } = limiter.check(ip);
 *     if (!allowed) {
 *       return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 *     }
 *     // ... handle request
 *   }
 */

interface RateLimitEntry {
    timestamps: number[];
}

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    retryAfterMs: number;
}

interface RateLimiterOptions {
    /** Maximum number of requests per window */
    limit: number;
    /** Window duration in milliseconds */
    windowMs: number;
}

interface RateLimiter {
    check: (key: string) => RateLimitResult;
    reset: (key: string) => void;
}

const store = new Map<string, RateLimitEntry>();

// Global cleanup interval — runs every 60 seconds to remove expired entries
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
    if (cleanupInterval) return;
    cleanupInterval = setInterval(() => {
        const now = Date.now();
        // Remove entries that haven't been accessed in 5 minutes
        for (const [key, entry] of store.entries()) {
            const latest = entry.timestamps[entry.timestamps.length - 1] || 0;
            if (now - latest > 5 * 60 * 1000) {
                store.delete(key);
            }
        }
    }, 60_000);

    // Don't prevent Node.js from exiting
    if (cleanupInterval && typeof cleanupInterval === 'object' && 'unref' in cleanupInterval) {
        cleanupInterval.unref();
    }
}

/**
 * Create a rate limiter instance with the given options.
 * Multiple limiters can coexist for different endpoints with different limits.
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
    const { limit, windowMs } = options;

    startCleanup();

    return {
        check(key: string): RateLimitResult {
            const now = Date.now();
            const windowStart = now - windowMs;

            // Get or create entry
            let entry = store.get(key);
            if (!entry) {
                entry = { timestamps: [] };
                store.set(key, entry);
            }

            // Remove timestamps outside the window
            entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);

            // Check if under limit
            if (entry.timestamps.length < limit) {
                entry.timestamps.push(now);
                return {
                    allowed: true,
                    remaining: limit - entry.timestamps.length,
                    retryAfterMs: 0,
                };
            }

            // Over limit — calculate retry after
            const oldest = entry.timestamps[0];
            const retryAfterMs = oldest + windowMs - now;

            return {
                allowed: false,
                remaining: 0,
                retryAfterMs: Math.max(0, retryAfterMs),
            };
        },

        reset(key: string) {
            store.delete(key);
        },
    };
}

/**
 * Helper to extract client IP from a request.
 * Handles Cloudflare, Nginx, and direct connections.
 */
export function getClientIp(request: Request): string {
    const headers = request.headers;
    return (
        headers.get('cf-connecting-ip') ||      // Cloudflare
        headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||  // Proxy/Nginx
        headers.get('x-real-ip') ||              // Nginx
        'unknown'
    );
}

/**
 * Create a standard 429 Too Many Requests response.
 */
export function rateLimitResponse(retryAfterMs: number) {
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    return new Response(
        JSON.stringify({
            error: 'Too many requests. Please try again later.',
            retryAfterSeconds: retryAfterSec,
        }),
        {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(retryAfterSec),
            },
        }
    );
}
