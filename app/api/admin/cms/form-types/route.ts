import { NextRequest, NextResponse } from "next/server";
import { withContentManagementGuard } from "../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../lib/auth-utils.server";
import { formTypeService } from "../../../../lib/form-system/formTypeService";

/**
 * GET /api/admin/cms/form-types
 * Get all form types with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const active = searchParams.get("active");

    const formTypes = await formTypeService.list(
      active ? active === "true" : undefined
    );

    return NextResponse.json({
      formTypes,
      total: formTypes.length
    });
  } catch (error) {
    console.error("Form types GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch form types" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/cms/form-types
 * Create a new form type
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.form_key || !body.name) {
      return NextResponse.json(
        { error: "Form key and name are required" },
        { status: 400 }
      );
    }

    // Validate form configuration
    const validation = formTypeService.validateConfig(body.config);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Invalid form configuration", details: validation.errors },
        { status: 400 }
      );
    }

    // Check if form key already exists
    const existing = await formTypeService.getByFormKey(body.form_key);
    if (existing) {
      return NextResponse.json(
        { error: "Form key already exists" },
        { status: 400 }
      );
    }

    const formType = await formTypeService.create({
      form_key: body.form_key,
      name: body.name,
      description: body.description,
      config: body.config,
      is_active: body.is_active !== undefined ? body.is_active : true
    });

    return NextResponse.json(formType, { status: 201 });
  } catch (error) {
    console.error("Form type creation error:", error);
    return NextResponse.json(
      { error: "Failed to create form type" },
      { status: 500 }
    );
  }
}
