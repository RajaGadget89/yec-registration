/**
 * Simple in-memory rate limiting utility
 * For production, consider using Redis or a dedicated rate limiting service
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000,
    );
  }

  /**
   * Check if a request is allowed based on rate limits
   * @param key - Unique identifier (e.g., IP address or user ID)
   * @param limit - Maximum number of requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns {allowed: boolean, remaining: number, resetTime: number}
   */
  check(
    key: string,
    limit: number,
    windowMs: number,
  ): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now > entry.resetTime) {
      // No entry or expired, create new entry
      const resetTime = now + windowMs;
      this.limits.set(key, { count: 1, resetTime });
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime,
      };
    }

    if (entry.count >= limit) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    // Increment count
    entry.count++;
    this.limits.set(key, entry);

    return {
      allowed: true,
      remaining: limit - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Get current stats for debugging
   */
  getStats(): {
    totalKeys: number;
    entries: Array<{ key: string; count: number; resetTime: number }>;
  } {
    const entries = Array.from(this.limits.entries()).map(([key, entry]) => ({
      key,
      count: entry.count,
      resetTime: entry.resetTime,
    }));

    return {
      totalKeys: this.limits.size,
      entries,
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.limits.clear();
  }

  /**
   * Reset all rate limits (useful for testing)
   */
  reset(): void {
    this.limits.clear();
  }
}

// Create a singleton instance
const rateLimiter = new RateLimiter();

/**
 * Rate limit middleware for API routes
 * @param key - Unique identifier for rate limiting
 * @param limit - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns Rate limit check result
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetTime: number } {
  // For E2E tests, bypass rate limiting entirely
  if (process.env.E2E_TESTS === "true") {
    return {
      allowed: true,
      remaining: limit,
      resetTime: Date.now() + windowMs,
    };
  }

  return rateLimiter.check(key, limit, windowMs);
}

/**
 * Get rate limiter stats for debugging
 */
export function getRateLimitStats() {
  return rateLimiter.getStats();
}

/**
 * Clean up rate limiter (call on app shutdown)
 */
export function cleanupRateLimiter() {
  rateLimiter.destroy();
}

/**
 * Reset rate limiter (useful for testing)
 */
export function resetRateLimiter() {
  rateLimiter.reset();
}

/**
 * Rate limit configuration for admin invitation endpoint
 */
export const ADMIN_INVITE_RATE_LIMITS = {
  PER_MINUTE:
    process.env.E2E_TESTS === "true"
      ? parseInt(process.env.INVITE_RATE_LIMIT_PER_MIN || "1000", 10)
      : parseInt(process.env.INVITE_RATE_LIMIT_PER_MIN || "5", 10),
  PER_DAY:
    process.env.E2E_TESTS === "true"
      ? parseInt(process.env.INVITE_RATE_LIMIT_PER_DAY || "10000", 10)
      : parseInt(process.env.INVITE_RATE_LIMIT_PER_DAY || "20", 10),
  WINDOW_MS: {
    MINUTE: 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
  },
} as const;

// Debug logging for rate limit configuration
console.log("[RATE_LIMIT_CONFIG] E2E_TESTS:", process.env.E2E_TESTS);
console.log(
  "[RATE_LIMIT_CONFIG] PER_MINUTE:",
  ADMIN_INVITE_RATE_LIMITS.PER_MINUTE,
);
console.log("[RATE_LIMIT_CONFIG] PER_DAY:", ADMIN_INVITE_RATE_LIMITS.PER_DAY);
