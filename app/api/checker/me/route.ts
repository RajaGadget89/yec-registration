import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isCheckinSystemEnabled } from "../../../lib/features";
import { hasBusinessRole } from "../../../lib/rbac";
import { safeLogAccess } from "../../../lib/audit/safeAudit";

export const dynamic = "force-dynamic";

function getProjectRef() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return new URL(url).hostname.split(".")[0];
}

function readModernCookie(req: NextRequest) {
  try {
    const name = `sb-${getProjectRef()}-auth-token`;
    const raw = req.cookies.get(name)?.value;
    if (!raw) return null;

    // value often looks like "base64-<b64>"
    const b64 = raw.startsWith("base64-") ? raw.slice(7) : raw;
    const jsonStr = Buffer.from(b64, "base64").toString("utf8");

    // Clean up any trailing characters that might cause JSON parsing issues
    const cleanJsonStr = jsonStr
      .replace(/[^\x20-\x7E]*$/, "")
      .replace(/[%]+$/, "");

    // Try to find the last complete JSON object
    const lastBrace = cleanJsonStr.lastIndexOf("}");
    if (lastBrace === -1) return null;

    const truncatedJson = cleanJsonStr.substring(0, lastBrace + 1);
    const json = JSON.parse(truncatedJson);

    const access_token = json?.access_token;
    const refresh_token = json?.refresh_token;
    if (access_token && refresh_token) {
      return { access_token, refresh_token, source: "modern" as const };
    }
  } catch {
    // ignore; will fallback to legacy
  }
  return null;
}

function readLegacyCookies(req: NextRequest) {
  const access_token = req.cookies.get("sb-access-token")?.value;
  const refresh_token = req.cookies.get("sb-refresh-token")?.value;
  if (access_token && refresh_token) {
    return { access_token, refresh_token, source: "legacy" };
  }
  return null;
}

function pickTokens(req: NextRequest) {
  return readModernCookie(req) ?? readLegacyCookies(req) ?? { source: null };
}

interface AuthTokens {
  access_token?: string;
  refresh_token?: string;
  source?: string;
}

export async function GET(request: NextRequest) {
  // Check feature flag
  if (!isCheckinSystemEnabled()) {
    return NextResponse.json({ error: 'Check-in system is not available' }, { status: 404 });
  }

  try {
    // Get checker-email cookie (same as traditional admin system)
    const checkerEmail = request.cookies.get("checker-email")?.value;
    
    if (!checkerEmail) {
      void safeLogAccess({
        action: 'checker_me_access',
        method: 'GET',
        resource: 'api/checker/me',
        result: 'failure',
        reason: 'No checker-email cookie found',
        request_id: request.headers.get('x-request-id') || 'unknown',
        src_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        user_agent: request.headers.get('user-agent') || undefined,
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client for database queries (same as traditional admin system)
    const { getSupabaseServiceClient } = await import("../../../lib/supabase-server");
    const supabase = getSupabaseServiceClient();

    // Fetch admin user details
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, business_roles')
      .eq('email', checkerEmail)
      .single();

    if (adminError || !adminUser) {
      void safeLogAccess({
        action: 'checker_me_access',
        method: 'GET',
        resource: 'api/checker/me',
        result: 'failure',
        reason: 'Admin user not found or database error',
        request_id: request.headers.get('x-request-id') || 'unknown',
        src_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        user_agent: request.headers.get('user-agent') || undefined,
        meta: { checkerEmail, adminError: adminError?.message },
      });
      return NextResponse.json({ error: 'Admin user not found' }, { status: 404 });
    }

    // Check if the admin has the 'checker_admin' business role
    if (!(await hasBusinessRole(checkerEmail, 'checker_admin'))) {
      void safeLogAccess({
        action: 'checker_me_access',
        method: 'GET',
        resource: 'api/checker/me',
        result: 'failure',
        reason: 'User does not have checker_admin business role',
        request_id: request.headers.get('x-request-id') || 'unknown',
        src_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        user_agent: request.headers.get('user-agent') || undefined,
        meta: { checkerEmail, businessRoles: adminUser.business_roles },
      });
      return NextResponse.json({ error: 'Forbidden: Not a checker admin' }, { status: 403 });
    }

    void safeLogAccess({
      action: 'checker_me_access',
      method: 'GET',
      resource: 'api/checker/me',
      result: 'success',
      request_id: request.headers.get('x-request-id') || 'unknown',
      src_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      meta: { checkerEmail },
    });

    return NextResponse.json({
      id: adminUser.id,
      email: adminUser.email,
      business_roles: adminUser.business_roles,
    });
  } catch (error) {
    console.error('Error in /api/checker/me:', error);
    void safeLogAccess({
      action: 'checker_me_access',
      method: 'GET',
      resource: 'api/checker/me',
      result: 'error',
      reason: 'Internal server error',
      request_id: request.headers.get('x-request-id') || 'unknown',
      src_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      meta: { error: (error as Error).message },
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}