import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isAdminManagementEnabled } from './app/lib/features';

/**
 * Helper function to get current user from admin-email cookie (non-production fallback)
 * Mirrors the logic from getCurrentUser() in auth-utils.server.ts
 */
async function getCurrentUserFromCookie(email: string | undefined): Promise<{is_active: boolean, role: string} | null> {
  if (!email) {
    return null;
  }
  
  try {
    // Create service client for database access
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get: () => undefined,
          set: () => {},
          remove: () => {},
        },
      },
    );
    
    const { data: adminUser, error } = await supabase
      .from("admin_users")
      .select("is_active, role")
      .eq("email", email.toLowerCase())
      .eq("is_active", true)
      .single();
    
    if (!error && adminUser) {
      return {
        is_active: adminUser.is_active,
        role: adminUser.role
      };
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Helper function to check if user is admin (database-first approach)
 */
async function checkUserAdminStatus(email: string | undefined): Promise<boolean> {
  if (!email) return false;
  
  try {
    // Check database first
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: () => undefined,
          set: () => {},
          remove: () => {},
        },
      },
    );
    
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("email")
      .eq("email", email.toLowerCase())
      .eq("is_active", true)
      .single();
    
    if (adminUser) return true;
    
    // Fall back to environment variables
    const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) || [];
    return adminEmails.includes(email.toLowerCase());
  } catch {
    // Environment fallback on database error
    const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) || [];
    return adminEmails.includes(email.toLowerCase());
  }
}

/**
 * Middleware to protect admin routes
 * Checks for Supabase session to authorize access
 * UNIFIED: Now uses same auth logic as page guard (getCurrentUser)
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

  // Create response object for cookie handling
  const response = NextResponse.next();

  try {
    // UNIFIED AUTH LOGIC: Same as page guard (getCurrentUser)
    
    // 1. Feature Flag Check: if disabled → return 403
    if (!isAdminManagementEnabled()) {
      if (AUTH_TRACE) {
        console.log(`[auth-debug] middleware: feature flag disabled`);
      }
      const forbiddenResponse = new NextResponse("Feature not available", { status: 403 });
      forbiddenResponse.headers.set('x-admin-guard', 'deny:feature-flag-off');
      return forbiddenResponse;
    }

    // 2. Try Supabase session first (fast path)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (key: string) => request.cookies.get(key)?.value,
          set: (key, value, options) => {
            // Forward cookie mutations to the response
            response.cookies.set(key, value, options);
          },
          remove: (key, options) => {
            // Forward cookie removal to the response
            response.cookies.set(key, "", { ...options, expires: new Date(0) });
          },
        },
      },
    );

    // Get the current session (this will automatically refresh if needed)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    let userEmail: string | undefined;
    let userRole: string | undefined;
    let isUserActive: boolean = false;
    let authMethod: 'supabase-session' | 'admin-email-cookie' | 'none' = 'none';

    if (!sessionError && session) {
      // Supabase session exists - get user details
      userEmail = session.user.email?.toLowerCase();
      const isUserAdmin = await checkUserAdminStatus(userEmail);
      
      if (isUserAdmin) {
        // Get full user details from database
        const serviceClient = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            cookies: {
              get: () => undefined,
              set: () => {},
              remove: () => {},
            },
          },
        );
        
        const { data: adminUser } = await serviceClient
          .from("admin_users")
          .select("role, is_active")
          .eq("email", userEmail)
          .eq("is_active", true)
          .single();
        
        if (adminUser) {
          userRole = adminUser.role;
          isUserActive = adminUser.is_active;
          authMethod = 'supabase-session';
        }
      }
    }

    // 3. Fallback: Check admin-email cookie (consistent with API authentication)
    if (authMethod === 'none') {
      const adminEmail = request.cookies.get("admin-email")?.value;
      if (adminEmail) {
        console.log(`[auth-debug] middleware: checking admin-email cookie: ${adminEmail}`);
        const cookieUser = await getCurrentUserFromCookie(adminEmail);
        if (cookieUser) {
          userEmail = adminEmail.toLowerCase();
          userRole = cookieUser.role;
          isUserActive = cookieUser.is_active;
          authMethod = 'admin-email-cookie';
          console.log(`[auth-debug] middleware: admin-email cookie authentication successful`);
        } else {
          console.log(`[auth-debug] middleware: admin-email cookie authentication failed`);
        }
      }
    }

    // 4. Decision logic (same as page guard)
    if (authMethod === 'none') {
      if (AUTH_TRACE) {
        console.log(`[auth-debug] middleware: no valid session found`);
      }
      // No session, redirect to login
      const redirectResponse = NextResponse.redirect(
        new URL(`/admin/login?next=${encodeURIComponent(pathname)}`, request.url),
        307
      );
      redirectResponse.headers.set('x-admin-guard', 'deny:no-session');
      // Copy any cookies from our response to the redirect response
      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
      });
      return redirectResponse;
    }

    if (!isUserActive) {
      if (AUTH_TRACE) {
        console.log(`[auth-debug] middleware: user not active:`, userEmail);
      }
      // User not active, redirect to login
      const redirectResponse = NextResponse.redirect(
        new URL(`/admin/login?next=${encodeURIComponent(pathname)}`, request.url),
        307
      );
      redirectResponse.headers.set('x-admin-guard', 'deny:not-active');
      // Copy any cookies from our response to the redirect response
      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
      });
      return redirectResponse;
    }

    if (userRole !== 'super_admin') {
      if (AUTH_TRACE) {
        console.log(`[auth-debug] middleware: user not super_admin:`, userEmail, userRole);
      }
      // User not super_admin, return 403
      const forbiddenResponse = new NextResponse("Forbidden", { status: 403 });
      forbiddenResponse.headers.set('x-admin-guard', 'deny:not-super-admin');
      return forbiddenResponse;
    }

    // User is authenticated, active, and super_admin, allow access
    response.headers.set('x-admin-guard', `ok:${authMethod}`);
    
    if (AUTH_TRACE) {
      console.log(`[auth-debug] middleware: allowing access (${authMethod})`);
    }
    
    return response;

  } catch (error) {
    if (AUTH_TRACE) {
      console.log(`[auth-debug] middleware: unexpected error:`, error);
    }
    // Unexpected error, redirect to login
    const redirectResponse = NextResponse.redirect(
      new URL(`/admin/login?next=${encodeURIComponent(pathname)}`, request.url),
      307
    );
    redirectResponse.headers.set('x-admin-guard', 'deny:error');
    // Copy any cookies from our response to the redirect response
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }
}

/**
 * Configure which routes to run middleware on
 */
export const config = {
  matcher: ['/admin', '/admin/(.*)'],
};
