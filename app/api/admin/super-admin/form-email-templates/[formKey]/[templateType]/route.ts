import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../../lib/supabase/server";
import { audit } from "../../../../../../lib/audit";
import { hasRoleFromRequest } from "../../../../../../lib/auth-utils.server";

interface RouteParams {
  params: Promise<{
    formKey: string;
    templateType: string;
  }>;
}

const VALID_TEMPLATE_TYPES = [
  "tracking",
  "approval",
  "rejection",
  "update_request",
];

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { formKey, templateType } = await params;

    if (!VALID_TEMPLATE_TYPES.includes(templateType)) {
      return NextResponse.json(
        { error: "Invalid template type" },
        { status: 400 },
      );
    }

    // Enforce role using centralized helper (consistent with other endpoints)
    if (!(await hasRoleFromRequest(request, "super_admin"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = await getSupabaseServerClient();
    const {
      data: { user: _user },
    } = await supabase.auth.getUser();

    // Prefer normalized table; fallback to JSON in form_types for legacy
    const { data: rowFromTable } = await supabase
      .from("form_email_templates")
      .select(
        "form_key, template_type, subject_template, body_variables, base_template, is_active",
      )
      .eq("form_key", formKey)
      .eq("template_type", templateType)
      .maybeSingle();

    const template = rowFromTable || null;

    // Log access
    await audit.logAccess({
      action: "GET",
      method: "GET",
      resource: `form-email-templates-${formKey}-${templateType}`,
      result: "success",
      request_id: crypto.randomUUID(),
      meta: {
        form_key: formKey,
        template_type: templateType,
        has_template: !!template,
      },
    });

    return NextResponse.json({
      success: true,
      template: template || null,
    });
  } catch (error) {
    console.error("Error in email template API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { formKey, templateType } = await params;
    const body = await request.json();
    const { template } = body;

    if (!VALID_TEMPLATE_TYPES.includes(templateType)) {
      return NextResponse.json(
        { error: "Invalid template type" },
        { status: 400 },
      );
    }

    if (!template) {
      return NextResponse.json(
        { error: "Template is required" },
        { status: 400 },
      );
    }

    // Enforce role using centralized helper
    if (!(await hasRoleFromRequest(request, "super_admin"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = await getSupabaseServerClient();
    const {
      data: { user: _user },
    } = await supabase.auth.getUser();

    // Mirror write: normalized table (source of truth) + legacy JSON for rollout
    const upsertPayload = {
      form_key: formKey,
      template_type: templateType,
      subject_template: template.subject_template,
      body_variables: template.body_variables,
      base_template: template.base_template ?? "default",
      is_active: !!template.is_active,
      updated_at: new Date().toISOString(),
    } as any;

    // Perform update-or-insert without relying on composite unique constraint
    const { data: existingRow } = await supabase
      .from("form_email_templates")
      .select("id")
      .eq("form_key", formKey)
      .eq("template_type", templateType)
      .maybeSingle();

    let persistedRow: any = null;
    if (existingRow?.id) {
      const { data: updated, error: updateErr } = await supabase
        .from("form_email_templates")
        .update(upsertPayload)
        .eq("id", existingRow.id)
        .select()
        .single();
      if (updateErr) {
        console.error("Error updating form_email_templates:", updateErr);
        return NextResponse.json(
          { error: "Failed to update email template" },
          { status: 500 },
        );
      }
      persistedRow = updated;
    } else {
      const insertPayload = {
        ...upsertPayload,
        created_at: new Date().toISOString(),
      } as any;
      const { data: inserted, error: insertErr } = await supabase
        .from("form_email_templates")
        .insert(insertPayload)
        .select()
        .single();
      if (insertErr) {
        console.error("Error inserting form_email_templates:", insertErr);
        return NextResponse.json(
          { error: "Failed to update email template" },
          { status: 500 },
        );
      }
      persistedRow = inserted;
    }

    // Finalized: do not write legacy JSON into form_types.config anymore

    // Log event
    await audit.logEvent({
      action: "email_template_updated",
      resource: "form_email_templates",
      resource_id: persistedRow?.id || `${formKey}:${templateType}`,
      actor_id: _user?.id,
      actor_role: "admin",
      result: "success",
      correlation_id: crypto.randomUUID(),
      meta: {
        form_key: formKey,
        template_type: templateType,
        subject_template: template.subject_template,
        is_active: template.is_active,
      },
    });

    return NextResponse.json({ success: true, template: persistedRow });
  } catch (error) {
    console.error("Error in email template update API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
