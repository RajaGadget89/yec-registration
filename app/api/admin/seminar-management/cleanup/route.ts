import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "../../../../lib/auth-utils.server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { audit } from "../../../../lib/audit";

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const dryRun =
    (url.searchParams.get("dryRun") ?? "true").toLowerCase() !== "false";
  const confirm = url.searchParams.get("confirm") || "";

  // Auth
  const user = await getCurrentUserFromRequest(request);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "super_admin" && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseServiceClient();

  const tables = [
    "seminar_event_participants",
    "seminar_accommodation_daily",
    "seminar_transportation",
    "seminar_finances",
    "seminar_accommodations",
    "seminar_participants",
  ];

  // Count existing rows for preview
  const counts: Record<string, number> = {};
  for (const table of tables) {
    const { count } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });
    counts[table] = count || 0;
  }

  if (dryRun || confirm !== "DELETE") {
    await audit.logAccess({
      action: "CLEANUP_PREVIEW",
      method: "POST",
      resource: "seminar_management_cleanup",
      result: "success",
      request_id: `seminar_cleanup_preview_${Date.now()}`,
      meta: {
        dryRun: true,
        counts,
        actor: user.email,
        path: "/api/admin/seminar-management/cleanup",
      },
    });
    return NextResponse.json({ dryRun: true, counts });
  }

  // Execute cleanup in order
  const deleted: Record<string, number> = {};
  for (const table of tables) {
    const { error: delErr } = await supabase.from(table).delete().neq("id", -1);
    if (delErr) {
      return NextResponse.json(
        { error: `Failed to delete from ${table}: ${delErr.message}` },
        { status: 500 },
      );
    }
    deleted[table] = counts[table];
  }

  await audit.logEvent({
    action: "seminar_cleanup_executed",
    resource: "seminar_management",
    actor_role: "admin",
    result: "success",
    correlation_id: `seminar_cleanup_${Date.now()}`,
    meta: { actor: user.email, deleted },
  });

  return NextResponse.json({ dryRun: false, deleted });
}
