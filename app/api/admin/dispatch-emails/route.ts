import { NextRequest, NextResponse } from "next/server";
import { dispatchEmailBatch } from "../../../lib/emails/dispatcher";
import { validateAdminAccess } from "../../../lib/admin-guard-server";

// lint-only typing; logic unchanged
interface DispatchBody {
  batchSize?: number;
  dryRun?: boolean;
}

/**
 * Admin API route for dispatching emails from the outbox
 * GET: Get outbox statistics or dispatch emails (for cron)
 * POST: Manually dispatch a batch of emails (for admin UI)
 *
 * Authentication:
 * - CRON_SECRET required for both GET and POST (via Authorization header, query param, or x-cron-secret header)
 * - Admin authentication also supported for POST (admin UI)
 */

/**
 * Check if request is authorized via CRON_SECRET
 */
function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET environment variable not set");
    return false;
  }

  // Check Authorization header: Bearer <token>
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    if (token === cronSecret) {
      return true;
    }
  }

  // Check query parameter: ?cron_secret=<token>
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("cron_secret");
  if (querySecret === cronSecret) {
    return true;
  }

  // Check custom header: x-cron-secret
  const customHeader = req.headers.get("x-cron-secret");
  if (customHeader === cronSecret) {
    return true;
  }

  return false;
}

/**
 * Check if request is in dry-run mode
 * Respects EMAIL_MODE setting and DISPATCH_DRY_RUN environment variable
 */
function isDryRun(req: NextRequest, body?: DispatchBody): boolean {
  const emailMode = process.env.EMAIL_MODE || "DRY_RUN";
  const dispatchDryRun = process.env.DISPATCH_DRY_RUN;

  // If EMAIL_MODE is DRY_RUN, always return true
  if (emailMode.toUpperCase() === "DRY_RUN") {
    return true;
  }

  // If DISPATCH_DRY_RUN is set to 'true', force dry-run mode
  if (dispatchDryRun === "true") {
    return true;
  }

  // Check query parameter for GET requests
  const url = new URL(req.url);
  if (url.searchParams.get("dry_run") === "true") {
    return true;
  }

  // Check request body for POST requests
  if (body && body.dryRun === true) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  try {
    // Check CRON_SECRET authorization first
    const isCronAuthorized = isAuthorized(request);

    // If not cron authorized, check admin access
    if (!isCronAuthorized) {
      const adminCheck = validateAdminAccess(request);
      if (!adminCheck.valid) {
        console.log(
          "[dispatch-emails] GET request unauthorized - no CRON_SECRET and no valid admin access",
        );
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      console.log(
        `[dispatch-emails] GET request authorized via admin access: ${adminCheck.adminEmail}`,
      );
    } else {
      console.log("[dispatch-emails] GET request authorized via CRON_SECRET");
    }

    // Check for dry-run mode
    const dryRun = isDryRun(request);

    // For GET requests, dispatch emails and return compact result
    const result = await dispatchEmailBatch(50, dryRun); // Default batch size

    return NextResponse.json({
      ok: true,
      dryRun,
      sent: result.sent,
      wouldSend: result.wouldSend,
      capped: result.capped,
      blocked: result.blocked,
      errors: result.errors,
      remaining: result.remaining,
      rateLimited: result.rateLimited,
      retries: result.retries,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to dispatch emails via GET:", error);
    return NextResponse.json(
      {
        error: "Failed to dispatch emails",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check CRON_SECRET authorization first
    const isCronAuthorized = isAuthorized(request);

    // If not cron authorized, check admin access
    if (!isCronAuthorized) {
      const adminCheck = validateAdminAccess(request);
      if (!adminCheck.valid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Parse request body
    let body: DispatchBody = {};
    try {
      body = await request.json();
    } catch (_e) {
      // If no body, use empty object
      void _e; // used to satisfy lint without changing config
    }

    const batchSize = body.batchSize ?? 50;
    const dryRun = isDryRun(request, body);

    // Validate batch size
    if (batchSize < 1 || batchSize > 100) {
      return NextResponse.json(
        {
          error: "Invalid batch size",
          message: "Batch size must be between 1 and 100",
        },
        { status: 400 },
      );
    }

    // Dispatch email batch
    const result = await dispatchEmailBatch(batchSize, dryRun);

    return NextResponse.json({
      ok: true,
      dryRun,
      sent: result.sent,
      wouldSend: result.wouldSend,
      capped: result.capped,
      blocked: result.blocked,
      errors: result.errors,
      remaining: result.remaining,
      rateLimited: result.rateLimited,
      retries: result.retries,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to dispatch emails:", error);
    return NextResponse.json(
      {
        error: "Failed to dispatch emails",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
