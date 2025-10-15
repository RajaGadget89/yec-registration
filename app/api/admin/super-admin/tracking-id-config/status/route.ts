import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { audit } from "@/app/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has super admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all form types
    const { data: formTypes, error: formTypesError } = await supabase
      .from("form_types")
      .select("form_key, name, created_at, updated_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (formTypesError) {
      console.error("Error fetching form types:", formTypesError);
      return NextResponse.json(
        { error: "Failed to fetch form types" },
        { status: 500 }
      );
    }

    // Get tracking ID configurations
    const { data: trackingConfigs, error: trackingError } = await supabase
      .from("form_types")
      .select(`
        form_key,
        config->registration_id_config as registration_id_config
      `)
      .eq("is_active", true);

    if (trackingError) {
      console.error("Error fetching tracking configs:", trackingError);
      return NextResponse.json(
        { error: "Failed to fetch tracking configurations" },
        { status: 500 }
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
        { status: 500 }
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
    const trackingStatus = formTypes?.map((form) => {
      const trackingConfig = trackingConfigs?.find(tc => tc.form_key === form.form_key);
      const registrationIdConfig = trackingConfig?.registration_id_config;
      const hasConfig = !!registrationIdConfig;
      const currentSequence = sequenceMap.get(form.form_key);
      const lastGenerated = lastGeneratedMap.get(form.form_key);

      return {
        form_key: form.form_key,
        form_name: form.name,
        has_config: hasConfig,
        current_sequence: currentSequence,
        last_generated: lastGenerated?.tracking_id,
        config: hasConfig ? {
          prefix: registrationIdConfig.prefix,
          sequence_start: registrationIdConfig.sequence_start,
          sequence_length: registrationIdConfig.sequence_length,
          format: registrationIdConfig.format,
          is_active: registrationIdConfig.is_active,
        } : undefined,
      };
    }) || [];

    // Log access
    await audit.logAccess({
      requestId: crypto.randomUUID(),
      actor: user.id,
      route: "/api/admin/super-admin/tracking-id-config/status",
      meta: { form_count: formTypes?.length || 0 },
    });

    return NextResponse.json({
      success: true,
      trackingStatus,
    });
  } catch (error) {
    console.error("Error in tracking ID status API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
