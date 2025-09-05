import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(_request: NextRequest) {
  try {
    // Create service client for database access
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

    // Test simple query first
    const { data: testData, error: testError } = await supabase
      .from("admin_users")
      .select("count")
      .limit(1);

    if (testError) {
      return NextResponse.json(
        {
          error: "Database connection failed",
          details: testError.message,
          code: testError.code,
          hint: testError.hint,
        },
        { status: 500 },
      );
    }

    // Test with specific email
    const { data: userData, error: userError } = await supabase
      .from("admin_users")
      .select("*")
      .eq("email", "raja.gadgets89@gmail.com")
      .limit(1);

    return NextResponse.json({
      connection: "success",
      testQuery: {
        data: testData,
        error: null,
      },
      userQuery: {
        data: userData,
        error: userError?.message || null,
        count: userData?.length || 0,
      },
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
