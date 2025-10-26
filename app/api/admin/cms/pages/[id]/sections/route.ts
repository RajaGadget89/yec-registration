import { NextRequest, NextResponse } from "next/server";
import { withContentManagementGuard } from "../../../../../../lib/cms-api-guard";
import { maybeServiceClient } from "../../../../../../lib/supabase/server";
import { generateAndStoreEmbeddings } from "../../../../../../lib/cms-embedding-helper";
import { z } from "zod";

const CreateSectionSchema = z.object({
  section_type: z.string().min(1),
  section_order: z.number().int().nonnegative().default(0),
  title: z.string().optional(),
  content: z.any().optional(),
  is_active: z.boolean().optional().default(true),
});

const UpdateSectionSchema = z.object({
  section_type: z.string().min(1).optional(),
  section_order: z.number().int().nonnegative().optional(),
  title: z.string().optional(),
  content: z.any().optional(),
  is_active: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await withContentManagementGuard(request);
  if (guard) return guard;

  const supabase = await maybeServiceClient(request);
  const { id } = await params;
  const { data, error } = await supabase
    .from("cms_page_sections")
    .select("id, section_type, section_order, title, content, is_active")
    .eq("page_id", id)
    .order("section_order", { ascending: true });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sections: data || [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await withContentManagementGuard(request);
  if (guard) return guard;

  try {
    const body = await request.json();
    const { id } = await params;
    const input = CreateSectionSchema.parse(body);
    const supabase = await maybeServiceClient(request);
    const { data, error } = await supabase
      .from("cms_page_sections")
      .insert({
        page_id: id,
        section_type: input.section_type,
        section_order: input.section_order,
        title: input.title,
        content: input.content ?? null,
        is_active: input.is_active ?? true,
      })
      .select()
      .single();
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    // Regenerate embeddings for the page since sections changed
    try {
      const { data: pageWithSections } = await supabase
        .from("cms_pages")
        .select("*, cms_page_sections(*)")
        .eq("id", id)
        .single();

      if (pageWithSections) {
        await generateAndStoreEmbeddings(
          supabase,
          "pages",
          id,
          {
            title: pageWithSections.title,
            meta_description: pageWithSections.meta_description,
            sections: pageWithSections.cms_page_sections || [],
          },
          pageWithSections.language,
        );
      }
    } catch (error) {
      console.error(
        "Failed to update embeddings for page after section change:",
        error,
      );
      // Don't fail the operation
    }

    return NextResponse.json({ section: data });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: e.errors },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await withContentManagementGuard(request);
  if (guard) return guard;

  try {
    const body = await request.json();
    const { id } = await params;
    const input = UpdateSectionSchema.parse(body);
    const supabase = await maybeServiceClient(request);

    const { data, error } = await supabase
      .from("cms_page_sections")
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq("page_id", id)
      .eq("id", body.section_id) // We need to pass section_id in the request body
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    // Regenerate embeddings for the page since sections changed
    try {
      const { data: pageWithSections } = await supabase
        .from("cms_pages")
        .select("*, cms_page_sections(*)")
        .eq("id", id)
        .single();

      if (pageWithSections) {
        await generateAndStoreEmbeddings(
          supabase,
          "pages",
          id,
          {
            title: pageWithSections.title,
            meta_description: pageWithSections.meta_description,
            sections: pageWithSections.cms_page_sections || [],
          },
          pageWithSections.language,
        );
      }
    } catch (error) {
      console.error(
        "Failed to update embeddings for page after section update:",
        error,
      );
      // Don't fail the operation
    }

    return NextResponse.json({ section: data });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: e.errors },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
