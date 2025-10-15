import { NextRequest, NextResponse } from "next/server";
import { formTypeService } from "../../../../../lib/form-system/formTypeService";

/**
 * GET /api/cms/form-types/[formKey]
 * Get a specific form type by form key (public endpoint for form rendering)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formKey: string }> }
) {
  try {
    const { formKey } = await params;
    
    const formType = await formTypeService.getByFormKey(formKey);

    if (!formType) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 }
      );
    }

    if (!formType.is_active) {
      return NextResponse.json(
        { error: "Form is not active" },
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
