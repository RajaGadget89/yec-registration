/**
 * Landing Page Sections API - Admin endpoints for managing landing page section visibility
 * Handles GET and PUT operations for landing page sections
 */

import { NextRequest, NextResponse } from "next/server";
import { withContentManagementGuard } from "../../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../../lib/auth-utils.server";
import {
  getLandingPageSections,
  updateLandingPageSection,
  createLandingPageSection,
} from "../../../../../lib/landing-page-sections";
import { z } from "zod";

// Validation schema for updating sections
const UpdateSectionSchema = z.object({
  section_key: z.enum([
    "hero",
    "news",
    "banner",
    "activity_cards",
    "registration_form",
    "registration_cta",
  ]),
  is_active: z.boolean().optional(),
  section_order: z.number().int().nonnegative().optional(),
});

/**
 * GET /api/admin/cms/landing-page/sections
 * Get all landing page sections
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sections = await getLandingPageSections();

    // Auto-create registration_cta section if it doesn't exist
    const hasRegistrationCTA = sections.some(
      (s) => s.section_key === "registration_cta",
    );
    if (!hasRegistrationCTA) {
      try {
        const registrationCTASection = await createLandingPageSection({
          section_key: "registration_cta",
          section_name: "Registration CTA",
          is_active: true,
          section_order: 6,
        });
        sections.push(registrationCTASection);
        // Sort sections by order
        sections.sort((a, b) => a.section_order - b.section_order);
      } catch (error) {
        console.error("Failed to auto-create registration_cta section:", error);
        // Continue even if creation fails - it might already exist
      }
    }

    return NextResponse.json({ sections });
  } catch (error) {
    console.error("Landing Page Sections GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/cms/landing-page/sections
 * Update a landing page section
 * Body: { section_key: string, is_active?: boolean, section_order?: number }
 */
export async function PUT(request: NextRequest) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = UpdateSectionSchema.parse(body);

    const { section_key, ...updates } = validatedData;

    // Update the section
    const updatedSection = await updateLandingPageSection(section_key, updates);

    return NextResponse.json({ section: updatedSection });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Landing Page Sections PUT error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
