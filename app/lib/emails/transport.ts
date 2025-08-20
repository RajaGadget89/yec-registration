/**
 * Email Transport Layer
 * Provides safe, local-only capped-send mode for emails with allowlist and per-run cap functionality
 */

import { Resend } from "resend";
import { getEmailFromAddress } from "../config";

export type SendResult = {
  ok: boolean;
  id?: string;
  reason?: "capped" | "blocked" | "provider_error" | "dry_run" | "rate_limited";
  sentCount?: number;
  rateLimited?: number;
  retries?: number;
};

export interface EmailTransport {
  send(input: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<SendResult>;
  getStats(): {
    sent: number;
    capped: number;
    blocked: number;
    errors: number;
    rateLimited: number;
    retries: number;
  };
  resetStats(): void;
}

/**
 * Dry Run Transport - never calls provider
 */
class DryRunTransport implements EmailTransport {
  private stats = {
    sent: 0,
    capped: 0,
    blocked: 0,
    errors: 0,
    rateLimited: 0,
    retries: 0,
  };

  async send(input: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<SendResult> {
    console.log(`[DRY-RUN] Would send email to ${input.to}: ${input.subject}`);
    this.stats.sent++;
    return { ok: true, reason: "dry_run" };
  }

  getStats() {
    return { ...this.stats };
  }

  resetStats() {
    this.stats = {
      sent: 0,
      capped: 0,
      blocked: 0,
      errors: 0,
      rateLimited: 0,
      retries: 0,
    };
  }
}

/**
 * Utility function to add jitter to backoff delays
 */
function addJitter(baseDelay: number, jitterMs: number = 100): number {
  const jitter = Math.random() * jitterMs * 2 - jitterMs; // ±jitterMs
  return Math.max(0, baseDelay + jitter);
}

/**
 * Utility function to sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resend Transport - calls real provider with throttle and retry logic
 */
class ResendTransport implements EmailTransport {
  private resend: Resend;
  private fromEmail: string;
  private stats = {
    sent: 0,
    capped: 0,
    blocked: 0,
    errors: 0,
    rateLimited: 0,
    retries: 0,
  };
  private sendLog: Array<{
    to: string;
    subject: string;
    timestamp: string;
    attempt: number;
    status: string;
  }> = [];
  private lastSendTime = 0;

  // Throttle and retry configuration
  private throttleMs: number;
  private maxRetries: number;
  private baseBackoffMs: number;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is required");
    }

    this.resend = new Resend(apiKey);
    this.fromEmail = getEmailFromAddress();

    // Load throttle and retry configuration
    this.throttleMs = parseInt(process.env.EMAIL_THROTTLE_MS || "500", 10);
    this.maxRetries = parseInt(process.env.EMAIL_RETRY_ON_429 || "2", 10);
    this.baseBackoffMs = parseInt(
      process.env.EMAIL_BASE_BACKOFF_MS || "500",
      10,
    );

    console.log(
      `[RESEND] Transport initialized with throttle=${this.throttleMs}ms, maxRetries=${this.maxRetries}, baseBackoff=${this.baseBackoffMs}ms`,
    );
  }

