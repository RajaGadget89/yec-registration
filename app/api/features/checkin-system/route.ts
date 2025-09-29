import { NextRequest, NextResponse } from "next/server";
import { isCheckinSystemEnabled } from "../../../lib/features";

/**
 * GET /api/features/checkin-system
 * Check if check-in system feature is enabled
 */
export async function GET(_req: NextRequest) {
  try {
    const isEnabled = isCheckinSystemEnabled();

    return NextResponse.json({
      enabled: isEnabled,
      feature: "CHECKIN_SYSTEM",
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to check feature status" },
      { status: 500 },
    );
  }
}
