import { NextRequest, NextResponse } from "next/server";
import { withContentManagementGuard } from "../../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../../lib/auth-utils.server";
import { formTypeService } from "../../../../../lib/form-system/formTypeService";

/**
 * GET /api/admin/cms/form-types/[id]
 * Get a specific form type by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const formType = await formTypeService.getById(id);

    if (!formType) {
      return NextResponse.json(
        { error: "Form type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(formType);
  } catch (error) {
    console.error("Form type GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch form type" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/cms/form-types/[id]
 * Update a specific form type
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Check if form type exists
    const existing = await formTypeService.getById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Form type not found" },
        { status: 404 }
      );
    }

    // Validate form configuration if provided
    if (body.config) {
      const validation = formTypeService.validateConfig(body.config);
      if (!validation.valid) {
        return NextResponse.json(
          { error: "Invalid form configuration", details: validation.errors },
          { status: 400 }
        );
      }
    }

    // Check if form key is being changed and if new key already exists
    if (body.form_key && body.form_key !== existing.form_key) {
      const keyExists = await formTypeService.getByFormKey(body.form_key);
      if (keyExists) {
        return NextResponse.json(
          { error: "Form key already exists" },
          { status: 400 }
        );
      }
    }

    const updatedFormType = await formTypeService.update(id, body);

    return NextResponse.json(updatedFormType);
  } catch (error) {
    console.error("Form type update error:", error);
    return NextResponse.json(
      { error: "Failed to update form type" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/cms/form-types/[id]
 * Delete a specific form type
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if form type exists
    const existing = await formTypeService.getById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Form type not found" },
        { status: 404 }
      );
    }

    await formTypeService.delete(id);

    return NextResponse.json({ message: "Form type deleted successfully" });
  } catch (error) {
    console.error("Form type deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete form type" },
      { status: 500 }
    );
  }
}
