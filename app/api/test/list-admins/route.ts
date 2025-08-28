import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  // 1. Guard non-test environments
  if (process.env.E2E_TESTS !== "true" && process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  try {
    console.log("[list-admins] Starting admin list");
    
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

    // 3. Get all admin users
    const { data: adminUsers, error } = await adminClient
      .from("admin_users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[list-admins] Error querying admin_users:", error);
      return NextResponse.json({
        ok: false,
        error: "admin_users query error",
        details: error.message,
      }, { status: 500 });
    }

    console.log("[list-admins] Found admin users:", adminUsers?.length || 0);

    return NextResponse.json({
      ok: true,
      admin_users: adminUsers || [],
      count: adminUsers?.length || 0,
    });

  } catch (e: unknown) {
    console.error("[list-admins] unexpected error:", e);
    const errorMessage =
      e instanceof Error ? e.message : "Unexpected error during admin list";
    return NextResponse.json(
      { ok: false, reason: "UNEXPECTED_ERROR", message: errorMessage },
      { status: 500 },
    );
  }
}
