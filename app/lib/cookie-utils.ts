/**
 * Unified Cookie Handling Utility
 *
 * This utility provides consistent cookie handling across all authentication flows
 * to fix session persistence issues.
 */

import { NextResponse } from "next/server";

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
}

/**
 * Get standardized cookie options for authentication cookies
 */
export function getAuthCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === "production";
  const isHttps =
    process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") || false;

  return {
    httpOnly: true,
    secure: isProduction || isHttps,
    sameSite: "lax",
    path: "/",
    domain: isProduction ? undefined : "localhost",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
}

/**
 * Get standardized cookie options for session cookies
 */
export function getSessionCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === "production";
  const isHttps =
    process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") || false;

  return {
    httpOnly: true,
    secure: isProduction || isHttps,
    sameSite: "lax",
    path: "/",
    domain: isProduction ? undefined : "localhost",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  };
}

/**
 * Set a cookie with standardized options
 */
export function setCookie(
  response: NextResponse,
  name: string,
  value: string,
  options: CookieOptions = {},
): void {
  const defaultOptions = getAuthCookieOptions();
  const cookieOptions = { ...defaultOptions, ...options };

  response.cookies.set(name, value, cookieOptions);
}

/**
 * Remove a cookie with standardized options
 */
export function removeCookie(
  response: NextResponse,
  name: string,
  options: CookieOptions = {},
): void {
  const defaultOptions = getAuthCookieOptions();
  const cookieOptions = { ...defaultOptions, ...options, maxAge: 0 };

  response.cookies.set(name, "", cookieOptions);
}

/**
 * Create a Supabase cookie handler with standardized options
 */
export function createSupabaseCookieHandler(response: NextResponse) {
  return {
    get: (_name: string) => {
      // This will be handled by the request cookies
      return undefined;
    },
    set: (name: string, value: string, options: any = {}) => {
      const defaultOptions = getAuthCookieOptions();
      const cookieOptions = { ...defaultOptions, ...options };
      response.cookies.set(name, value, cookieOptions);
    },
    remove: (name: string, options: any = {}) => {
      const defaultOptions = getAuthCookieOptions();
      const cookieOptions = { ...defaultOptions, ...options, maxAge: 0 };
      response.cookies.set(name, "", cookieOptions);
    },
  };
}
