import { NextRequest, NextResponse } from "next/server";
import { getLandingPageSection } from "../../../../../lib/landing-page-sections";

/**
 * GET /api/cms/landing-page/sections/[section_key]
 * Public endpoint to get a single landing page section by key
 * Used by client components to check section visibility
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ section_key: string }> },
) {
  try {
    const { section_key } = await params;

    const section = await getLandingPageSection(section_key as any);

    return NextResponse.json({ section });
  } catch (error) {
    console.error("Error fetching landing page section:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
