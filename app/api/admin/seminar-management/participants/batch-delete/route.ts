import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "../../../../../lib/auth-utils.server";
import { getSupabaseServiceClient } from "../../../../../lib/supabase-server";
import { audit } from "../../../../../lib/audit";

export async function POST(request: NextRequest) {
  // Access log
  await audit.logAccess({
    action: "BATCH_DELETE_REQUEST",
    method: "POST",
    resource: "seminar_participants",
    result: "received",
    request_id: `batch_delete_${Date.now()}`,
    meta: {
      actor: "admin",
      path: "/api/admin/seminar-management/participants/batch-delete",
    },
  });

  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "super_admin" && user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const participantIds = Array.isArray(body?.participantIds)
      ? body.participantIds.filter((v: any) => typeof v === "number")
      : [];
    if (participantIds.length === 0) {
      return NextResponse.json(
        { error: "participantIds must be a non-empty number array" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

    const deleted = {
      eventParticipants: 0,
      accommodationDaily: 0,
      transportation: 0,
      finances: 0,
      accommodations: 0,
      participants: 0,
    };

    // Find accommodations for these participants (to delete daily stays)
    const { data: accs } = await supabase
      .from("seminar_accommodations")
      .select("id")
      .in("participant_id", participantIds);

    const accommodationIds = (accs || []).map((a) => a.id);

    // Delete child tables first
    if (accommodationIds.length > 0) {
      const { count: delDailyCount } = await supabase
        .from("seminar_accommodation_daily")
        .delete({ count: "exact" })
        .in("accommodation_id", accommodationIds);
      deleted.accommodationDaily += delDailyCount || 0;
    }

    {
      const { count: delEvtCount } = await supabase
        .from("seminar_event_participants")
        .delete({ count: "exact" })
        .in("participant_id", participantIds);
      deleted.eventParticipants += delEvtCount || 0;
    }

    {
      const { count: delTransCount } = await supabase
        .from("seminar_transportation")
        .delete({ count: "exact" })
        .in("participant_id", participantIds);
      deleted.transportation += delTransCount || 0;
    }

    {
      const { count: delFinCount } = await supabase
        .from("seminar_finances")
        .delete({ count: "exact" })
        .in("participant_id", participantIds);
      deleted.finances += delFinCount || 0;
    }

    // Delete accommodations for participants
    {
      const { count: delAccCount } = await supabase
        .from("seminar_accommodations")
        .delete({ count: "exact" })
        .in("participant_id", participantIds);
      deleted.accommodations += delAccCount || 0;
    }

    // Finally delete participants
    {
      const { count: delPartCount } = await supabase
        .from("seminar_participants")
        .delete({ count: "exact" })
        .in("id", participantIds);
      deleted.participants += delPartCount || 0;
    }

    await audit.logEvent({
      action: "seminar.participants.batchDeleted",
      resource: "seminar_participants",
      actor_role: "admin",
      result: "success",
      correlation_id: `batch_delete_${Date.now()}`,
      meta: { deleted },
    });

    return NextResponse.json({ success: true, deleted });
  } catch (err: any) {
    console.error("Batch delete error", err);
    return NextResponse.json(
      { error: err?.message || "Failed to delete participants" },
      { status: 500 },
    );
  }
}
