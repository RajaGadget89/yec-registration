import { NextRequest, NextResponse } from "next/server";

// Temporarily disable during build to prevent Html import issues
export async function POST() {
  return NextResponse.json(
    { error: "Email rendering disabled during build" },
    { status: 503 }
  );
}
