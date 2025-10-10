import { NextRequest, NextResponse } from "next/server";
import { withContentManagementGuard } from "../../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../../lib/auth-utils.server";
import { maybeServiceClient } from "../../../../../lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await maybeServiceClient(request);

    const { data: card, error } = await supabase
      .from("cms_activity_cards")
      .select(
        `
        id,
        card_slug,
        title,
        description,
        content,
        icon_emoji,
        image_url,
        external_links,
        hashtags,
        language,
        is_active,
        published_at,
        created_at,
        updated_at
      `,
      )
      .eq("id", params.id)
      .single();

    if (error || !card) {
      return NextResponse.json(
        { error: "Activity card not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(card);
  } catch (error) {
    console.error("Error fetching activity card:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
