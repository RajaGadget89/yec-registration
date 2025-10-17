import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../lib/supabase/server";
import { audit } from "../../../../../lib/audit";
import { formImportService } from "../../../../../lib/form-system/formImportService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const formKey = searchParams.get("form_key");

    if (!formKey) {
      return NextResponse.json(
        { error: "Form key is required" },
        { status: 400 },
      );
    }

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

    // Get import jobs for the form
    const jobs = await formImportService.getFormImportJobs(formKey);

    // Log access
    await audit.logAccess({
      action: "GET",
      method: "GET",
      resource: "form-import-jobs",
      result: "success",
      request_id: crypto.randomUUID(),
      meta: { form_key: formKey, jobs_requested: true },
    });

    return NextResponse.json({
      success: true,
      jobs,
    });
  } catch (error) {
    console.error("Error in form import jobs API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
