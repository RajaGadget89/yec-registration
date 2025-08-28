import { NextResponse } from "next/server";
import { getClientFeatureFlags } from "../../lib/features";

export async function GET() {
  try {
    const flags = getClientFeatureFlags();
    
    return NextResponse.json(flags);
  } catch (error) {
    console.error("Error getting feature flags:", error);
    return NextResponse.json(
      { error: "Failed to get feature flags" },
      { status: 500 }
    );
  }
}
