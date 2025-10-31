/**
 * CMS Templates API - Individual Template Management
 * Handles GET and PUT operations for individual templates
 */

import { NextRequest, NextResponse } from "next/server";
import { withTemplateManagementGuard } from "../../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../../lib/auth-utils.server";
import { maybeServiceClient } from "../../../../../lib/supabase/server";
import { z } from "zod";

type TemplateType =
  | "page"
  | "news"
  | "activity-card"
  | "hero-video"
  | "component";

// Validation schema for updates
const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  template_type: z
    .enum(["page", "news", "activity-card", "hero-video", "component"])
    .optional(),
  template_data: z.any().optional(),
  preview_image: z.string().optional(),
  is_active: z.boolean().optional(),
});

/**
 * GET /api/admin/cms/templates/[id]
 * Get a specific template by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication and permissions
    const guardResponse = await withTemplateManagementGuard(request);
    if (guardResponse) return guardResponse;

    const { id } = await params;
    const supabase = await maybeServiceClient(request);

    const { data: template, error } = await supabase
      .from("cms_templates")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    // Map API response to component interface format
    // Convert API type format to component template_type format
    const typeMapping: Record<string, TemplateType> = {
      news: "news",
      activity_card: "activity-card",
      banner: "hero-video",
      page_section: "page",
    };

    const mappedTemplate = {
      id: template.id,
      name: template.name,
      description: template.description || "",
      template_type: typeMapping[template.type] || "page",
      template_data: template.template_data || {},
      preview_image: template.preview_image || "",
      is_active: template.is_active !== false,
      is_system: template.is_system || false,
      created_at: template.created_at,
      updated_at: template.updated_at || template.created_at,
      created_by: template.created_by,
    };

    return NextResponse.json(mappedTemplate);
  } catch (error) {
    console.error("Template GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/cms/templates/[id]
 * Update a specific template
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication and permissions
    const guardResponse = await withTemplateManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = UpdateTemplateSchema.parse(body);

    const supabase = await maybeServiceClient(request);

    // Check if template exists
    const { data: existingTemplate } = await supabase
      .from("cms_templates")
      .select("id, name, type, is_system")
      .eq("id", id)
      .single();

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    // Prevent editing system templates
    if (existingTemplate.is_system) {
      return NextResponse.json(
        { error: "Cannot edit system templates" },
        { status: 403 },
      );
    }

    // Check if name is being changed and if new name already exists for same type
    if (validatedData.name && validatedData.name !== existingTemplate.name) {
      const typeToCheck = validatedData.template_type || existingTemplate.type;
      const { data: duplicateTemplate } = await supabase
        .from("cms_templates")
        .select("id")
        .eq("name", validatedData.name)
        .eq("type", typeToCheck)
        .neq("id", id)
        .single();

      if (duplicateTemplate) {
        return NextResponse.json(
          { error: "Template with this name and type already exists" },
          { status: 400 },
        );
      }
    }

    // Prepare update data (map component fields to API fields)
    // Map component template_type format back to API type format
    const reverseTypeMapping: Record<TemplateType, string> = {
      news: "news",
      "activity-card": "activity_card",
      "hero-video": "banner",
      page: "page_section",
      component: "page_section", // Default component to page_section
    };

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name;
    }
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description;
    }
    if (validatedData.template_type !== undefined) {
      updateData.type =
        reverseTypeMapping[validatedData.template_type] || "page_section";
    }
    if (validatedData.template_data !== undefined) {
      updateData.template_data = validatedData.template_data;
    }
    if (validatedData.preview_image !== undefined) {
      updateData.preview_image = validatedData.preview_image;
    }
    if (validatedData.is_active !== undefined) {
      updateData.is_active = validatedData.is_active;
    }

    // Update template
    const { data: updatedTemplate, error } = await supabase
      .from("cms_templates")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating template:", error);
      return NextResponse.json(
        { error: "Failed to update template" },
        { status: 500 },
      );
    }

    // Map response back to component interface
    const typeMapping: Record<string, TemplateType> = {
      news: "news",
      activity_card: "activity-card",
      banner: "hero-video",
      page_section: "page",
    };

    const mappedTemplate = {
      id: updatedTemplate.id,
      name: updatedTemplate.name,
      description: updatedTemplate.description || "",
      template_type: typeMapping[updatedTemplate.type] || "page",
      template_data: updatedTemplate.template_data || {},
      preview_image: updatedTemplate.preview_image || "",
      is_active: updatedTemplate.is_active !== false,
      is_system: updatedTemplate.is_system || false,
      created_at: updatedTemplate.created_at,
      updated_at: updatedTemplate.updated_at || updatedTemplate.created_at,
      created_by: updatedTemplate.created_by,
    };

    return NextResponse.json(mappedTemplate);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Template PUT error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
