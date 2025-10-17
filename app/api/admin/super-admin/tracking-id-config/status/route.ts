import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../lib/supabase/server";
import { audit } from "../../../../../lib/audit";
import { hasRoleFromRequest } from "../../../../../lib/auth-utils.server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";

    if (!(await hasRoleFromRequest(request, "super_admin"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const supabase = await getSupabaseServerClient();
    const {
      data: { user: _user },
    } = await supabase.auth.getUser();

    // Get all form types with search filter
    let formTypesQuery = supabase
      .from("form_types")
      .select("form_key, name, created_at, updated_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (search) {
      formTypesQuery = formTypesQuery.ilike("name", `%${search}%`);
    }

    const { data: formTypes, error: formTypesError } = await formTypesQuery;

    if (formTypesError) {
      console.error("Error fetching form types:", formTypesError);
      return NextResponse.json(
        { error: "Failed to fetch form types" },
        { status: 500 },
      );
    }

    // Get tracking ID configurations from normalized table
    const { data: trackingConfigs, error: trackingError } = await supabase
      .from("form_tracking_configs")
      .select(
        "form_key, prefix, sequence_start, sequence_length, format, is_active, updated_at",
      );

    if (trackingError) {
      console.error("Error fetching tracking configs:", trackingError);
      return NextResponse.json(
        { error: "Failed to fetch tracking configurations" },
        { status: 500 },
      );
    }

    // Get current sequence numbers from batch counters
    const { data: batchCounters, error: countersError } = await supabase
      .from("form_batch_counters")
      .select("form_key, counter");

    if (countersError) {
      console.error("Error fetching batch counters:", countersError);
      return NextResponse.json(
        { error: "Failed to fetch sequence counters" },
        { status: 500 },
      );
    }

    // Create sequence map
    const sequenceMap = new Map();
    batchCounters?.forEach((counter) => {
      sequenceMap.set(counter.form_key, counter.counter);
    });

    // Get last generated tracking IDs
    const { data: lastGenerated, error: lastGeneratedError } = await supabase
      .from("form_registrations")
      .select("form_key, tracking_id, created_at")
      .order("created_at", { ascending: false });

    if (lastGeneratedError) {
      console.error("Error fetching last generated IDs:", lastGeneratedError);
    }

    // Create last generated map
    const lastGeneratedMap = new Map();
    lastGenerated?.forEach((reg) => {
      if (!lastGeneratedMap.has(reg.form_key)) {
        lastGeneratedMap.set(reg.form_key, {
          tracking_id: reg.tracking_id,
          created_at: reg.created_at,
        });
      }
    });

    // Build response with tracking status for each form
    const trackingStatus =
      formTypes?.map((form) => {
        const registrationIdConfig = trackingConfigs?.find(
          (tc) => tc.form_key === form.form_key,
        );
        const hasConfig = !!registrationIdConfig;
        const currentSequence = sequenceMap.get(form.form_key);
        const lastGenerated = lastGeneratedMap.get(form.form_key);

        return {
          id: form.form_key, // Use form_key as ID for consistency
          form_key: form.form_key,
          form_name: form.name,
          prefix: registrationIdConfig?.prefix || "",
          sequence_start: registrationIdConfig?.sequence_start || 1,
          created_at: form.created_at,
          updated_at: form.updated_at,
          has_config: hasConfig,
          current_sequence: currentSequence,
          last_generated: lastGenerated?.tracking_id,
          config: hasConfig
            ? {
                prefix: registrationIdConfig.prefix,
                sequence_start: registrationIdConfig.sequence_start,
                sequence_length: registrationIdConfig.sequence_length,
                format: registrationIdConfig.format,
                is_active: registrationIdConfig.is_active,
              }
            : undefined,
        };
      }) || [];

    // Apply status filter
    let filteredStatus = trackingStatus;
    if (status === "configured") {
      filteredStatus = trackingStatus.filter((item) => item.has_config);
    } else if (status === "not_configured") {
      filteredStatus = trackingStatus.filter((item) => !item.has_config);
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedStatus = filteredStatus.slice(startIndex, endIndex);
    const totalItems = filteredStatus.length;
    const totalPages = Math.ceil(totalItems / limit);

    // Log access
    await audit.logAccess({
      action: "get_tracking_id_status",
      method: "GET",
      resource: "form_tracking_id_status",
      result: "success",
      request_id: crypto.randomUUID(),
      meta: { form_count: formTypes?.length || 0 },
    });

    return NextResponse.json({
      success: true,
      trackingIdConfigs: paginatedStatus,
      totalItems,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error in tracking ID status API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
