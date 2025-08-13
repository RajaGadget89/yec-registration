import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { access_token, refresh_token, next } = body;

    console.log('[test-auth-callback] Received tokens:', {
      hasAccessToken: !!access_token,
      hasRefreshToken: !!refresh_token,
      next,
      accessTokenLength: access_token?.length,
      refreshTokenLength: refresh_token?.length
    });

    if (!access_token || !refresh_token) {
      console.error('[test-auth-callback] missing tokens in POST body');
      return NextResponse.json({
        error: 'Missing authentication tokens',
        received: { hasAccessToken: !!access_token, hasRefreshToken: !!refresh_token }
      }, { status: 400 });
    }

    console.log('[test-auth-callback] hash tokens found, setting session');
    
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            console.log('[test-auth-callback] Setting cookie:', name, '=', value.substring(0, 50) + '...');
            cookieStore.set(name, value, options);
          },
          remove(name: string, options: any) {
            console.log('[test-auth-callback] Removing cookie:', name);
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    
    if (error) {
      console.error('[test-auth-callback] session set error:', error);
      return NextResponse.json({
        error: 'Failed to set session',
        details: error.message
      }, { status: 400 });
    }
    
    if (data.session) {
      console.log('[test-auth-callback] hash session established, user:', data.session.user.email);
      
      // Get the response object to capture cookies
      const response = NextResponse.json({
        success: true,
        user: data.session.user.email,
        sessionId: data.session.access_token.substring(0, 20) + '...',
        redirectTo: next || '/admin'
      });
      
      // Copy cookies from the cookie store to the response
      const allCookies = cookieStore.getAll();
      allCookies.forEach(cookie => {
        if (cookie.name.startsWith('sb-')) {
          response.cookies.set(cookie.name, cookie.value, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
          });
        }
      });
      
      return response;
    }
    
    return NextResponse.json({
      error: 'No session established',
      data: data
    }, { status: 400 });
    
  } catch (err) {
    console.error('[test-auth-callback] unexpected error during token processing:', err);
    return NextResponse.json({
      error: 'Unexpected error during authentication',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}

