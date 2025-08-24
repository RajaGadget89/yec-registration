import { getEmailFromAddress } from "../config";

/**
 * Email configuration and Safe-Send Gate
 * Implements non-prod safety controls for email sending
 */

export interface EmailConfig {
  mode: "FULL" | "DRY_RUN" | "CAPPED";
  allowlist: Set<string>;
  fromEmail: string;
  resendApiKey: string | null;
  isProduction: boolean;
}

/**
 * Log email configuration on server boot (dev only)
 */
export function logEmailConfigOnBoot() {
  if (process.env.NODE_ENV === "development") {
    const config = getEmailConfig();
    const allowlistCount = config.allowlist.size;
    const fromEmail = config.fromEmail;
    const apiKeyStatus = config.resendApiKey ? "set" : "unset";

    console.log(
      `[Email] MODE=${config.mode} ALLOWLIST=${allowlistCount} FROM=${fromEmail} KEY=${apiKeyStatus}`,
    );
  }
}

/**
 * Get current email configuration
 */
export function getEmailConfig(): EmailConfig {
  const emailMode = (process.env.EMAIL_MODE || "DRY_RUN").toUpperCase() as
    | "FULL"
    | "DRY_RUN"
    | "CAPPED";
  const allowlistStr = process.env.EMAIL_ALLOWLIST || "";
  const allowlist = new Set(
    allowlistStr
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
  const fromEmail = getEmailFromAddress();
  const resendApiKey = process.env.RESEND_API_KEY || null;
  const isProduction = process.env.NODE_ENV === "production";

  return {
    mode: emailMode,
    allowlist,
    fromEmail,
    resendApiKey,
    isProduction,
  };
}

/**
 * Check if email sending is allowed for a given recipient
 * Implements Safe-Send Gate for non-prod environments
 */
export function isEmailAllowed(recipientEmail: string): {
  allowed: boolean;
  reason: "allowed" | "not_in_allowlist" | "dry_run_mode" | "no_api_key";
} {
  const config = getEmailConfig();
  const recipient = recipientEmail.toLowerCase();

  // In production, always allow if we have API key
  if (config.isProduction) {
    if (!config.resendApiKey) {
      return { allowed: false, reason: "no_api_key" };
    }
    return { allowed: true, reason: "allowed" };
  }

  // In non-prod, check mode and allowlist
  if (config.mode === "DRY_RUN") {
    return { allowed: false, reason: "dry_run_mode" };
  }

  if (config.mode === "FULL" || config.mode === "CAPPED") {
    // Check allowlist if configured
    if (config.allowlist.size > 0) {
      if (config.allowlist.has(recipient)) {
        return { allowed: true, reason: "allowed" };
      } else {
        return { allowed: false, reason: "not_in_allowlist" };
      }
    }
    // If no allowlist configured, allow all (but warn)
    console.warn(
      `[EMAIL] No EMAIL_ALLOWLIST configured in ${config.mode} mode - allowing all emails`,
    );
    return { allowed: true, reason: "allowed" };
  }

  // Default to not allowed
  return { allowed: false, reason: "dry_run_mode" };
}

/**
 * Get email configuration status for diagnostics
 */
export function getEmailConfigStatus() {
  const config = getEmailConfig();

  return {
    mode: config.mode,
    allowlist: Array.from(config.allowlist),
    allowlistSize: config.allowlist.size,
    fromEmail: config.fromEmail,
    resendConfigured: !!config.resendApiKey,
    isProduction: config.isProduction,
    nodeEnv: process.env.NODE_ENV,
  };
}

/**
 * Validate email configuration for current environment
 */
export function validateEmailConfig(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required configuration
  const fromEmail = process.env.EMAIL_FROM;
  if (!fromEmail) {
    errors.push("EMAIL_FROM not configured");
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const emailMode = (process.env.EMAIL_MODE || "DRY_RUN").toUpperCase();
  if (emailMode === "FULL" && !resendApiKey) {
    errors.push("RESEND_API_KEY required for FULL mode");
  }

  // Check allowlist configuration
  const allowlistStr = process.env.EMAIL_ALLOWLIST || "";
  const allowlist = new Set(
    allowlistStr
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );

  if (
    emailMode === "FULL" &&
    allowlist.size === 0 &&
    process.env.NODE_ENV !== "production"
  ) {
    warnings.push(
      "No EMAIL_ALLOWLIST configured in FULL mode - all emails will be sent",
    );
  }

  // Check production configuration
  if (process.env.NODE_ENV === "production" && emailMode === "DRY_RUN") {
    warnings.push("EMAIL_MODE=DRY_RUN in production environment");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
