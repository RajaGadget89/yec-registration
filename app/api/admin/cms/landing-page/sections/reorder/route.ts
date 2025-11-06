/**
 * Landing Page Sections Reorder API - Batch update section orders
 * Handles POST operation for reordering multiple sections
 */

import { NextRequest, NextResponse } from "next/server";
import { withContentManagementGuard } from "../../../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../../../lib/auth-utils.server";
import { updateLandingPageSectionOrders } from "../../../../../../lib/landing-page-sections";
import { z } from "zod";

// Validation schema for reordering sections
const ReorderSectionsSchema = z.object({
  sections: z
    .array(
      z.object({
        section_key: z.enum([
          "hero",
          "news",
          "banner",
          "activity_cards",
          "registration_form",
        ]),
        section_order: z.number().int().nonnegative(),
      }),
    )
    .min(2),
});

/**
 * POST /api/admin/cms/landing-page/sections/reorder
 * Reorder landing page sections
 * Body: { sections: [{ section_key: string, section_order: number }] }
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = ReorderSectionsSchema.parse(body);

    // Update all sections' orders
    const updatedSections = await updateLandingPageSectionOrders(
      validatedData.sections,
    );

    return NextResponse.json({ sections: updatedSections });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Landing Page Sections Reorder error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}


