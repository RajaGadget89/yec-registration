import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Middleware to protect admin routes
 * Checks for Supabase session to authorize access
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Auth tracing
  const AUTH_TRACE = process.env.AUTH_TRACE === '1' || process.env.NODE_ENV === 'development';
  
  // Exclude diagnostic paths from all auth checks
  if (pathname.startsWith('/api/diag/')) {
    if (AUTH_TRACE) {
      console.log(`[auth-debug] middleware: allowing diagnostic path ${pathname}`);
    }
    return NextResponse.next();
  }
  
  if (AUTH_TRACE) {
    const cookieNames = Array.from(request.cookies.getAll()).map(c => c.name);
    console.log(`[auth-debug] middleware: path=${pathname}, cookies=[${cookieNames.join(', ')}], origin=${request.headers.get('origin') || 'none'}`);
  }
  
  // Allowlist paths that should bypass admin protection
  const allowlistPaths = [
    '/admin/login',
    '/auth',
    '/api',
    '/_next',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml'
  ];
  
  // Check if path should be allowed
  for (const allowedPath of allowlistPaths) {
    if (pathname.startsWith(allowedPath)) {
      if (AUTH_TRACE) {
        console.log(`[auth-debug] middleware: allowing path (${allowedPath})`);
      }
      return NextResponse.next();
    }
  }
  
  // Check for static assets
  if (/\.(ico|png|jpg|jpeg|gif|svg|css|js|map|woff|woff2|ttf|eot)$/.test(pathname)) {
    if (AUTH_TRACE) {
      console.log(`[auth-debug] middleware: allowing static asset`);
    }
    return NextResponse.next();
  }

  try {
    // Create Supabase server client with cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (key: string) => request.cookies.get(key)?.value,
          set: (key, value, options) => {
            // This is read-only in middleware, so we don't implement set
          },
          remove: (key, options) => {
            // This is read-only in middleware, so we don't implement remove
          },
        },
      },
    );

    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      if (AUTH_TRACE) {
        console.log(`[auth-debug] middleware: session error:`, sessionError.message);
      }
      // Session error, redirect to login
      const response = NextResponse.redirect(
        new URL(`/admin/login?next=${encodeURIComponent(pathname)}`, request.url),
        307
      );
      response.headers.set('x-admin-guard', 'deny:session-error');
      return response;
    }

    if (!session) {
      if (AUTH_TRACE) {
        console.log(`[auth-debug] middleware: no session found`);
      }
      // No session, redirect to login
      const response = NextResponse.redirect(
        new URL(`/admin/login?next=${encodeURIComponent(pathname)}`, request.url),
        307
      );
      response.headers.set('x-admin-guard', 'deny:no-session');
      return response;
    }

    // Check if user is in admin allowlist
    const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) || [];
    const userEmail = session.user.email?.toLowerCase();
    
    if (!userEmail || !adminEmails.includes(userEmail)) {
      if (AUTH_TRACE) {
        console.log(`[auth-debug] middleware: user not in admin allowlist:`, userEmail);
      }
      // User not in admin allowlist, redirect to login
      const response = NextResponse.redirect(
        new URL(`/admin/login?next=${encodeURIComponent(pathname)}`, request.url),
        307
      );
      response.headers.set('x-admin-guard', 'deny:not-admin');
      return response;
    }

    // User is authenticated and is admin, allow access
    const response = NextResponse.next();
    response.headers.set('x-admin-guard', 'ok:supabase-session');
    
    if (AUTH_TRACE) {
      console.log(`[auth-debug] middleware: allowing access (supabase session + admin email)`);
    }
    
    return response;

  } catch (error) {
    if (AUTH_TRACE) {
      console.log(`[auth-debug] middleware: unexpected error:`, error);
    }
    // Unexpected error, redirect to login
    const response = NextResponse.redirect(
      new URL(`/admin/login?next=${encodeURIComponent(pathname)}`, request.url),
      307
    );
    response.headers.set('x-admin-guard', 'deny:error');
    return response;
  }
}

/**
 * Configure which routes to run middleware on
 */
export const config = {
  matcher: ['/admin', '/admin/(.*)'],
};
