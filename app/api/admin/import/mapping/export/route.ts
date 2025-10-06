import { NextRequest, NextResponse } from "next/server";
import { validateSuperAdminAccess } from "@/lib/auth/admin-auth";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const adminValidation = await validateSuperAdminAccess(request);
    if (!adminValidation.valid) {
      return NextResponse.json(
        { error: "Unauthorized", message: adminValidation.error },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json(
        { error: "Bad Request", message: "sessionId is required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();
    const { data: session, error } = await supabase
      .from("import_sessions")
      .select("id, admin_user_id, metadata")
      .eq("id", sessionId)
      .eq("admin_user_id", adminValidation.user?.id)
      .single();

    if (error || !session) {
      return NextResponse.json(
        { error: "Not Found", message: "Session not found" },
        { status: 404 },
      );
    }

    const mapping = session.metadata?.mapping_config;
    if (!mapping) {
      return NextResponse.json(
        { error: "Not Found", message: "No mapping_config in session" },
        { status: 404 },
      );
    }

    const payload = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      sessionId,
      mappings: mapping.mappings || [],
      transformations: mapping.transformations || {},
      sourceInfo: session.metadata?.file_info || null,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="mapping-${sessionId}.json"`,
      },
    });
  } catch (err: any) {
    console.error("mapping/export error", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
