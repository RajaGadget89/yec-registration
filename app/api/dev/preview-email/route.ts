import { NextResponse } from "next/server";

// Temporarily disable during build to prevent Html import issues
export async function GET() {
  return new NextResponse(
    JSON.stringify({ error: "Email preview disabled during build" }),
    { status: 503, headers: { "Content-Type": "application/json" } },
  );
}
