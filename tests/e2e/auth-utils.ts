export function getProjectRefFromUrl(supabaseUrl: string): string | null {
  try {
    const host = new URL(supabaseUrl).host; // e.g. your-project-ref.supabase.co
    return host.split('.')[0] || null;
  } catch {
    return null;
  }
}

export function expectedCookieNames(env: NodeJS.ProcessEnv) {
  const projectRef = env.NEXT_PUBLIC_SUPABASE_URL
    ? getProjectRefFromUrl(env.NEXT_PUBLIC_SUPABASE_URL)
    : null;

  const modern = projectRef ? [`sb-${projectRef}-auth-token`] : [];
  const legacy = ['sb-access-token', 'sb-refresh-token'];

  return { modern, legacy };
}
