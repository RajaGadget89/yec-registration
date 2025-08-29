import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { guardTestEndpoint } from "@/app/lib/test-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const guard = guardTestEndpoint(request);
  if (!guard.allowed) {
    return new Response(guard.message, { status: guard.status });
  }

  try {
    console.log("[db-check] Starting database check");

    // 2. Create admin client with Service Role
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // 3. Check if admin_users table exists
    const { data: adminUsers, error: adminUsersError } = await adminClient
      .from("admin_users")
      .select("*")
      .limit(1);

    if (adminUsersError) {
      console.error("[db-check] Error querying admin_users:", adminUsersError);
      return NextResponse.json(
        {
          ok: false,
          error: "admin_users table error",
          details: adminUsersError.message,
        },
        { status: 500 },
      );
    }

    // 4. Check if admin_invitations table exists
    const { data: invitations, error: invitationsError } = await adminClient
      .from("admin_invitations")
      .select("*")
      .limit(1);

    if (invitationsError) {
      console.error(
        "[db-check] Error querying admin_invitations:",
        invitationsError,
      );
      return NextResponse.json(
        {
          ok: false,
          error: "admin_invitations table error",
          details: invitationsError.message,
        },
        { status: 500 },
      );
    }

    // 5. Check if email_outbox table exists
    const { data: emails, error: emailsError } = await adminClient
      .from("email_outbox")
      .select("*")
      .limit(1);

    if (emailsError) {
      console.error("[db-check] Error querying email_outbox:", emailsError);
      return NextResponse.json(
        {
          ok: false,
          error: "email_outbox table error",
          details: emailsError.message,
        },
        { status: 500 },
      );
    }

    console.log("[db-check] Database check successful");

    return NextResponse.json({
      ok: true,
      tables: {
        admin_users: "exists",
        admin_invitations: "exists",
        email_outbox: "exists",
      },
      admin_users_count: adminUsers?.length || 0,
      invitations_count: invitations?.length || 0,
      emails_count: emails?.length || 0,
    });
  } catch (e: unknown) {
    console.error("[db-check] unexpected error:", e);
    const errorMessage =
      e instanceof Error ? e.message : "Unexpected error during database check";
    return NextResponse.json(
      { ok: false, reason: "UNEXPECTED_ERROR", message: errorMessage },
      { status: 500 },
    );
  }
}
