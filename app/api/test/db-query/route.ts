import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { error: "Email parameter required" },
      { status: 400 },
    );
  }

  try {
    // Create service client for database access (same as middleware)
    const supabase = createServerClient(
      process.env.SUPABASE_URL!,
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

    return NextResponse.json({
      email: email,
      query: {
        table: "admin_users",
        select: "is_active, role",
        where: {
          email: email.toLowerCase(),
          is_active: true,
        },
      },
      result: {
        data: adminUser,
        error: error?.message || null,
      },
      success: !error && !!adminUser,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : null,
      },
      { status: 500 },
    );
  }
}
