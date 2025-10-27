/**
 * Admin Branding Config API - Dynamic Admin Branding Configuration Management
 * Handles CRUD operations for admin branding settings with authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { withBrandingManagementGuard } from "../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../lib/auth-utils.server";
import { maybeServiceClient } from "../../../../lib/supabase/server";
import { clearAdminBrandingConfigCache } from "../../../../lib/admin-branding-config";
import { z } from "zod";

// Validation schemas
const AdminBrandingConfigSchema = z.object({
  admin_site_name: z.string().min(1).max(100).optional(),
  admin_logo_url: z.string().url().optional().or(z.literal("")),
  admin_favicon_url: z.string().url().optional().or(z.literal("")),
});

/**
 * GET /api/admin/cms/admin-branding-config
 * Get current admin branding configuration
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
        admin_site_name,
        admin_logo_url,
        admin_favicon_url
      `,
      )
      .eq("is_active", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ config: null });
      }
      console.error("Error fetching admin branding config:", error);
      return NextResponse.json(
        { error: "Failed to fetch admin branding configuration" },
        { status: 500 },
      );
    }

    return NextResponse.json({ config: branding });
  } catch (error) {
    console.error("Admin Branding Config GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/cms/admin-branding-config
 * Update admin branding configuration
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

    // Clean empty strings and null values
    const cleanedData = Object.fromEntries(
      Object.entries(body).filter(
        ([_, v]) => v !== "" && v !== null && v !== undefined,
      ),
    );

    const validatedData = AdminBrandingConfigSchema.parse(cleanedData);

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

    // Update admin branding configuration
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
      console.error("Error updating admin branding config:", error);
      return NextResponse.json(
        { error: "Failed to update admin branding configuration" },
        { status: 500 },
      );
    }

    // Clear cache to ensure fresh data on next request
    clearAdminBrandingConfigCache();

    return NextResponse.json({
      success: true,
      config: updatedBranding,
      message: "Admin branding configuration updated successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Admin Branding Config PUT error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
