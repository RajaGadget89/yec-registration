import { NextRequest, NextResponse } from "next/server";
import { approvalBadgeService } from "@/lib/approvalBadgeService";
import { getCurrentUser } from "@/lib/auth-utils.server";

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user || !user.is_active) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check authorization
    if (!["admin", "super_admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { registrationId } = await req.json();

    if (!registrationId) {
      return NextResponse.json(
        { error: "Registration ID required" },
        { status: 400 },
      );
    }

    // Generate approval badge
    const badgeUrl =
      await approvalBadgeService.generateApprovalBadge(registrationId);

    return NextResponse.json({
      success: true,
      badgeUrl,
      message: "Approval badge generated successfully",
    });
  } catch (error) {
    console.error("Approval badge generation error:", error);
    return NextResponse.json(
      {
        error: "Badge generation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
