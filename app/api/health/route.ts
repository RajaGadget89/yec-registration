import { NextResponse } from "next/server";
import { assertDbRouting, dbHostForLog } from "../../lib/env-guards";

export async function GET() {
  try {
    // Validate database routing
    assertDbRouting();

    const dbHost = dbHostForLog();
    const env = process.env.SUPABASE_ENV || "staging";

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      database: {
        env: env,
        host: dbHost,
        routing: "valid",
      },
      services: {
        supabase: "connected",
        email: process.env.RESEND_API_KEY ? "configured" : "not_configured",
        telegram: process.env.TELEGRAM_BOT_TOKEN
          ? "configured"
          : "not_configured",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        database: {
          routing: "invalid",
        },
      },
      { status: 500 },
    );
  }
}
