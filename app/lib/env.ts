/**
 * Environment utilities for consistent APP_URL sourcing
 * Centralizes the logic for determining the application URL across environments
 */

/**
 * Get the application URL consistently across all environments
 * Prioritizes NEXT_PUBLIC_APP_URL in production to avoid Vercel deployment domain issues
 */
export function getAppUrl(): string {
  // In production, always use NEXT_PUBLIC_APP_URL
  if (process.env.NODE_ENV === "production") {
    const productionUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!productionUrl) {
      console.warn(
        "NEXT_PUBLIC_APP_URL not set in production - this may cause authentication issues",
      );
      return "";
    }
    return productionUrl;
  }

  // Check if we're in a Vercel preview environment (not production)
  if (process.env.VERCEL_URL && process.env.NODE_ENV === "development") {
    // Vercel provides VERCEL_URL in preview environments
    return `https://${process.env.VERCEL_URL}`;
  }

  // Fallback to environment variable or localhost
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8080";
}

/**
 * Get cookie options for authentication cookies
 * Sets proper domain for production cookies
 */
export function getCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
  domain?: string;
} {
  const options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax";
    path: string;
    maxAge: number;
    domain?: string;
  } = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  };

  // Set domain for production cookies
  if (process.env.NODE_ENV === "production") {
    options.domain = ".rajagadget.live";
  }

  return options;
}

/**
 * Check if running in production environment
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Check if running in development environment
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig() {
  return {
    isProduction: isProduction(),
    isDevelopment: isDevelopment(),
    appUrl: getAppUrl(),
    cookieOptions: getCookieOptions(),
  };
}
