import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../../lib/supabase/server";
import { audit } from "../../../../../../lib/audit";
import { formImportService } from "../../../../../../lib/form-system/formImportService";

interface RouteParams {
  params: {
    jobId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { jobId } = params;

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

    // Get import job status
    const job = await formImportService.getImportJobStatus(jobId);

    if (!job) {
      return NextResponse.json(
        { error: "Import job not found" },
        { status: 404 },
      );
    }

    // Log access
    await audit.logAccess({
      action: "GET",
      method: "GET",
      resource: `form-import-jobs-${jobId}`,
      result: "success",
      request_id: crypto.randomUUID(),
      meta: { job_id: jobId, job_status_requested: true },
    });

    return NextResponse.json({
      success: true,
      job,
    });
  } catch (error) {
    console.error("Error in import job API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { jobId } = params;

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

    // Delete import job
    const result = await formImportService.deleteImportJob(jobId);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    // Log access
    await audit.logAccess({
      action: "DELETE",
      method: "DELETE",
      resource: `form-import-jobs-${jobId}`,
      result: "success",
      request_id: crypto.randomUUID(),
      meta: { job_id: jobId, job_deleted: true },
    });

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Error deleting import job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
