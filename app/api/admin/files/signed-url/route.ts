import { NextRequest, NextResponse } from "next/server";
import {
  withAdminApiGuard as _withAdminApiGuard,
  validateAdminAccess as _validateAdminAccess,
} from "@/app/lib/admin-guard-server";
import { generateSignedUrl } from "@/app/lib/uploadFileToSupabase";
import { getServiceRoleClient } from "@/app/lib/supabase-server";
import { getRolesForEmail } from "@/app/lib/rbac";

export const runtime = "nodejs";

// Unified handler for both GET and POST
async function handler(req: NextRequest) {
  const correlationId = req.headers.get("x-correlation-id");
  const isPost = req.method === "POST";

  // Parse input from GET params or POST body
  const url = new URL(req.url);
  const q = Object.fromEntries(url.searchParams.entries());
  const body = isPost ? await req.json().catch(() => ({})) : {};

  const registrationId = body.registrationId ?? q.registrationId;
  const path = body.path ?? q.path;
  const expires = Number(body.expires ?? q.expires ?? 900);

  console.log(
    `[SIGNED_URL_API] ${req.method} Request: registrationId=${registrationId}, path=${path}, correlationId=${correlationId}`,
  );

  if (!registrationId || !path) {
    console.log(
      `[SIGNED_URL_API] Missing parameters: registrationId=${registrationId}, path=${path}`,
    );
    return NextResponse.json(
      { error: "Missing parameters", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }

  // Auth check using database-first approach (same as /api/admin/me)
  const adminEmail = req.cookies.get("admin-email")?.value;
  if (!adminEmail) {
    console.log(`[SIGNED_URL_API] No admin email found in cookies`);
    return NextResponse.json(
      {
        error: "Unauthorized. Admin access required.",
        code: "ADMIN_ACCESS_REQUIRED",
      },
      { status: 401 },
    );
  }

  // Check database first, then fall back to RBAC system
  const supabase = getServiceRoleClient();
  let dbUser = null;
  try {
    console.log(
      `[SIGNED_URL_API] Querying database for email: ${adminEmail.toLowerCase()}`,
    );
    const { data: adminUser, error } = await supabase
      .from("admin_users")
      .select("*")
      .eq("email", adminEmail.toLowerCase())
      .single();

    console.log(`[SIGNED_URL_API] Database query result:`, {
      adminUser,
      error,
    });
    if (!error && adminUser) {
      dbUser = adminUser;
      console.log(`[SIGNED_URL_API] Found database user:`, {
        role: adminUser.role,
        is_active: adminUser.is_active,
      });
    }
  } catch (error) {
    console.log("[SIGNED_URL_API] Could not fetch database user info:", error);
  }

  // Authorize based on database record: allow both admin and super_admin roles
  if (!dbUser) {
    // Fall back to RBAC system when database is unavailable
    console.log(
      `[SIGNED_URL_API] Database user not found, checking RBAC system`,
    );
    const roles = getRolesForEmail(adminEmail);
    console.log(
      `[SIGNED_URL_API] RBAC roles for ${adminEmail}:`,
      Array.from(roles),
    );
    if (roles.size === 0) {
      console.log(
        `[SIGNED_URL_API] Admin access denied: Email not in admin allowlist`,
      );
      return NextResponse.json(
        {
          error: "Unauthorized. Admin access required.",
          code: "ADMIN_ACCESS_REQUIRED",
        },
        { status: 401 },
      );
    }
    // Create a mock dbUser for RBAC fallback
    dbUser = {
      id: "rbac-fallback",
      email: adminEmail,
      role: roles.has("super_admin") ? "super_admin" : "admin",
      is_active: true,
      status: "active",
      business_roles: [],
    };
    console.log(`[SIGNED_URL_API] Created RBAC fallback user:`, {
      role: dbUser.role,
    });
  }

  const role = dbUser.role; // 'admin' | 'super_admin'
  const active = dbUser.is_active !== false;

  if (!active) {
    console.log(`[SIGNED_URL_API] Admin access denied: Account suspended`);
    return NextResponse.json(
      {
        error: "Forbidden: Admin account is not active",
        code: "ADMIN_INACTIVE",
      },
      { status: 403 },
    );
  }

  if (role !== "admin" && role !== "super_admin") {
    console.log(`[SIGNED_URL_API] Admin access denied: Invalid role ${role}`);
    return NextResponse.json(
      {
        error: "Unauthorized. Admin access required.",
        code: "ADMIN_ACCESS_REQUIRED",
      },
      { status: 401 },
    );
  }

  console.log(
    `[SIGNED_URL_API] Admin access granted: ${adminEmail} (role: ${role})`,
  );

  // Validate the requested path belongs to this registration
  console.log(`[SIGNED_URL_API] Looking up registration ${registrationId}`);

  const { data, error } = await supabase
    .from("registrations")
    .select(
      "id, profile_image_url, chamber_card_url, payment_slip_url, badge_url",
    )
    .eq("id", registrationId)
    .maybeSingle();

  if (error) {
    console.error(`[SIGNED_URL_API] Database lookup error:`, error);
    return NextResponse.json(
      { error: "Lookup failed", code: "DB_ERROR" },
      { status: 500 },
    );
  }

  if (!data) {
    console.log(`[SIGNED_URL_API] Registration not found: ${registrationId}`);
    return NextResponse.json(
      { error: "Registration not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  console.log(`[SIGNED_URL_API] Registration found:`, {
    id: (data as any).id,
    profile_image_url: (data as any).profile_image_url,
    chamber_card_url: (data as any).chamber_card_url,
    payment_slip_url: (data as any).payment_slip_url,
    badge_url: (data as any).badge_url,
  });

  const allowedPaths = [
    (data as any).profile_image_url,
    (data as any).chamber_card_url,
    (data as any).payment_slip_url,
    (data as any).badge_url,
  ].filter(Boolean) as string[];

  console.log(`[SIGNED_URL_API] Allowed paths:`, allowedPaths);
  console.log(`[SIGNED_URL_API] Requested path: ${path}`);

  if (!allowedPaths.some((p) => p === path)) {
    console.log(
      `[SIGNED_URL_API] Path mismatch: requested=${path}, allowed=${allowedPaths}`,
    );
    return NextResponse.json(
      { error: "Path not owned by registration", code: "PATH_MISMATCH" },
      { status: 403 },
    );
  }

  try {
    console.log(`[SIGNED_URL_API] Generating signed URL for path: ${path}`);

    // Check if the path is already a full URL (from public bucket)
    if (path.startsWith("http")) {
      console.log(
        `[SIGNED_URL_API] Path is already a full URL, returning as-is`,
      );
      return NextResponse.json({ url: path });
    }

    // Use the requested expires time (default 900 seconds = 15 minutes)
    const signed = await generateSignedUrl(path, expires);
    console.log(
      `[SIGNED_URL_API] Successfully generated signed URL (expires: ${expires}s)`,
    );
    return NextResponse.json({ url: signed });
  } catch (error) {
    console.error("[SIGNED_URL_API] Failed to generate signed URL:", error);
    // Check if it's a "not found" error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes("not found") ||
      errorMessage.includes("does not exist")
    ) {
      return NextResponse.json(
        { error: "File not found", code: "NOT_FOUND", hint: errorMessage },
        { status: 404 },
      );
    }
    return NextResponse.json(
      {
        error: "Presign failed",
        code: "STORAGE_PRESIGN_FAILED",
        hint: errorMessage,
      },
      { status: 500 },
    );
  }
}

// Export both GET and POST handlers (authentication handled internally)
export const GET = handler;
export const POST = handler;
