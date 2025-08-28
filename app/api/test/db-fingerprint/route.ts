import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";


/**
 * DB Fingerprint endpoint - returns a compact, comparable signature of database state
 * Used for E2E test preflight checks to ensure correct DB target and migrations
 */
export async function GET(request: NextRequest) {
  // Security guard: Only allow in test environment
  const isTestEnv =
    process.env.NODE_ENV === "test" ||
    process.env.TEST_HELPERS_ENABLED === "1" ||
    process.env.E2E_TESTS === "true" ||
    request.headers.get("X-Test-Helpers-Enabled") === "1";
  
  if (!isTestEnv) {
    return NextResponse.json(
      { error: "Test helpers not enabled" },
      { status: 403 },
    );
  }

  // CRON_SECRET authentication
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  // Check Authorization header
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 },
    );
  }

  const token = authHeader.substring(7);
  if (token !== cronSecret) {
    return NextResponse.json({ error: "Invalid CRON_SECRET" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseServiceClient();

    // Connection info (safe, non-secret)
    const supabaseUrl = process.env.SUPABASE_URL || "";
    const supabaseHost = new URL(supabaseUrl).host;
    const projectRef = supabaseHost.split('.')[0]; // Extract project ref from host
    const dbTarget = process.env.E2E_DB_TARGET || "unknown";

    // Migrations status (best-effort)
    let migrationsStatus = null;
    try {
      const { data: migrations, error: migrationsError } = await supabase
        .from("supabase_migrations.schema_migrations")
        .select("version, statements, name")
        .order("version", { ascending: false })
        .limit(5);
      
      if (!migrationsError && migrations) {
        migrationsStatus = migrations.map(m => ({
          version: m.version,
          name: m.name,
          statements_count: m.statements?.length || 0
        }));
      }
    } catch {
      // Schema migrations table might not be accessible
      migrationsStatus = null;
    }

    // Features checksum - existence + hash of critical objects
    const objects: Record<string, { exists: boolean; hash?: string }> = {};

    // Check fn_user_resubmit function (using same approach as check-db-functions)
    try {
      const { data: resubmitTest } = await supabase.rpc(
        "fn_user_resubmit",
        {
          reg_id: "00000000-0000-0000-0000-000000000000",
          payload: {},
        },
      );
      // If we get here, the function exists (even if it fails due to invalid UUID)
      objects.fn_user_resubmit = { exists: true };
    } catch {
      objects.fn_user_resubmit = { exists: false };
    }

    // Check validate_and_consume_deep_link_token function (using same approach as check-db-functions)
    try {
      const { data: validateTest } = await supabase.rpc(
        "validate_and_consume_deep_link_token",
        {
          token: "test",
          reg_id: "00000000-0000-0000-0000-000000000000",
          user_email: null,
          ip_address: null,
          user_agent: null,
        },
      );
      // If we get here, the function exists (even if it fails due to invalid token)
      objects.validate_and_consume_deep_link_token = { exists: true };
    } catch {
      objects.validate_and_consume_deep_link_token = { exists: false };
    }

    // Check generate_secure_deep_link_token function (using same approach as check-db-functions)
    try {
      const { data: generateTest } = await supabase.rpc(
        "generate_secure_deep_link_token",
        {
          reg_id: "00000000-0000-0000-0000-000000000000",
          dimension: "profile",
          admin_email: "test@example.com",
          ttl_seconds: 3600,
        },
      );
      // If we get here, the function exists (even if it fails due to invalid UUID)
      objects.generate_deep_link_token = { exists: true };
    } catch {
      objects.generate_deep_link_token = { exists: false };
    }

    // Check trigger_update_registration_status function (using same approach as check-db-functions)
    try {
      const { data: triggerTest } = await supabase.rpc(
        "trigger_update_registration_status",
        {
          reg_id: "00000000-0000-0000-0000-000000000000",
          dimension: "profile",
          status: "pending",
        },
      );
      // If we get here, the function exists (even if it fails due to invalid UUID)
      objects.trigger_update_registration_status = { exists: true };
    } catch {
      objects.trigger_update_registration_status = { exists: false };
    }

    // Health facts
    let eventSettingsCount = 0;
    try {
      const { count } = await supabase
        .from("event_settings")
        .select("*", { count: "exact", head: true });
      eventSettingsCount = count || 0;
    } catch {
      eventSettingsCount = 0;
    }

    // Update reason distribution
    let updateReasonDistribution = { profile: 0, info: 0, other: 0 };
    try {
      const { data: reasons } = await supabase
        .from("registrations")
        .select("update_reason")
        .not("update_reason", "is", null);
      
      if (reasons) {
        reasons.forEach(reg => {
          const reason = reg.update_reason;
          if (reason === 'profile') {
            updateReasonDistribution.profile++;
          } else if (reason === 'info') {
            updateReasonDistribution.info++;
          } else {
            updateReasonDistribution.other++;
          }
        });
      }
    } catch (e) {
      // Table might not exist or have update_reason column
      updateReasonDistribution = { profile: 0, info: 0, other: 0 };
    }

    return NextResponse.json({
      dbTarget,
      projectRef,
      supabaseHost,
      objects,
      event_settings_count: eventSettingsCount,
      update_reason_distribution: updateReasonDistribution,
      migrations: migrationsStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("DB fingerprint error:", error);
    return NextResponse.json(
      {
        error: "DB fingerprint failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
