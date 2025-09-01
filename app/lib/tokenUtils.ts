import crypto from "crypto";

/**
 * Token utility functions for invitation management
 */

/**
 * Generate a URL-safe token (32 bytes -> base64url)
 * No special characters that need URL encoding
 */
export function makeUrlSafeToken(): string {
  // Generate 32 random bytes
  const randomBytes = crypto.randomBytes(32);

  // Convert to base64 and make URL-safe
  // Replace '+' with '-', '/' with '_', and remove '=' padding
  return randomBytes
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Generate a hex token (32 bytes -> hex)
 * Alternative format that's also URL-safe
 */
export function makeHexToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