  async send(input: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<SendResult> {
    // Apply throttle - wait if needed
    const now = Date.now();
    const timeSinceLastSend = now - this.lastSendTime;
    if (timeSinceLastSend < this.throttleMs) {
      const waitTime = this.throttleMs - timeSinceLastSend;
      console.log(
        `[RESEND] Throttling: waiting ${waitTime}ms before sending to ${input.to}`,
      );
      await sleep(waitTime);
    }

    let attempt = 0;
    let rateLimited = 0;
    let retries = 0;

    while (attempt <= this.maxRetries) {
      attempt++;

      try {
        // Log send attempt (dev only)
        if (process.env.NODE_ENV === "development") {
          console.log(
            `[RESEND] Sending to ${input.to} (attempt ${attempt}/${this.maxRetries + 1})`,
          );
        }

        const { error, data } = await this.resend.emails.send({
          from: this.fromEmail,
          to: input.to,
          subject: input.subject,
          html: input.html,
          text: input.text,
        });

        if (error) {
          // Check if it's a rate limit error (429)
          const errorAny = error as any;
          const isRateLimit =
            errorAny.statusCode === 429 ||
            errorAny.status === 429 ||
            error.message?.includes("429") ||
            error.message?.includes("rate limit");

          if (isRateLimit) {
            rateLimited++;
            this.stats.rateLimited++;

            if (attempt <= this.maxRetries) {
              const backoffDelay = addJitter(this.baseBackoffMs * attempt);
              console.log(
                `[RESEND] Rate limited (429), retrying in ${Math.round(backoffDelay)}ms (attempt ${attempt}/${this.maxRetries + 1})`,
              );
              retries++;
              this.stats.retries++;
              await sleep(backoffDelay);
              continue;
            } else {
              console.error(
                "[RESEND] Max retries exceeded for rate limit:",
                error,
              );
              this.stats.errors++;
              return {
                ok: false,
                reason: "rate_limited",
                rateLimited,
                retries,
              };
            }
          } else {
            // Non-rate-limit error
            console.error("Resend email sending error:", error);
            this.stats.errors++;
            return {
              ok: false,
              reason: "provider_error",
              rateLimited,
              retries,
            };
          }
        }

        // Success
        this.lastSendTime = Date.now();
        console.log("Email sent successfully via Resend to:", input.to);
        this.stats.sent++;

        // Log the send for testing purposes
        this.sendLog.push({
          to: input.to,
          subject: input.subject,
          timestamp: new Date().toISOString(),
          attempt,
          status: "success",
        });

        return {
          ok: true,
          id: data?.id,
          rateLimited,
          retries,
        };
      } catch (err) {
        // Network or unexpected errors
        console.error("Unexpected error in Resend sendEmail:", err);
        this.stats.errors++;
        return {
          ok: false,
          reason: "provider_error",
          rateLimited,
          retries,
        };
      }
    }

    // Should never reach here, but just in case
    this.stats.errors++;
    return {
      ok: false,
      reason: "provider_error",
      rateLimited,
      retries,
    };
  }

  getStats() {
    return { ...this.stats };
  }

  resetStats() {
    this.stats = {
      sent: 0,
      capped: 0,
      blocked: 0,
      errors: 0,
      rateLimited: 0,
      retries: 0,
    };
    this.sendLog = [];
    this.lastSendTime = 0;
  }

  // Dev-only method to get send log for testing
  getSendLog() {
    return [...this.sendLog];
  }
}

/**
 * Safe-Send Transport - implements Safe-Send Gate for non-prod environments
 * Enforces allowlist and provides audit logging
 */
class SafeSendTransport implements EmailTransport {
  private wrappedTransport: EmailTransport;
  private stats = {
    sent: 0,
    capped: 0,
    blocked: 0,
    errors: 0,
    rateLimited: 0,
    retries: 0,
  };

  constructor(wrappedTransport: EmailTransport) {
    this.wrappedTransport = wrappedTransport;
    console.log("[SAFE-SEND] Transport initialized with Safe-Send Gate");
  }

