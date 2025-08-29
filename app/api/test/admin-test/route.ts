import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    console.log("Admin test endpoint called");

    // Test params handling
    const { id } = await params;
    console.log("Admin ID from params:", id);

    // Parse request body
    const body = await request.json();
    console.log("Request body:", body);

    return NextResponse.json({
      success: true,
      message: "Admin test endpoint working",
      received: body,
      adminId: id,
    });
  } catch (error) {
    console.error("Error in admin test endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
