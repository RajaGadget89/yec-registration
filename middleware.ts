import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, getDevEmailFromCookies } from './app/lib/admin-guard';

/**
 * Middleware to protect admin routes
 * Checks for authentication and admin access based on email allowlist
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Only protect admin routes
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
    return NextResponse.next();
  }

  // Don't protect the 403 page or dev endpoints
  if (pathname === '/403' || pathname.startsWith('/api/dev/')) {
    return NextResponse.next();
  }
  
  // Try to get user email from normal auth flow first
  let userEmail = request.cookies.get('admin-email')?.value;
  
  // If no email found and we're in development, check for dev cookie
  if (!userEmail && process.env.NODE_ENV !== 'production') {
    const devEmail = getDevEmailFromCookies(request);
    userEmail = devEmail || undefined;
  }
  
  // If no email found, redirect to sign-in or show 403
  if (!userEmail) {
    // For API routes, return 403 JSON response
    if (pathname.startsWith('/api/admin')) {
      return new Response(
        JSON.stringify({ error: 'forbidden' }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // For admin pages, redirect to 403 page
    const url = request.nextUrl.clone();
    url.pathname = '/403';
    return NextResponse.redirect(url);
  }
  
  // Check if user is admin
  if (!isAdmin(userEmail)) {
    // For API routes, return 403 JSON response
    if (pathname.startsWith('/api/admin')) {
      return new Response(
        JSON.stringify({ error: 'forbidden' }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // For admin pages, redirect to 403 page
    const url = request.nextUrl.clone();
    url.pathname = '/403';
    return NextResponse.redirect(url);
  }
  
  // User is authenticated and is admin, allow access
  return NextResponse.next();
}

/**
 * Configure which routes to run middleware on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
