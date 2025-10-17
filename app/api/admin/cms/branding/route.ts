/**
 * CMS Branding API - Logo and Branding Management
 * Handles CRUD operations for branding with authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { withBrandingManagementGuard } from "../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../lib/auth-utils.server";
import { maybeServiceClient } from "../../../../lib/supabase/server";
import { z } from "zod";

// Validation schemas
const CreateBrandingSchema = z.object({
  logo_desktop_url: z.string().url().optional(),
  logo_mobile_url: z.string().url().optional(),
  logo_favicon_url: z.string().url().optional(),
  brand_colors: z
    .object({
      primary: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
      secondary: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
      accent: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
      background: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
      text: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
    })
    .optional(),
  is_active: z.boolean().default(true),
});

const UpdateBrandingSchema = CreateBrandingSchema.partial();

/**
 * GET /api/admin/cms/branding
 * Get current branding configuration
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
        logo_desktop_url,
        logo_mobile_url,
        logo_favicon_url,
        brand_colors,
        is_active,
        created_at,
        updated_at
      `,
      )
      .eq("is_active", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ branding: null });
      }
      console.error("Error fetching branding:", error);
      return NextResponse.json(
        { error: "Failed to fetch branding" },
        { status: 500 },
      );
    }

    return NextResponse.json({ branding });
  } catch (error) {
    console.error("Branding GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/cms/branding
 * Create new branding configuration
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and permissions
    const guardResponse = await withBrandingManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    // Remove empty strings/nullish from payload, including nested brand_colors
    const cleanedBase = Object.fromEntries(
      Object.entries(body).filter(
        ([_, v]) => v !== "" && v !== null && v !== undefined,
      ),
    );
    const cleaned = {
      ...cleanedBase,
      ...(cleanedBase.brand_colors
        ? {
            brand_colors: Object.fromEntries(
              Object.entries(
                cleanedBase.brand_colors as Record<string, unknown>,
              ).filter(([_, v]) => v !== "" && v !== null && v !== undefined),
            ),
          }
        : {}),
    };
    const validatedData = CreateBrandingSchema.parse(cleaned);

    const supabase = await maybeServiceClient(request);

    // Check if active branding already exists
    const { data: existingBranding } = await supabase
      .from("cms_branding")
      .select("id")
      .eq("is_active", true)
      .single();

    if (existingBranding) {
      return NextResponse.json(
        {
          error:
            "Active branding configuration already exists. Use PUT to update.",
        },
        { status: 400 },
      );
    }

    // Create new branding
    const { data: newBranding, error } = await supabase
      .from("cms_branding")
      .insert(validatedData)
      .select()
      .single();

    if (error) {
      console.error("Error creating branding:", error);
      return NextResponse.json(
        { error: "Failed to create branding" },
        { status: 500 },
      );
    }

    return NextResponse.json(newBranding, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Branding POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/cms/branding
 * Update current branding configuration
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
    // Remove empty strings/nullish from payload, including nested brand_colors
    const cleanedBase = Object.fromEntries(
      Object.entries(body).filter(
        ([_, v]) => v !== "" && v !== null && v !== undefined,
      ),
    );
    const cleaned = {
      ...cleanedBase,
      ...(cleanedBase.brand_colors
        ? {
            brand_colors: Object.fromEntries(
              Object.entries(
                cleanedBase.brand_colors as Record<string, unknown>,
              ).filter(([_, v]) => v !== "" && v !== null && v !== undefined),
            ),
          }
        : {}),
    };
    const validatedData = UpdateBrandingSchema.parse(cleaned);

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
          error: "No active branding configuration found. Use POST to create.",
        },
        { status: 404 },
      );
    }

    // Update branding
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
      console.error("Error updating branding:", error);
      return NextResponse.json(
        { error: "Failed to update branding" },
        { status: 500 },
      );
    }

    return NextResponse.json(updatedBranding);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Branding PUT error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
