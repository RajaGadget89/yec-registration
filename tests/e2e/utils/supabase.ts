import { createClient } from '@supabase/supabase-js';

/**
 * Parse project ref from Supabase URL
 * @param supabaseUrl - The Supabase URL (e.g., https://xxxx.supabase.co)
 * @returns The project ref (e.g., xxxx) or null if invalid
 */
export function getProjectRef(supabaseUrl: string): string | null {
  try {
    const host = new URL(supabaseUrl).host; // e.g. your-project-ref.supabase.co
    return host.split('.')[0] || null;
  } catch {
    return null;
  }
}

/**
 * Create Supabase admin client for magic link generation
 * @param supabaseUrl - The Supabase URL
 * @param serviceRoleKey - The service role key
 * @returns Supabase admin client
 */
export function createSupabaseAdminClient(supabaseUrl: string, serviceRoleKey: string) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Generate magic link for authentication testing
 * @param email - The email address to generate link for
 * @param redirectTo - The redirect URL after authentication
 * @returns The magic link URL
 */
export async function generateMagicLink(
  email: string, 
  redirectTo: string,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<string> {
  const supabase = createSupabaseAdminClient(supabaseUrl, serviceRoleKey);
  
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { 
      redirectTo 
    },
  });

  if (error) {
    throw new Error(`Failed to generate magic link: ${error.message}`);
  }

  if (!data.properties?.action_link) {
    throw new Error('No action link returned from magic link generation');
  }

  return data.properties.action_link;
}

/**
 * Get expected auth cookie name based on project ref
 * @param projectRef - The Supabase project ref
 * @returns The expected cookie name pattern
 */
export function getAuthCookieName(projectRef: string): string {
  return `sb-${projectRef}-auth-token`;
}

/**
 * Validate auth cookie exists and has correct properties
 * @param cookies - Array of cookies from Playwright context
 * @param projectRef - The Supabase project ref
 * @param domainExpectation - Expected domain for production
 * @returns Validation result
 */
export function validateAuthCookie(
  cookies: any[], 
  projectRef: string, 
  domainExpectation?: 'prod'
): { valid: boolean; cookie?: any; error?: string } {
  const expectedName = getAuthCookieName(projectRef);
  
  // Find the auth cookie
  const authCookie = cookies.find(cookie => 
    cookie.name === expectedName || 
    (cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token') && cookie.name.includes(projectRef))
  );

  if (!authCookie) {
    return { 
      valid: false, 
      error: `Auth cookie not found. Expected: ${expectedName}, Found: ${cookies.map(c => c.name).join(', ')}` 
    };
  }

  // For production, validate domain
  if (domainExpectation === 'prod') {
    if (authCookie.domain !== '.rajagadget.live') {
      return { 
        valid: false, 
        cookie: authCookie,
        error: `Invalid domain for production cookie. Expected: .rajagadget.live, Got: ${authCookie.domain}` 
      };
    }
  }

  return { valid: true, cookie: authCookie };
}
