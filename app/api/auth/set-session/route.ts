import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { access_token, refresh_token } = body ?? {};

  // 1. Parse tokens from POST JSON
  if (!access_token || !refresh_token) {
    return NextResponse.json(
      { ok: false, reason: 'MISSING_TOKENS', message: 'access_token and refresh_token are required' },
      { status: 400 }
    );
  }

  // 2. Build origin and redirect target
  const origin = new URL(req.url).origin;
  const redirectUrl = new URL('/admin', origin);

  // 3. Create one NextResponse upfront
  const res = new NextResponse(null, { 
    status: 303, 
    headers: { Location: redirectUrl.toString() }
  });

  // 4. Create SSR client with cookie adapter that writes into res
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => {
          // Enhanced cookie configuration for better compatibility
          const cookieOptions = {
            ...options,
            httpOnly: true,
            sameSite: 'lax' as const,
            path: '/',
            domain: process.env.NODE_ENV === 'production' ? undefined : 'localhost',
            secure: process.env.NODE_ENV === 'production' || origin.startsWith('https://'),
            maxAge: options.maxAge || 60 * 60 * 24 * 7, // 7 days default
          };
          
          console.log('[set-session] Setting cookie:', name, 'with options:', cookieOptions);
          res.cookies.set(name, value, cookieOptions);
        },
        remove: (name, options) => {
          const cookieOptions = {
            ...options,
            httpOnly: true,
            sameSite: 'lax' as const,
            path: '/',
            domain: process.env.NODE_ENV === 'production' ? undefined : 'localhost',
            secure: process.env.NODE_ENV === 'production' || origin.startsWith('https://'),
            maxAge: 0,
          };
          
          console.log('[set-session] Removing cookie:', name);
          res.cookies.set(name, '', cookieOptions);
        },
      },
    }
  );

  try {
    // 5. Set session with tokens
    console.log('[set-session] Attempting to set session with tokens');
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
    
    if (error) {
      console.error('[set-session] setSession error:', error);
      return NextResponse.json(
        { ok: false, reason: 'SET_SESSION_ERROR', message: error.message },
        { status: 500 }
      );
    }

    if (!data.session) {
      console.error('[set-session] No session returned from setSession');
      return NextResponse.json(
        { ok: false, reason: 'NO_SESSION', message: 'No session established' },
        { status: 500 }
      );
    }

    console.log('[set-session] Session established successfully:', {
      userId: data.session.user.id,
      email: data.session.user.email,
      expiresAt: data.session.expires_at
    });

    // 6. Verify the session was actually set by getting the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[set-session] getUser error after setSession:', userError);
      return NextResponse.json(
        { ok: false, reason: 'USER_VERIFICATION_FAILED', message: 'Session set but user verification failed' },
        { status: 500 }
      );
    }

    console.log('[set-session] User verified:', user.email);

    // 7. Add debug headers and logs
    res.headers.set('X-Auth-Debug', 'set-session:ok');
    res.headers.set('X-User-ID', user.id);
    res.headers.set('X-User-Email', user.email || '');
    
    const setCookieHeader = res.headers.get('set-cookie');
    res.headers.append('X-Set-Cookie-Names', setCookieHeader ? 'present' : 'none');
    
    console.log('[set-session] done', { 
      redirect: res.headers.get('Location'),
      hasCookies: !!setCookieHeader,
      cookieCount: setCookieHeader ? setCookieHeader.split(',').length : 0,
      userId: user.id,
      userEmail: user.email
    });

    // 8. Return the same res instance (do not create new response)
    return res;

  } catch (e: unknown) {
    console.error('[set-session] error:', e);
    const errorMessage = e instanceof Error ? e.message : 'Failed to set session';
    return NextResponse.json(
      { ok: false, reason: 'UNEXPECTED_ERROR', message: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 });
}
