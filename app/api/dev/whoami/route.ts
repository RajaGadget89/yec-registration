import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getServiceRoleClient } from "../../../lib/supabase-server";

// Only available in development
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  // Return 404 in production
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  try {
    // Note: res variable was created but not used

    // Get Supabase client with cookie management
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll() {
            // No-op for read-only operation
          },
        },
      },
    );

    // Get current user from session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.email) {
      return NextResponse.json(
        {
          env: "development",
          email: null,
          isAdmin: false,
          hasAccessCookie: !!req.cookies.get("sb-access-token"),
          hasRefreshCookie: !!req.cookies.get("sb-refresh-token"),
          error: userError?.message || "No user found",
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    // Check if user is admin using service role client
    const svc = getServiceRoleClient();
    const { data: admins, error: adminError } = await svc
      .from("admin_users")
      .select("id,email,is_active,role")
      .ilike("email", user.email)
      .eq("is_active", true)
      .limit(1);

    const isAdmin = admins?.length === 1;

    return NextResponse.json(
      {
        env: "development",
        email: user.email,
        isAdmin,
        hasAccessCookie: !!req.cookies.get("sb-access-token"),
        hasRefreshCookie: !!req.cookies.get("sb-refresh-token"),
        adminError: adminError?.message || null,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("[whoami] error:", error);
    return NextResponse.json(
      {
        env: "development",
        email: null,
        isAdmin: false,
        hasAccessCookie: !!req.cookies.get("sb-access-token"),
        hasRefreshCookie: !!req.cookies.get("sb-refresh-token"),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
