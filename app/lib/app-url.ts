import { headers } from "next/headers";

/**
 * Get the application base URL with runtime fallback support
 * Primary source: NEXT_PUBLIC_APP_URL
 * Fallback: runtime request headers (x-forwarded-host, host)
 * Final fallback: VERCEL_URL for preview environments
 */
export async function getAppBaseUrl(): Promise<string> {
  const env = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (isGoodAbsoluteUrl(env)) return stripSlash(env);

  // Fallback to runtime request headers
  try {
    const h = await headers();
    const host =
      h.get("x-forwarded-host") ||
      h.get("host") ||
      process.env.VERCEL_URL ||
      "";
    if (!host) throw new Error("APP_URL_UNAVAILABLE");

    const proto =
      h.get("x-forwarded-proto") ||
      (host.includes("localhost") ? "http" : "https");
    const origin = host.startsWith("http") ? host : `${proto}://${host}`;
    const u = new URL("/", origin);
    return stripSlash(u.origin);
  } catch {
    // If headers() fails (e.g., not in request context), use VERCEL_URL
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    throw new Error("APP_URL_UNAVAILABLE");
  }
}

/**
 * Check if a URL is a valid absolute URL (no wildcards, proper protocol)
 */
function isGoodAbsoluteUrl(u: string): boolean {
  if (!u || u.includes("*")) return false;
  try {
    const p = new URL(u);
    return p.protocol === "http:" || p.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Remove trailing slash from URL
 */
function stripSlash(u: string): string {
  return u.replace(/\/$/, "");
}
