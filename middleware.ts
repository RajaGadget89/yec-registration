import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware to protect admin routes
 * Checks for admin-email cookie to authorize access
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

  // Check for admin-email cookie
  const adminEmail = request.cookies.get('admin-email')?.value;
  
  if (adminEmail) {
    // User is authenticated, allow access
    const response = NextResponse.next();
    response.headers.set('x-admin-guard', 'ok:admin-email');
    
    if (AUTH_TRACE) {
      console.log(`[auth-debug] middleware: allowing access (admin-email present)`);
    }
    
    return response;
  }

  // User is not authenticated, redirect to login
  const response = NextResponse.redirect(
    new URL(`/admin/login?next=${encodeURIComponent(pathname)}`, request.url),
    307
  );
  response.headers.set('x-admin-guard', 'deny:no-admin-email');
  
  if (AUTH_TRACE) {
    console.log(`[auth-debug] middleware: redirecting to login (no admin-email)`);
  }
  
  return response;
}

/**
 * Configure which routes to run middleware on
 */
export const config = {
  matcher: ['/admin', '/admin/(.*)'],
};
