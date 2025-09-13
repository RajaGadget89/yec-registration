/**
 * Token Configuration Module
 * Centralized configuration for token TTL and validation settings
 */

/**
 * Get invite token TTL in hours from environment or default
 */
export function getInviteTokenTTLHours(): number {
  const envValue = process.env.INVITE_TOKEN_TTL_HOURS;
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 24; // Default 24 hours for hardening
}

/**
 * Get invite token TTL in milliseconds
 */
export function getInviteTokenTTLMs(): number {
  return getInviteTokenTTLHours() * 60 * 60 * 1000;
}

/**
 * Check if a token is expired based on creation time and TTL
 */
export function isTokenExpired(createdAt: string, ttlMs?: number): boolean {
  const created = new Date(createdAt);
  const now = new Date();
  const ttl = ttlMs || getInviteTokenTTLMs();
  return now.getTime() - created.getTime() > ttl;
}

/**
 * Get token expiry time from creation time
 */
export function getTokenExpiryTime(createdAt: string, ttlMs?: number): Date {
  const created = new Date(createdAt);
  const ttl = ttlMs || getInviteTokenTTLMs();
  return new Date(created.getTime() + ttl);
}
