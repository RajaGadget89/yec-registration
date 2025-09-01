import { createHash } from "crypto";

/**
 * Idempotency Cache Utility
 *
 * Provides in-memory TTL storage for strict idempotency handling.
 * Key format: `${actorId}|${routeId}|${idempotencyKey}`
 *
 * UAT-04 Contract:
 * - Same key + same body → return bit-equal prior result with X-Idempotency-Hit: true
 * - Same key + different body → 422 IDEMPOTENCY_PAYLOAD_MISMATCH (no writes)
 * - Events/Audit written only on first 201; no writes on replays or errors
 */

interface IdempotencySnapshot {
  payloadHash: string;
  status: number;
  body: string; // Exact response body string
  createdAt: number;
}

interface IdempotencyCache {
  [key: string]: IdempotencySnapshot;
}

class IdempotencyCacheManager {
  private cache: IdempotencyCache = {};
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly defaultTtlSeconds = 600; // 10 minutes

  constructor() {
    // Start cleanup interval (every 5 minutes)
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000,
    );
  }

  /**
   * Canonicalize invite payload for consistent hashing
   * Normalizes: email lowercased & trimmed; roles sorted + deduped
   */
  static canonicalizeInvitePayload(input: { email: string; roles: string[] }): {
    email: string;
    roles: string[];
  } {
    return {
      email: input.email.toLowerCase().trim(),
      roles: [...new Set(input.roles)].sort(), // dedupe and sort
    };
  }

  /**
   * Hash payload for idempotency comparison
   */
  static hashPayload(obj: any): string {
    const jsonString = JSON.stringify(obj);
    return createHash("sha256").update(jsonString).digest("hex");
  }

  /**
   * Generate cache key from actor, route, and idempotency key
   */
  static generateKey(
    actorId: string,
    routeId: string,
    idempotencyKey: string,
  ): string {
    return `${actorId}|${routeId}|${idempotencyKey}`;
  }

  /**
   * Get snapshot for idempotency check
   */
  getSnapshot(
    actorId: string,
    routeId: string,
    idempotencyKey: string,
  ): IdempotencySnapshot | null {
    const key = IdempotencyCacheManager.generateKey(
      actorId,
      routeId,
      idempotencyKey,
    );
    const snapshot = this.cache[key];

    if (!snapshot) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    const ageMs = now - snapshot.createdAt;
    const ttlMs = this.defaultTtlSeconds * 1000;

    if (ageMs > ttlMs) {
      delete this.cache[key];
      return null;
    }

    return snapshot;
  }

  /**
   * Set snapshot for idempotency storage
   */
  setSnapshot(
    actorId: string,
    routeId: string,
    idempotencyKey: string,
    snapshot: Omit<IdempotencySnapshot, "createdAt">,
  ): void {
    const key = IdempotencyCacheManager.generateKey(
      actorId,
      routeId,
      idempotencyKey,
    );

    this.cache[key] = {
      ...snapshot,
      createdAt: Date.now(),
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const ttlMs = this.defaultTtlSeconds * 1000;

    Object.keys(this.cache).forEach((key) => {
      const snapshot = this.cache[key];
      const ageMs = now - snapshot.createdAt;

      if (ageMs > ttlMs) {
        delete this.cache[key];
      }
    });
  }

  /**
   * Get cache statistics (for debugging)
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: Object.keys(this.cache).length,
      keys: Object.keys(this.cache),
    };
  }

  /**
   * Clear all cache entries (for testing)
   */
  clear(): void {
    this.cache = {};
  }

  /**
   * Cleanup on destroy
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache = {};
  }
}

// Global instance
export const idempotencyCache = new IdempotencyCacheManager();

// Export utility functions
export const { canonicalizeInvitePayload, hashPayload, generateKey } =
  IdempotencyCacheManager;
