import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";

/**
 * CMS Activities API Endpoint - COMPLETE DATA VERSION
 * Provides comprehensive activity data for MCP consumption
 * Returns complete, rich data for each activity item
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();
    const url = new URL(request.url);
    const language = url.searchParams.get("language") || "all";
    const search = url.searchParams.get("search") || "";
    const include_metadata =
      url.searchParams.get("include_metadata") === "true";
    const include_related = url.searchParams.get("include_related") === "true";
    const idsParam = url.searchParams.get("ids");
    const fieldsParam = url.searchParams.get("fields");
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "100", 10) || 100,
      100,
    );
    const page = Math.max(
      parseInt(url.searchParams.get("page") || "1", 10) || 1,
      1,
    );

    // Fetch activities with COMPLETE data
    let activitiesQuery = supabase
      .from("cms_activity_cards")
      .select(
        `
        id,
        title,
        description,
        content,
        language,
        published_at,
        image_url,
        card_slug,
        scheduled_at,
        ends_at,
        created_at,
        updated_at,
        is_active
      `,
      )
      .eq("is_active", true)
      .or("published_at.is.null,published_at.lte.now()"); // Only show activities that are published or have no published_at date

    if (idsParam) {
      const ids = idsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (ids.length > 0) activitiesQuery = activitiesQuery.in("id", ids);
    }
    if (language !== "all") {
      activitiesQuery = activitiesQuery.eq("language", language);
    }

    if (search) {
      activitiesQuery = activitiesQuery.or(
        `title.ilike.%${search}%,content.ilike.%${search}%,description.ilike.%${search}%`,
      );
    }

    const { data: activities, error: activitiesError } = await activitiesQuery
      .order("published_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (activitiesError) {
      return NextResponse.json(
        { error: "Failed to fetch activities" },
        { status: 500 },
      );
    }

    // Enhance each activity with additional computed data
    const baseActivity = (activity: any) => ({
      id: activity.id,
      title: activity.title,
      summary: activity.description, // Map description -> summary for API consistency
      content: activity.content,
      language: activity.language,
      published_at: activity.published_at,
      image_url: activity.image_url,
      card_slug: activity.card_slug,
      scheduled_at: activity.scheduled_at,
      ends_at: activity.ends_at,
      created_at: activity.created_at,
      updated_at: activity.updated_at,
      is_active: activity.is_active,
      full_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://yec-registration.com"}/activities/${activity.card_slug}`,
      registration_status: activity.registration_required
        ? activity.participant_count >= activity.max_participants
          ? "full"
          : "open"
        : "not_required",
      time_until_start: activity.scheduled_at
        ? Math.max(0, new Date(activity.scheduled_at).getTime() - Date.now())
        : null,
      is_upcoming: activity.scheduled_at
        ? new Date(activity.scheduled_at) > new Date()
        : false,
      is_ongoing:
        activity.scheduled_at && activity.ends_at
          ? new Date() >= new Date(activity.scheduled_at) &&
            new Date() <= new Date(activity.ends_at)
          : false,
      duration_hours: activity.duration_minutes
        ? Math.round((activity.duration_minutes / 60) * 10) / 10
        : null,
    });

    const allowlist = new Set([
      "id",
      "title",
      "summary",
      "content",
      "language",
      "published_at",
      "image_url",
      "card_slug",
      "scheduled_at",
      "ends_at",
      "created_at",
      "updated_at",
      "is_active",
      "full_url",
      "registration_status",
      "time_until_start",
      "is_upcoming",
      "is_ongoing",
      "duration_hours",
    ]);
    const requested = fieldsParam
      ? fieldsParam
          .split(",")
          .map((s) => s.trim())
          .filter((f) => allowlist.has(f))
      : undefined;
    const pick = (obj: any) => {
      if (!requested || requested.length === 0) return obj;
      const out: any = {};
      for (const k of requested) out[k] = (obj as any)[k];
      return out;
    };

    const enhancedActivities = (activities || []).map((a: any) =>
      pick(baseActivity(a)),
    );

    return NextResponse.json({
      success: true,
      data: enhancedActivities,
      meta: {
        total_activities: enhancedActivities.length,
        page,
        limit,
        upcoming_count: enhancedActivities.filter((a) => a.is_upcoming).length,
        ongoing_count: enhancedActivities.filter((a) => a.is_ongoing).length,
        language,
        search,
        include_metadata,
        include_related,
        timestamp: new Date().toISOString(),
        version: "1.0.0",
      },
    });
  } catch (error) {
    console.error("CMS Activities API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
