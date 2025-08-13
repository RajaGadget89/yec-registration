/**
 * Test setup helper to print masked environment variables
 */
export function printMaskedEnv(): void {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (supabaseUrl) {
    // Extract project ref from URL
    const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    const projectRef = urlMatch ? urlMatch[1] : 'unknown';
    console.log(`[env] SUPABASE_URL project-ref: ${projectRef}`);
  }
  
  if (serviceRoleKey) {
    // Show first 6 characters of service role key
    const maskedKey = serviceRoleKey.substring(0, 6) + '...';
    console.log(`[env] SUPABASE_SERVICE_ROLE_KEY: ${maskedKey}`);
  } else {
    console.log(`[env] SUPABASE_SERVICE_ROLE_KEY: not set`);
  }
  
  console.log(`[env] NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`[env] PLAYWRIGHT_TEST: ${process.env.PLAYWRIGHT_TEST}`);
}
