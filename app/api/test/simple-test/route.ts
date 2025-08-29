import { NextRequest, NextResponse } from "next/server";
import { guardTestEndpoint } from "@/app/lib/test-guard";

export async function GET(request: NextRequest) {
  const guard = guardTestEndpoint(request);
  if (!guard.allowed) {
    return new Response(guard.message, { status: guard.status });
  }

  return NextResponse.json({ message: "Simple test endpoint working" });
}

export async function POST(request: NextRequest) {
  const guard = guardTestEndpoint(request);
  if (!guard.allowed) {
    return new Response(guard.message, { status: guard.status });
  }

  const body = await request.json();
  return NextResponse.json({
    message: "POST test endpoint working",
    received: body,
  });
}
