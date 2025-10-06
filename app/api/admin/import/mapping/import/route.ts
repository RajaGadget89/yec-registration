import { NextRequest, NextResponse } from "next/server";
import { validateSuperAdminAccess } from "@/lib/auth/admin-auth";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

function isValidMapping(payload: any): boolean {
  if (!payload) return false;
  if (!Array.isArray(payload.mappings)) return false;
  // basic shape check for entries; allow missing/ignored systemField
  return payload.mappings.every((m: any) => typeof m.csvColumn === "string");
}

export async function POST(request: NextRequest) {
  try {
    const adminValidation = await validateSuperAdminAccess(request);
    if (!adminValidation.valid) {
      return NextResponse.json(
        { error: "Unauthorized", message: adminValidation.error },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { sessionId, mappingConfig } = body || {};
    if (!sessionId || !mappingConfig) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "sessionId and mappingConfig are required",
        },
        { status: 400 },
      );
    }
    if (!isValidMapping(mappingConfig)) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message:
            "Invalid mappingConfig format: mappings must be an array of items with csvColumn",
        },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();
    const { data: session, error: sessionError } = await supabase
      .from("import_sessions")
      .select("id, admin_user_id, metadata")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Not Found", message: "Session not found" },
        { status: 404 },
      );
    }

    const newMetadata = {
      ...session.metadata,
      mapping_config: mappingConfig,
      mapping_imported_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("import_sessions")
      .update({ metadata: newMetadata })
      .eq("id", sessionId);

    if (updateError) {
      return NextResponse.json(
        {
          error: "Internal Server Error",
          message: `Failed to save mapping: ${updateError.message}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("mapping/import error", err);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: err?.message || "Unexpected error",
      },
      { status: 500 },
    );
  }
}
