// Re-export types and client-safe functions
export type { AuthenticatedUser, AuthSession } from './auth-utils.server';
export type { AuthenticatedUser as ClientAuthenticatedUser } from './auth-client';

// Re-export client-safe functions
export { getSupabaseAuth, getSupabaseBrowserClient, getClientUser } from './auth-client';

// Re-export server functions for API routes and server components
export {
  getCurrentUser,
  getCurrentUserFromRequest,
  isAuthenticatedAdmin,
  isAuthenticatedSuperAdmin,
  isAuthenticated,
  hasRole,
  updateLastLogin,
  upsertAdminUser,
  serverLogout
} from './auth-utils.server';

/**
 * Check if running in production environment
 */
export function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Get consistent cookie options for auth cookies
 */
export function cookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  };
}

/**
 * Get app URL consistently from config
 */
export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080';
}

/**
 * Check if email is in admin allowlist
 */
export function isAdmin(email: string): boolean {
  if (!email) return false;
  
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
  return adminEmails.includes(email.toLowerCase());
}
