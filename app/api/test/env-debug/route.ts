import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    E2E_TEST_MODE: process.env.E2E_TEST_MODE,
    TEST_HELPERS_ENABLED: process.env.TEST_HELPERS_ENABLED,
    E2E_AUTH_SECRET: process.env.E2E_AUTH_SECRET ? "SET" : "NOT_SET",
    NODE_ENV: process.env.NODE_ENV,
  });
}
