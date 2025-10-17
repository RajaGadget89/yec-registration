import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../../../lib/supabase/server";
import { audit } from "../../../../../../../lib/audit";
import { formImportService } from "../../../../../../../lib/form-system/formImportService";

interface RouteParams {
  params: {
    jobId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { jobId } = params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has super admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get import job items
    const items = await formImportService.getImportJobItems(
      jobId,
      status || undefined,
    );

    // Log access
    await audit.logAccess({
      action: "GET",
      method: "GET",
      resource: `form-import-jobs-${jobId}-items`,
      result: "success",
      request_id: crypto.randomUUID(),
      meta: { job_id: jobId, items_requested: true, status_filter: status },
    });

    return NextResponse.json({
      success: true,
      items,
    });
  } catch (error) {
    console.error("Error in import job items API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
