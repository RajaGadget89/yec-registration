/**
 * CMS SEO Config API - Dynamic SEO Configuration Management
 * Handles CRUD operations for SEO settings with authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { withBrandingManagementGuard } from "../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../lib/auth-utils.server";
import { maybeServiceClient } from "../../../../lib/supabase/server";
import { clearSEOConfigCache } from "../../../../lib/seo-config";
import { z } from "zod";

// Validation schemas
const SEOConfigSchema = z.object({
  seo_site_name: z.string().min(1).max(100).optional(),
  seo_site_title_suffix: z.string().min(1).max(100).optional(),
  seo_default_description: z.string().max(160).optional(),
  seo_og_image_url: z.string().url().optional().or(z.literal("")),
  seo_twitter_handle: z.string().max(50).optional().or(z.literal("")),
  seo_activities_title: z.string().min(1).max(100).optional(),
  seo_activities_description: z.string().max(160).optional(),
  seo_news_title: z.string().min(1).max(100).optional(),
  seo_news_description: z.string().max(160).optional(),
  seo_faq_title: z.string().min(1).max(100).optional(),
  seo_faq_description: z.string().max(160).optional(),
  seo_robots_allow: z.array(z.string()).optional(),
  seo_robots_disallow: z.array(z.string()).optional(),
});

/**
 * GET /api/admin/cms/seo-config
 * Get current SEO configuration
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
        seo_site_name,
        seo_site_title_suffix,
        seo_default_description,
        seo_og_image_url,
        seo_twitter_handle,
        seo_activities_title,
        seo_activities_description,
        seo_news_title,
        seo_news_description,
        seo_faq_title,
        seo_faq_description,
        seo_robots_allow,
        seo_robots_disallow
      `,
      )
      .eq("is_active", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ seoConfig: null });
      }
      console.error("Error fetching SEO config:", error);
      return NextResponse.json(
        { error: "Failed to fetch SEO configuration" },
        { status: 500 },
      );
    }

    return NextResponse.json({ seoConfig: branding });
  } catch (error) {
    console.error("SEO Config GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/cms/seo-config
 * Update SEO configuration
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

    const validatedData = SEOConfigSchema.parse(cleanedData);

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

    // Update SEO configuration
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
      console.error("Error updating SEO config:", error);
      return NextResponse.json(
        { error: "Failed to update SEO configuration" },
        { status: 500 },
      );
    }

    // Clear cache to ensure fresh data on next request
    clearSEOConfigCache();

    return NextResponse.json({
      success: true,
      seoConfig: updatedBranding,
      message: "SEO configuration updated successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("SEO Config PUT error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
