import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();
    const url = new URL(request.url);
    const language = url.searchParams.get("language") || "all";
    const search = url.searchParams.get("search") || "";
    const include_metadata =
      url.searchParams.get("include_metadata") === "true";
    const include_related = url.searchParams.get("include_related") === "true";

    // Fetch activities with basic data first
    let activitiesQuery = supabase
      .from("cms_activity_cards")
      .select(
        `
        id,
        title,
        summary,
        content,
        language,
        published_at,
        image_url,
        card_slug,
        scheduled_at,
        ends_at,
        created_at,
        updated_at,
        is_active,
        author_id,
        category,
        tags,
        priority,
        location,
        capacity,
        registration_required,
        registration_url,
        cost,
        difficulty_level,
        age_group,
        duration_minutes,
        materials_needed,
        prerequisites,
        learning_objectives,
        outcomes,
        feedback_score,
        participant_count,
        max_participants,
        waitlist_available,
        featured,
        seo_title,
        seo_description,
        social_media_image,
        related_activities,
        attachments,
        external_links,
        contact_email,
        contact_phone,
        venue,
        accessibility_notes,
        special_requirements
      `,
      )
      .eq("is_active", true)
      .not("published_at", "is", null);

    if (language !== "all") {
      activitiesQuery = activitiesQuery.eq("language", language);
    }

    if (search) {
      activitiesQuery = activitiesQuery.or(
        `title.ilike.%${search}%,summary.ilike.%${search}%,content.ilike.%${search}%`,
      );
    }

    const { data: activities, error } = await activitiesQuery
      .order("published_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Activities error:", error);
      return NextResponse.json(
        { error: "Failed to fetch activities", details: error.message },
        { status: 500 },
      );
    }

    // Transform data to comprehensive format
    const comprehensiveActivities =
      activities?.map((activity) => ({
        id: activity.id,
        title: activity.title,
        summary: activity.summary,
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
        author_id: activity.author_id,
        category: activity.category,
        tags: activity.tags || [],
        priority: activity.priority,
        location: activity.location,
        capacity: activity.capacity,
        registration_required: activity.registration_required,
        registration_url: activity.registration_url,
        cost: activity.cost,
        difficulty_level: activity.difficulty_level,
        age_group: activity.age_group,
        duration_minutes: activity.duration_minutes,
        materials_needed: activity.materials_needed,
        prerequisites: activity.prerequisites,
        learning_objectives: activity.learning_objectives,
        outcomes: activity.outcomes,
        feedback_score: activity.feedback_score,
        participant_count: activity.participant_count,
        max_participants: activity.max_participants,
        waitlist_available: activity.waitlist_available,
        featured: activity.featured,
        seo_title: activity.seo_title,
        seo_description: activity.seo_description,
        social_media_image: activity.social_media_image,
        related_activities: activity.related_activities || [],
        attachments: activity.attachments || [],
        external_links: activity.external_links || [],
        contact_email: activity.contact_email,
        contact_phone: activity.contact_phone,
        venue: activity.venue,
        accessibility_notes: activity.accessibility_notes,
        special_requirements: activity.special_requirements,
        // Computed fields
        url: `/activities/${activity.card_slug}`,
        full_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://yec-registration.com"}/activities/${activity.card_slug}`,
        is_published: activity.is_active && activity.published_at,
        has_image: !!activity.image_url,
        tag_count: (activity.tags || []).length,
        is_featured: activity.featured || false,
        is_registration_required: activity.registration_required || false,
        has_capacity_limit: !!activity.max_participants,
        is_scheduled: !!activity.scheduled_at,
        is_ended: activity.ends_at
          ? new Date(activity.ends_at) < new Date()
          : false,
      })) || [];

    return NextResponse.json({
      success: true,
      data: comprehensiveActivities,
      total: comprehensiveActivities.length,
      metadata: {
        endpoint: "/api/cms/activities",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        content_type: "activities",
        comprehensive: true,
        language,
        search,
        include_metadata,
        include_related,
      },
    });
  } catch (error) {
    console.error("CMS Activities API Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
