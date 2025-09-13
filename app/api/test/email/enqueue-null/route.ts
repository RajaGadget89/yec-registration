/**
 * Test endpoint for triggering outbox content validation failures
 * Used for testing the hardening features
 */

import { NextRequest, NextResponse } from "next/server";
import { enqueueEmail } from "../../../../lib/emails/dispatcher";
import { guardTestEndpoint } from "../../../../lib/test-guard";

export async function POST(request: NextRequest) {
  const guard = guardTestEndpoint(request);
  if (guard) return guard;

  try {
    const body = await request.json();
    const { template, toEmail, payload } = body;

    // This will trigger the outbox validation
    await enqueueEmail(template, toEmail, payload);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      },
      { status: 400 },
    );
  }
}
