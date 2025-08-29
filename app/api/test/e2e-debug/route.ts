import { NextRequest, NextResponse } from "next/server";
import { isE2E } from "../../../lib/env/isE2E";

export async function GET(request: NextRequest) {
  const e2eMode = isE2E();
  const e2eTestMode = process.env.E2E_TEST_MODE;
  const bypassHeader = request.headers.get("X-E2E-RLS-BYPASS");

  return NextResponse.json({
    e2eMode,
    e2eTestMode,
    bypassHeader,
    shouldUseServiceClient: e2eMode && bypassHeader === "1",
  });
}