  async send(input: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<SendResult> {
    const toEmail = input.to.toLowerCase();
    const allowCheck = isEmailAllowed(toEmail);

    if (!allowCheck.allowed) {
      console.log(
        `[SAFE-SEND] Blocked email to ${input.to}: ${allowCheck.reason}`,
      );
      this.stats.blocked++;

      // Log audit for blocked emails
      await this.logAudit({
        action: "email.blocked",
        recipient: input.to,
        reason: allowCheck.reason,
        subject: input.subject,
      });

      return { ok: false, reason: "blocked" };
    }

    // Send via wrapped transport
    const result = await this.wrappedTransport.send(input);

    if (result.ok) {
      this.stats.sent++;

      // Log audit for sent emails
      await this.logAudit({
        action: "email.sent",
        recipient: input.to,
        subject: input.subject,
        success: true,
      });
    } else {
      this.stats.errors++;

      // Log audit for failed emails
      await this.logAudit({
        action: "email.failed",
        recipient: input.to,
        subject: input.subject,
        success: false,
        error: result.reason,
      });
    }

    // Aggregate rate limiting and retry stats from wrapped transport
    if (result.rateLimited !== undefined) {
      this.stats.rateLimited += result.rateLimited;
    }
    if (result.retries !== undefined) {
      this.stats.retries += result.retries;
    }

    return result;
  }

  getStats() {
    // Combine stats from wrapped transport
    const wrappedStats = this.wrappedTransport.getStats();
    return {
      sent: this.stats.sent,
      capped: this.stats.capped,
      blocked: this.stats.blocked,
      errors: this.stats.errors,
      rateLimited: wrappedStats.rateLimited,
      retries: wrappedStats.retries,
    };
  }

  resetStats() {
    this.stats = {
      sent: 0,
      capped: 0,
      blocked: 0,
      errors: 0,
      rateLimited: 0,
      retries: 0,
    };
    if ("resetStats" in this.wrappedTransport) {
      this.wrappedTransport.resetStats();
    }
  }

  // Dev-only method to get send log from wrapped transport
  getSendLog() {
    if ("getSendLog" in this.wrappedTransport) {
      return (this.wrappedTransport as any).getSendLog();
    }
    return [];
  }

  private async logAudit(data: {
    action: string;
    recipient: string;
    subject: string;
    success?: boolean;
    reason?: string;
    error?: string;
  }) {
    try {
      // Log to console for now, can be extended to database audit
      console.log(`[AUDIT] ${data.action}:`, {
        recipient: data.recipient,
        subject: data.subject,
        success: data.success,
        reason: data.reason,
        error: data.error,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn("[SAFE-SEND] Failed to log audit:", error);
    }
  }
}

/**
 * Capped Transport - wraps a real transport with safety controls
 * @deprecated This class is defined but not currently used
 */
/*
class CappedTransport implements EmailTransport {
  private wrappedTransport: EmailTransport;
  private allowlist: Set<string>;
  private capMaxPerRun: number;
  private blockNonAllowlist: boolean;
  private subjectPrefix: string;
  private sentCount = 0;
  private stats = {
    sent: 0,
    capped: 0,
    blocked: 0,
    errors: 0,
    rateLimited: 0,
    retries: 0,
  };

  constructor(wrappedTransport: EmailTransport) {
    this.wrappedTransport = wrappedTransport;

    // Load configuration from environment
    const allowlistStr = process.env.EMAIL_ALLOWLIST || "";
    this.allowlist = new Set(
      allowlistStr
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    );

    this.capMaxPerRun = parseInt(process.env.EMAIL_CAP_MAX_PER_RUN || "2", 10);
    this.blockNonAllowlist = process.env.BLOCK_NON_ALLOWLIST === "true";
    this.subjectPrefix = process.env.EMAIL_SUBJECT_PREFIX || "[E2E]";

    console.log(
      `[CAPPED] Transport initialized with cap=${this.capMaxPerRun}, allowlist=${Array.from(this.allowlist)}, blockNonAllowlist=${this.blockNonAllowlist}`,
    );
  }
*/

/*
  async send(input: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<SendResult> {
    const toEmail = input.to.toLowerCase();

    // Check allowlist
    if (this.allowlist.size > 0 && !this.allowlist.has(toEmail)) {
      console.log(`[CAPPED] Blocked email to ${input.to} (not in allowlist)`);
      this.stats.blocked++;
      return { ok: false, reason: "blocked" };
    }

    // Check cap
    if (this.sentCount >= this.capMaxPerRun) {
      console.log(
        `[CAPPED] Capped email to ${input.to} (cap reached: ${this.sentCount}/${this.capMaxPerRun})`,
      );
      this.stats.capped++;
      return { ok: false, reason: "capped" };
    }

    // Apply subject prefix
    const prefixedSubject = `${this.subjectPrefix} ${input.subject}`;

    // Send via wrapped transport
    const result = await this.wrappedTransport.send({
      ...input,
      subject: prefixedSubject,
    });

    if (result.ok) {
      this.sentCount++;
      this.stats.sent++;
    } else {
      this.stats.errors++;
    }

    // Aggregate rate limiting and retry stats from wrapped transport
    if (result.rateLimited !== undefined) {
      this.stats.rateLimited += result.rateLimited;
    }
    if (result.retries !== undefined) {
      this.stats.retries += result.retries;
    }

    return result;
  }

  getStats() {
    // Combine stats from wrapped transport
    const wrappedStats = this.wrappedTransport.getStats();
    return {
      sent: this.stats.sent,
      capped: this.stats.capped,
      blocked: this.stats.blocked,
      errors: this.stats.errors,
      rateLimited: wrappedStats.rateLimited,
      retries: wrappedStats.retries,
    };
  }

  resetStats() {
    this.stats = {
      sent: 0,
      capped: 0,
      blocked: 0,
      errors: 0,
      rateLimited: 0,
      retries: 0,
    };
    this.sentCount = 0;
    if ("resetStats" in this.wrappedTransport) {
      this.wrappedTransport.resetStats();
    }
  }

  // Dev-only method to get send log from wrapped transport
  getSendLog() {
    if ("getSendLog" in this.wrappedTransport) {
      return (this.wrappedTransport as any).getSendLog();
    }
    return [];
  }
}
*/

import { getEmailConfig, isEmailAllowed } from "./config";

/**
 * Factory function to create the appropriate email transport based on Safe-Send Gate
 */
export function getEmailTransport(): EmailTransport {
  const config = getEmailConfig();

  console.log(`[EMAIL] Creating transport with Safe-Send Gate:`, {
    mode: config.mode,
    allowlistSize: config.allowlist.size,
    isProduction: config.isProduction,
  });

  // In production, always use ResendTransport if API key is available
  if (config.isProduction) {
    if (config.resendApiKey) {
      return new ResendTransport();
    } else {
      console.error("[EMAIL] RESEND_API_KEY required in production");
      throw new Error("RESEND_API_KEY required in production");
    }
  }

  // In non-prod, use Safe-Send Gate
  switch (config.mode) {
    case "DRY_RUN":
      return new DryRunTransport();

    case "FULL":
      if (config.resendApiKey) {
        return new SafeSendTransport(new ResendTransport());
      } else {
        console.warn(
          "[EMAIL] RESEND_API_KEY not available, falling back to DRY_RUN",
        );
        return new DryRunTransport();
      }

    default:
      console.warn(
        `[EMAIL] Unknown EMAIL_MODE: ${config.mode}, defaulting to DRY_RUN`,
      );
      return new DryRunTransport();
  }
}

/**
 * Get current email transport configuration
 */
export function getEmailTransportConfig() {
  const emailMode = process.env.EMAIL_MODE || "DRY_RUN";
  const allowlist = process.env.EMAIL_ALLOWLIST || "";
  const capMaxPerRun = process.env.EMAIL_CAP_MAX_PER_RUN || "2";
  const blockNonAllowlist = process.env.BLOCK_NON_ALLOWLIST === "true";
  const subjectPrefix = process.env.EMAIL_SUBJECT_PREFIX || "[E2E]";

  return {
    mode: emailMode,
    allowlist: allowlist
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean),
    capMaxPerRun: parseInt(capMaxPerRun, 10),
    blockNonAllowlist,
    subjectPrefix,
    resendConfigured: !!process.env.RESEND_API_KEY,
  };
}
