import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";

export async function GET() {
  try {
    const supabase = getSupabaseServiceClient();

    // Test the token generation function
    const { data: tokenData, error: tokenError } = await supabase.rpc(
      "generate_admin_invitation_token",
    );

    if (tokenError) {
      return NextResponse.json(
        {
          error: "Token generation failed",
          details: tokenError,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      token: tokenData,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
