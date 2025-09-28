import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getAppUrl } from '../../../../lib/env';
import { hasBusinessRole } from '../../../../lib/rbac';
import { safeLogAccess } from '../../../../lib/audit/safeAudit';
import { cookies } from 'next/headers';

export const dynamic = "force-dynamic";

/**
 * GET /api/checker/verify
 * Server-side magic link verification for checker admin
 * This follows the same pattern as the traditional admin authentication
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token');
  const type = searchParams.get('type');
  const next = searchParams.get('next') || '/checker/scan'; // Default redirect to checker scan page

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => cookieStore.set(name, value, options),
        remove: (name, options) => cookieStore.set(name, '', { ...options, expires: new Date(0) }),
      },
    }
  );

  let sessionData;
  const authToken = token_hash; // For magiclink, token_hash is the token itself

  if (authToken && type) {
    console.log("[checker/verify] using server-side OTP flow", {
      tokenType: "token",
      type: type,
      token: token_hash,
      url: request.url,
      searchParams: Object.fromEntries(searchParams.entries()),
    });
    const { data, error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash: authToken,
    });

    if (error) {
      console.error("[checker/verify] OTP verification failed:", error);
      void safeLogAccess({
        action: 'checker_verify_otp',
        method: 'GET',
        resource: 'checker/verify',
        result: 'failure',
        reason: `OTP verification failed: ${error.message}`,
        request_id: request.headers.get('x-request-id') || 'unknown',
        src_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        user_agent: request.headers.get('user-agent') || undefined,
        meta: { error: error.message, tokenType: type },
      });
      return NextResponse.redirect(
        new URL(
          `/checker/login?error=verify_failed&message=${encodeURIComponent(error.message)}`,
          getAppUrl(),
        ),
        303,
      );
    }

    sessionData = data;
  } else {
    console.error("[checker/verify] missing token or type for server-side OTP flow");
    void safeLogAccess({
      action: 'checker_verify_otp',
      method: 'GET',
      resource: 'checker/verify',
      result: 'failure',
      reason: 'Missing token or type',
      request_id: request.headers.get('x-request-id') || 'unknown',
      src_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      meta: { tokenPresent: !!authToken, typePresent: !!type },
    });
    return NextResponse.redirect(new URL("/checker/login?error=invalid_link", getAppUrl()), 303);
  }

  if (!sessionData?.session) {
    console.error("[checker/verify] no session established after OTP verification");
    void safeLogAccess({
      action: 'checker_verify_otp',
      method: 'GET',
      resource: 'checker/verify',
      result: 'failure',
      reason: 'No session established',
      request_id: request.headers.get('x-request-id') || 'unknown',
      src_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
    });
    return NextResponse.redirect(
      new URL("/checker/login?error=no_session", getAppUrl()),
      303,
    );
  }

  console.log(
    "[checker/verify] session established for user:",
    sessionData.session.user.email,
  );

  // Verify the user has the 'checker_admin' business role
  const userEmail = sessionData.session.user.email;
  if (!userEmail || !(await hasBusinessRole(userEmail, 'checker_admin'))) {
    console.error("[checker/verify] user not a checker admin:", userEmail);
    void safeLogAccess({
      action: 'checker_verify_otp',
      method: 'GET',
      resource: 'checker/verify',
      result: 'failure',
      reason: 'User not a checker admin',
      request_id: request.headers.get('x-request-id') || 'unknown',
      src_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      meta: { userEmail: userEmail },
    });
    return NextResponse.redirect(
      new URL("/checker/login?error=not_checker_admin", getAppUrl()),
      303,
    );
  }

  console.log("[checker/verify] checker admin access confirmed for:", userEmail);

  // Set checker-email cookie for checker access (similar to admin-email cookie)
  const response = NextResponse.next();
  response.cookies.set('checker-email', userEmail, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  console.log("[checker/verify] checker-email cookie set for:", userEmail);

  // Log successful authentication
  void safeLogAccess({
    action: 'checker_verify_otp',
    method: 'GET',
    resource: 'checker/verify',
    result: 'success',
    request_id: request.headers.get('x-request-id') || 'unknown',
    src_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    user_agent: request.headers.get('user-agent') || undefined,
    meta: { userEmail: userEmail },
  });

  // Create redirect response
  const baseUrl = getAppUrl();
  const fullRedirectUrl = new URL(next, baseUrl);

  console.log("[checker/verify] redirect URL construction:", {
    next,
    baseUrl,
    fullRedirectUrl: fullRedirectUrl.toString(),
  });

  console.log(
    "[checker/verify] authentication successful, redirecting to:",
    fullRedirectUrl.toString(),
  );

  // Redirect to the checker scan page
  return NextResponse.redirect(fullRedirectUrl, 303);
}