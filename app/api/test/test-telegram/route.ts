import { NextRequest, NextResponse } from "next/server";
import { TelegramNotificationHandler } from "../../../lib/events/handlers/telegramNotificationHandler";
import { EventFactory } from "../../../lib/events/eventFactory";

// Direct access to the telegramOutbox for debugging
declare global {
  var telegramOutbox: Array<{
    text: string;
    timestamp: string;
    messageId?: string;
    success: boolean;
  }>;
}

export async function POST(request: NextRequest) {
  // Security check - only allow in test environment
  const testHelpersEnabled = request.headers.get("X-Test-Helpers-Enabled");
  const authHeader = request.headers.get("Authorization");

  if (testHelpersEnabled !== "1" || !authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Test helpers not enabled or unauthorized" },
      { status: 403 },
    );
  }

  const token = authHeader.replace("Bearer ", "");
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { registration } = body;

    if (!registration) {
      return NextResponse.json(
        { error: "registration is required" },
        { status: 400 },
      );
    }

    console.log("[TEST-TELEGRAM] Creating test event...");

    const event = EventFactory.createRegistrationSubmitted(registration);

    console.log("[TEST-TELEGRAM] Event created:", event.type);

    const telegramHandler = new TelegramNotificationHandler();

    console.log("[TEST-TELEGRAM] Calling Telegram handler...");

    await telegramHandler.handle(event);

    console.log("[TEST-TELEGRAM] Telegram handler completed");

    // Debug: Check the global telegramOutbox directly
    console.log(
      "[TEST-TELEGRAM] Global telegramOutbox length:",
      global.telegramOutbox?.length || 0,
    );
    console.log(
      "[TEST-TELEGRAM] Global telegramOutbox:",
      global.telegramOutbox,
    );

    return NextResponse.json({
      success: true,
      eventType: event.type,
      message: "Telegram handler called successfully",
      debug: {
        globalOutboxLength: global.telegramOutbox?.length || 0,
        globalOutbox: global.telegramOutbox,
      },
    });
  } catch (error) {
    console.error("Test telegram error:", error);
    return NextResponse.json(
      {
        error: "Test telegram failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
