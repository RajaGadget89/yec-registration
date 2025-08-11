import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // For diagnostic purposes, we'll fabricate tokens
    // In a real scenario, you'd use your auth client here
    const accessToken = `diag_access_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const refreshToken = `diag_refresh_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    // Create redirect response
    const response = NextResponse.redirect(
      new URL('/admin', request.url),
      303
    );

    // Set the three required cookies with exact same options as auth callback
    const cookieOptions = {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24 hours
    };

    response.cookies.set('admin-email', email, cookieOptions);
    response.cookies.set('sb-access-token', accessToken, cookieOptions);
    response.cookies.set('sb-refresh-token', refreshToken, cookieOptions);

    // Set diagnostic headers
    response.headers.set('X-Diag', 'set-cookies');
    response.headers.set('X-Set-Cookie-Count', '3');
    response.headers.set('X-Diag-Email', email);

    console.log('[auth-debug] _diag/login: setting 3 cookies and redirecting to /admin');
    console.log('[auth-debug] _diag/login: access token:', accessToken.substring(0, 20) + '...');
    console.log('[auth-debug] _diag/login: refresh token:', refreshToken.substring(0, 20) + '...');

    return response;

  } catch (error) {
    console.error('[auth-debug] _diag/login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST with { email, password }' },
    { status: 405 }
  );
}
