/**
 * Environment guards for database routing validation
 * Prevents accidental use of localhost in non-localdev environments
 */

/**
 * Assert that database routing is correct for the current environment
 * Throws an error if SUPABASE_URL points to localhost in non-localdev environments
 */
export function assertDbRouting() {
  const url = (process.env.SUPABASE_URL ?? '').trim();
  const envTag = (process.env.SUPABASE_ENV ?? 'staging').toLowerCase();
  const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost)/i.test(url);

  if (envTag !== 'localdev' && isLocal) {
    throw new Error(
      `[DB_ROUTING] Refused to start: SUPABASE_URL=${url} with SUPABASE_ENV=${envTag}. ` +
      `Local Supabase is only allowed when SUPABASE_ENV=localdev.`
    );
  }
}

/**
 * Get database host for logging (masked for security)
 */
export function dbHostForLog(url = process.env.SUPABASE_URL ?? '') {
  try { return new URL(url).host; } catch { return url; }
}

/**
 * Validate required Supabase environment variables
 */
export function validateSupabaseEnv(): void {
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required Supabase environment variables: ${missing.join(', ')}`
    );
  }
}

/**
 * Log database routing information (development only)
 */
export function logDbRouting(): void {
  if (process.env.NODE_ENV === 'development') {
    const host = dbHostForLog();
    const env = process.env.SUPABASE_ENV || 'staging';
    console.log(`[DB] ENV=${env} HOST=${host}`);
  }
}
