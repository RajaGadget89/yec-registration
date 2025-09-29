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
    const { getSupabaseServiceClient } = await import("./app/lib/supabase-server");
    const supabase = getSupabaseServiceClient();
    
    const { data: adminUser, error } = await supabase
      .from("admin_users")
      .select("is_active, role")
      .eq("email", email.toLowerCase())
      .eq("is_active", true)
      .single();
    
    if (!error && adminUser) {
      return {
        is_active: (adminUser as any).is_active,
        role: (adminUser as any).role
      };
    }
    
    // Fall back to RBAC system when database is unavailable
    console.log(`[auth-debug] middleware: database query failed for ${email}, falling back to RBAC`);
    const { getRolesForEmail } = await import("./app/lib/rbac");
    const roles = getRolesForEmail(email);
    
    if (roles.size > 0) {
      console.log(`[auth-debug] middleware: RBAC fallback successful for ${email}, roles:`, Array.from(roles));
      return {
        is_active: true,
        role: roles.has("super_admin") ? "super_admin" : "admin"
      };
    }
    
    console.log(`[auth-debug] middleware: RBAC fallback failed for ${email}, no roles found`);
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
    const { getSupabaseServiceClient } = await import("./app/lib/supabase-server");
    const supabase = getSupabaseServiceClient();
    
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
  // Debug: Add header at the very beginning
  const response = NextResponse.next();
  response.headers.set('x-debug-start', 'middleware-started');
  
  console.log('[middleware] EXECUTING middleware for:', request.url);
  console.log('[middleware] Environment check:', {
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasNextPublicSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseUrl: process.env.SUPABASE_URL?.substring(0, 50) + '...',
    nextPublicSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50) + '...'
  });
  const { pathname } = request.nextUrl;
  
  // --- UAT-04S: allow public accept page with token ---
  // Allow unauthenticated access to the invite accept page
  if (pathname === "/admin/accept" && request.nextUrl.searchParams.has("token")) {
    return NextResponse.next();
  }
  
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
    '/checker/login',
    '/checker/verify',
    '/checker/callback',
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

  // Response object already created at the beginning for debug headers

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

    // 2. Try Supabase session first (fast path) - with robust cookie parsing
    let session: any = null;
    let sessionError: any = null;
    
    try {
      // Use the same robust cookie parsing logic as other parts of the app
      const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
      const authCookieName = `sb-${projectRef}-auth-token`;
      const authCookie = request.cookies.get(authCookieName)?.value;
      
      console.log('[middleware] Cookie debug:', {
        hasAuthCookie: !!authCookie,
        authCookieName: authCookieName,
        authCookieValue: authCookie?.substring(0, 50) + '...',
      });
      
      if (authCookie) {
        console.log('[middleware] Found auth cookie, attempting to parse');
        
        // Parse the cookie using the same logic as /api/admin/me
        const b64 = authCookie.startsWith("base64-") ? authCookie.slice(7) : authCookie;
        const jsonStr = Buffer.from(b64, "base64").toString("utf8");
        
        // Clean up any trailing characters that might cause JSON parsing issues
        const cleanJsonStr = jsonStr
          .replace(/[^\x20-\x7E]*$/, "")
          .replace(/[%]+$/, "");
        
        // Try to find the last complete JSON object
        const lastBrace = cleanJsonStr.lastIndexOf("}");
        if (lastBrace !== -1) {
          const truncatedJson = cleanJsonStr.substring(0, lastBrace + 1);
          const json = JSON.parse(truncatedJson);
          
          if (json?.access_token && json?.refresh_token) {
            // Create Supabase client and set session
            const supabase = createServerClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              {
                cookies: {
                  get: (key: string) => request.cookies.get(key)?.value,
                  set: (key, value, options) => {
                    response.cookies.set(key, value, options);
                  },
                  remove: (key, options) => {
                    response.cookies.set(key, "", { ...options, expires: new Date(0) });
                  },
                },
              },
            );
            
            const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
              access_token: json.access_token,
              refresh_token: json.refresh_token,
            });
            
            session = sessionData?.session;
            sessionError = sessionErr;
          }
        }
      }
    } catch (error) {
      console.log('[middleware] Cookie parsing error (non-fatal):', error);
      // Continue without session - this is expected for malformed cookies
    }
    
    console.log('[middleware] Session debug:', {
      hasSession: !!session,
      sessionError: sessionError?.message,
      sessionUser: session?.user?.email
    });

    let userEmail: string | undefined;
    let userRole: string | undefined;
    let isUserActive: boolean = false;
    let authMethod: 'supabase-session' | 'admin-email-cookie' | 'checker-email-cookie' | 'none' = 'none';
    
    // Debug: Track middleware execution
    response.headers.set('x-debug-middleware', 'executing');

    if (!sessionError && session) {
      // Debug: Track Supabase session path
      response.headers.set('x-debug-supabase', 'has-session');
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
    } else {
      // Debug: Track no Supabase session path
      response.headers.set('x-debug-supabase', 'no-session');
    }

    // Debug: Track authMethod before fallback
    response.headers.set('x-debug-authmethod', authMethod);

    // 3. Fallback: Check admin-email cookie (consistent with API authentication)
    if (authMethod === 'none') {
      const adminEmail = request.cookies.get("admin-email")?.value;
      // Debug: Add header to track cookie detection
      response.headers.set('x-debug-admin-email', adminEmail ? 'found' : 'not-found');
      if (adminEmail) {
        console.log(`[auth-debug] middleware: checking admin-email cookie: ${adminEmail}`);
        try {
          response.headers.set('x-debug-cookie-lookup', 'attempting');
          const cookieUser = await getCurrentUserFromCookie(adminEmail);
          if (cookieUser) {
            response.headers.set('x-debug-cookie-lookup', 'success');
            userEmail = adminEmail.toLowerCase();
            userRole = cookieUser.role;
            isUserActive = cookieUser.is_active;
            authMethod = 'admin-email-cookie';
            console.log(`[auth-debug] middleware: admin-email cookie auth successful: ${userEmail}, role: ${userRole}`);
          } else {
            response.headers.set('x-debug-cookie-lookup', 'user-not-found');
            console.log(`[auth-debug] middleware: admin-email cookie user not found: ${adminEmail}`);
          }
        } catch (error) {
          response.headers.set('x-debug-cookie-lookup', 'error');
          console.error(`[auth-debug] middleware: error checking admin-email cookie:`, error);
        }
      } else {
        console.log(`[auth-debug] middleware: no admin-email cookie found`);
      }
    }

    // 4. Check for checker authentication (for /checker routes) - PRIORITY CHECK
    if (pathname.startsWith('/checker')) {
      const checkerEmail = request.cookies.get("checker-email")?.value;
      response.headers.set('x-debug-checker-email', checkerEmail ? 'found' : 'not-found');
      
      if (checkerEmail) {
        console.log(`[auth-debug] middleware: checking checker-email cookie: ${checkerEmail}`);
        try {
          // Check if user has checker_admin business role
          const { hasBusinessRole } = await import('./app/lib/rbac');
          const isCheckerAdmin = await hasBusinessRole(checkerEmail, 'checker_admin');
          
          if (isCheckerAdmin) {
            response.headers.set('x-debug-checker-lookup', 'success');
            userEmail = checkerEmail.toLowerCase();
            userRole = 'checker_admin';
            isUserActive = true;
            authMethod = 'checker-email-cookie';
            console.log(`[auth-debug] middleware: checker-email cookie auth successful: ${userEmail}`);
          } else {
            response.headers.set('x-debug-checker-lookup', 'not-checker-admin');
            console.log(`[auth-debug] middleware: checker-email cookie user not a checker admin: ${checkerEmail}`);
          }
        } catch (error) {
          response.headers.set('x-debug-checker-lookup', 'error');
          console.error(`[auth-debug] middleware: error checking checker-email cookie:`, error);
        }
      } else {
        console.log(`[auth-debug] middleware: no checker-email cookie found`);
      }
    }

    // Debug: Track final authMethod
    response.headers.set('x-debug-final-authmethod', authMethod);
    
    // 5. Decision logic (same as page guard)
    if (authMethod === 'none') {
      if (AUTH_TRACE) {
        console.log(`[auth-debug] middleware: no valid session found`);
      }
      // No session, redirect to appropriate login page
      const loginPath = pathname.startsWith('/checker') ? '/checker/login' : '/admin/login';
      const redirectResponse = NextResponse.redirect(
        new URL(`${loginPath}?next=${encodeURIComponent(pathname)}`, request.url),
        307
      );
      redirectResponse.headers.set('x-admin-guard', 'deny:no-session');
      // Copy debug headers from our response to the redirect response
      for (const [key, value] of response.headers.entries()) {
        if (key.startsWith('x-debug-')) {
          redirectResponse.headers.set(key, value);
        }
      }
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

    // Authorize based on route and role
    if (pathname.startsWith('/checker')) {
      // Checker routes require checker_admin role
      if (userRole !== 'checker_admin') {
        if (AUTH_TRACE) {
          console.log(`[auth-debug] middleware deny checker route`, { userEmail, userRole });
        }
        const forbiddenResponse = new NextResponse("Forbidden", { status: 403 });
        forbiddenResponse.headers.set('x-admin-guard', 'deny:not-checker-admin');
        return forbiddenResponse;
      }
    } else if (pathname.startsWith('/admin')) {
      // Admin routes require super_admin or admin role
      const isAdminRole = userRole === 'super_admin' || userRole === 'admin';
      const isSuperOnlyPath = pathname.startsWith('/admin/management');
      if (!isAdminRole || (isSuperOnlyPath && userRole !== 'super_admin')) {
        if (AUTH_TRACE) {
          console.log(`[auth-debug] middleware deny admin route`, { userEmail, userRole, isSuperOnlyPath });
        }
        const forbiddenResponse = new NextResponse("Forbidden", { status: 403 });
        forbiddenResponse.headers.set('x-admin-guard', isSuperOnlyPath ? 'deny:super-only' : 'deny:not-admin');
        return forbiddenResponse;
      }
    }

    // Check business role permissions for specific routes
    if (userEmail && pathname.includes('/management') && userRole === 'admin') {
      try {
        const { getBusinessRoles } = await import('./app/lib/rbac');
        const businessRoles = await getBusinessRoles(userEmail);
        if (!businessRoles.includes('user_profile')) {
          if (AUTH_TRACE) {
            console.log(`[auth-debug] middleware: insufficient business role for management`, { userEmail, businessRoles });
          }
          const redirectResponse = NextResponse.redirect(
            new URL('/admin/login?unauthorized=1', request.url),
            307
          );
          redirectResponse.headers.set('x-admin-guard', 'deny:insufficient-business-role');
          return redirectResponse;
        }
      } catch (error) {
        if (AUTH_TRACE) {
          console.log(`[auth-debug] middleware: business role check failed`, error);
        }
        // Continue with normal flow if business role check fails
      }
    }

    // User is authenticated, active, and super_admin, allow access
    response.headers.set('x-admin-guard', `ok:${authMethod}`);
    
    if (AUTH_TRACE) {
      console.log(`[auth-debug] middleware: allowing access (${authMethod})`);
    }
    
    return response;

  } catch (error) {
    console.log(`[auth-debug] middleware: unexpected error:`, error);
    console.log(`[auth-debug] middleware: error stack:`, error instanceof Error ? error.stack : 'No stack trace');
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
 * Exclude auth callback routes to prevent interference with authentication flow
 */
export const config = {
  matcher: [
    '/admin',
    '/admin/((?!login|logout|callback).*)', // Exclude login, logout, and callback routes
    '/checker/((?!login|callback|verify).*)', // Exclude login, callback, and verify routes
  ],
};
