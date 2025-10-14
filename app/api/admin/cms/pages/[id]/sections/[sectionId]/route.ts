import { NextRequest, NextResponse } from "next/server";
import { withContentManagementGuard } from "../../../../../../../lib/cms-api-guard";
import { maybeServiceClient } from "../../../../../../../lib/supabase/server";
import { z } from "zod";

const UpdateSectionSchema = z.object({
  section_type: z.string().min(1).optional(),
  section_order: z.number().int().nonnegative().optional(),
  title: z.string().optional(),
  content: z.any().optional(),
  is_active: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> },
) {
  const guard = await withContentManagementGuard(request);
  if (guard) return guard;

  const supabase = await maybeServiceClient(request);
  const { id, sectionId } = await params;

  const { data, error } = await supabase
    .from("cms_page_sections")
    .select("id, section_type, section_order, title, content, is_active")
    .eq("page_id", id)
    .eq("id", sectionId)
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ section: data });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> },
) {
  const guard = await withContentManagementGuard(request);
  if (guard) return guard;

  try {
    const body = await request.json();
    const { id, sectionId } = await params;
    const input = UpdateSectionSchema.parse(body);
    const supabase = await maybeServiceClient(request);

    const { data, error } = await supabase
      .from("cms_page_sections")
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq("page_id", id)
      .eq("id", sectionId)
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> },
) {
  const guard = await withContentManagementGuard(request);
  if (guard) return guard;

  try {
    const { id, sectionId } = await params;
    const supabase = await maybeServiceClient(request);

    const { error } = await supabase
      .from("cms_page_sections")
      .delete()
      .eq("page_id", id)
      .eq("id", sectionId);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (_e) {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
