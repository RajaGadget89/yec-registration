import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabase/server";

// Public endpoint: returns active footer configuration
export async function GET(_request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("cms_branding")
      .select(
        `footer_company_info, footer_social_links, footer_quick_links, footer_contact_info, footer_copyright`,
      )
      .eq("is_active", true)
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to load footer content" },
        {
          status: 500,
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        },
      );
    }

    return new NextResponse(JSON.stringify({ footer: data || null }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (_e) {
    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  }
}
