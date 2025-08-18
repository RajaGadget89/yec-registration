import { NextRequest, NextResponse } from "next/server";
import { validateAdminAccess } from "../../../lib/admin-guard-server";
import { getEmailConfigStatus, validateEmailConfig } from "../../../lib/emails/config";
import { getEmailTransportConfig } from "../../../lib/emails/transport";
import { getOutboxStats } from "../../../lib/emails/dispatcher";

/**
 * Admin API route for email system diagnostics
 * Returns current email configuration, health status, and recent audit information
 * 
 * Authentication: Admin access required
 */

export async function GET(request: NextRequest) {
  try {
    // Check CRON_SECRET authorization first
    const cronSecret = process.env.CRON_SECRET;
    let isAuthorized = false;

    if (cronSecret) {
      // Check Authorization header: Bearer <token>
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        if (token === cronSecret) {
          isAuthorized = true;
        }
      }

      // Check query parameter: ?cron_secret=<token>
      const url = new URL(request.url);
      const querySecret = url.searchParams.get("cron_secret");
      if (querySecret === cronSecret) {
        isAuthorized = true;
      }

      // Check custom header: x-cron-secret
      const customHeader = request.headers.get("x-cron-secret");
      if (customHeader === cronSecret) {
        isAuthorized = true;
      }
    }

    // If not authorized via CRON_SECRET, check admin access
    if (!isAuthorized) {
      const adminCheck = validateAdminAccess(request);
      if (!adminCheck.valid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Get email configuration status
    const configStatus = getEmailConfigStatus();
    const transportConfig = getEmailTransportConfig();
    const validation = validateEmailConfig();

    // Get outbox statistics
    const outboxStats = await getOutboxStats();

    // Test provider health (lightweight ping)
    let providerHealth = "unknown";
    try {
      // This is a lightweight check - we don't actually send an email
      const hasApiKey = !!process.env.RESEND_API_KEY;
      providerHealth = hasApiKey ? "configured" : "not_configured";
    } catch {
      providerHealth = "error";
    }

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      
      // Configuration
      config: {
        mode: configStatus.mode,
        allowlist: configStatus.allowlist,
        allowlistSize: configStatus.allowlistSize,
        fromEmail: configStatus.fromEmail,
        resendConfigured: configStatus.resendConfigured,
        isProduction: configStatus.isProduction,
        nodeEnv: configStatus.nodeEnv,
      },
      
      // Transport configuration
      transport: {
        mode: transportConfig.mode,
        allowlist: transportConfig.allowlist,
        capMaxPerRun: transportConfig.capMaxPerRun,
        blockNonAllowlist: transportConfig.blockNonAllowlist,
        subjectPrefix: transportConfig.subjectPrefix,
        resendConfigured: transportConfig.resendConfigured,
      },
      
      // Validation
      validation: {
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
      },
      
      // Health
      health: {
        provider: providerHealth,
        outbox: outboxStats,
      },
      
      // Environment variables (safe subset)
      env: {
        EMAIL_MODE: process.env.EMAIL_MODE || "not_set",
        DISPATCH_DRY_RUN: process.env.DISPATCH_DRY_RUN || "not_set",
        RESEND_API_KEY: process.env.RESEND_API_KEY ? "set" : "not_set",
        EMAIL_FROM: process.env.EMAIL_FROM || "not_set",
        CRON_SECRET: process.env.CRON_SECRET ? "set" : "not_set",
        SUPABASE_ENV: process.env.SUPABASE_ENV || "not_set",
        NODE_ENV: process.env.NODE_ENV || "not_set",
      },
    });
  } catch (error) {
    console.error("Failed to get email status:", error);
    return NextResponse.json(
      {
        error: "Failed to get email status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
