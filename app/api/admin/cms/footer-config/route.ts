/**
 * Admin Footer Config API - Footer Content Management
 * Handles CRUD operations for footer content settings with authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { withBrandingManagementGuard } from "../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../lib/auth-utils.server";
import { maybeServiceClient } from "../../../../lib/supabase/server";
import { clearFooterConfigCache } from "../../../../lib/footer-config";
import { z } from "zod";

// Validation schema for updates (all fields optional)
const UpdateFooterConfigSchema = z.object({
  footer_company_info: z
    .object({
      title: z.string().min(1).max(100).optional(),
      description: z.string().min(1).max(500).optional(),
    })
    .optional(),
  footer_social_links: z
    .array(
      z.object({
        platform: z.string().min(1).max(50),
        url: z.string().url(),
        icon_name: z.string().min(1).max(50),
      }),
    )
    .optional(),
  footer_quick_links: z
    .array(
      z.object({
        label: z.string().min(1).max(100),
        url: z.string().min(1).max(500),
        type: z.enum(["internal", "external"]),
      }),
    )
    .optional(),
  footer_contact_info: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().min(1).max(50).optional(),
      address: z.string().min(1).max(500).optional(),
    })
    .optional(),
  footer_copyright: z
    .object({
      main_text: z.string().min(1).max(200).optional(),
      credit_text: z.string().min(1).max(200).optional(),
    })
    .optional(),
});

/**
 * GET /api/admin/cms/footer-config
 * Get current footer configuration
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and permissions
    const guardResponse = await withBrandingManagementGuard(request);
    if (guardResponse) return guardResponse;

    const supabase = await maybeServiceClient(request);

    const { data: branding, error } = await supabase
      .from("cms_branding")
      .select(
        `
        id,
        footer_company_info,
        footer_social_links,
        footer_quick_links,
        footer_contact_info,
        footer_copyright,
        is_active,
        created_at,
        updated_at
      `,
      )
      .eq("is_active", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ config: null });
      }
      console.error("Error fetching footer config:", error);
      return NextResponse.json(
        { error: "Failed to fetch footer configuration" },
        { status: 500 },
      );
    }

    return NextResponse.json({ config: branding });
  } catch (error) {
    console.error("Footer Config GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/cms/footer-config
 * Update footer configuration
 */
export async function PUT(request: NextRequest) {
  try {
    // Check authentication and permissions
    const guardResponse = await withBrandingManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Remove empty strings/nullish from payload, including nested objects
    const cleanedBase = Object.fromEntries(
      Object.entries(body).filter(
        ([_, v]) => v !== "" && v !== null && v !== undefined,
      ),
    );

    const cleaned = {
      ...cleanedBase,
      // Clean nested objects
      ...(cleanedBase.footer_company_info
        ? {
            footer_company_info: Object.fromEntries(
              Object.entries(
                cleanedBase.footer_company_info as Record<string, unknown>,
              ).filter(([_, v]) => v !== "" && v !== null && v !== undefined),
            ),
          }
        : {}),
      ...(cleanedBase.footer_contact_info
        ? {
            footer_contact_info: Object.fromEntries(
              Object.entries(
                cleanedBase.footer_contact_info as Record<string, unknown>,
              ).filter(([_, v]) => v !== "" && v !== null && v !== undefined),
            ),
          }
        : {}),
      ...(cleanedBase.footer_copyright
        ? {
            footer_copyright: Object.fromEntries(
              Object.entries(
                cleanedBase.footer_copyright as Record<string, unknown>,
              ).filter(([_, v]) => v !== "" && v !== null && v !== undefined),
            ),
          }
        : {}),
    };

    const validatedData = UpdateFooterConfigSchema.parse(cleaned);

    const supabase = await maybeServiceClient(request);

    // Get current active branding
    const { data: currentBranding } = await supabase
      .from("cms_branding")
      .select("id")
      .eq("is_active", true)
      .single();

    if (!currentBranding) {
      return NextResponse.json(
        {
          error:
            "No active branding configuration found. Please set up branding first.",
        },
        { status: 404 },
      );
    }

    // Update footer configuration
    const { data: updatedBranding, error } = await supabase
      .from("cms_branding")
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentBranding.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating footer config:", error);
      return NextResponse.json(
        { error: "Failed to update footer configuration" },
        { status: 500 },
      );
    }

    // Clear cache
    clearFooterConfigCache();

    return NextResponse.json({
      message: "Footer configuration updated successfully",
      config: updatedBranding,
    });
  } catch (error) {
    console.error("Footer Config PUT error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
