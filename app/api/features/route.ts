import { NextResponse } from "next/server";
import { isFeatureEnabled, FEATURES } from "../../lib/features";

export async function GET() {
  try {
    const flags = {
      adminJobAssignment: isFeatureEnabled(FEATURES.ADMIN_JOB_ASSIGNMENT),
      granularRBAC: isFeatureEnabled(FEATURES.GRANULAR_RBAC),
      adminManagement: isFeatureEnabled(FEATURES.ADMIN_MANAGEMENT),
    };

    return NextResponse.json(flags);
  } catch (error) {
    console.error("Error getting feature flags:", error);
    return NextResponse.json(
      { error: "Failed to get feature flags" },
      { status: 500 },
    );
  }
}
