/**
 * Enhanced Email Service
 * Provides production-shaped email notifications with Thai/English templates
 * and secure deep-link tokens for the comprehensive review workflow
 */

import { getSupabaseServiceClient } from "../supabase-server";
import {
  renderEmailTemplate,
  getEmailSubject,
  EmailTemplateProps,
} from "./registry";
import { getEmailTransport } from "./transport";
import { Registration } from "../../types/database";

export interface EmailSendResult {
  ok: boolean;
  template: string;
  to: string;
  subject: string;
  trackingCode?: string;
  ctaUrl?: string;
  badgeUrl?: string;
  error?: string;
  transportResult?: any;
}

export interface DeepLinkTokenResult {
  token: string;
  ctaUrl: string;
  expiresAt: string;
}

/**
 * Generate secure deep-link token for user updates
 */
export async function generateDeepLinkToken(
  registrationId: string,
  dimension: "payment" | "profile" | "tcc",
  adminEmail: string,
  ttlSeconds: number = 86400, // 24 hours
): Promise<DeepLinkTokenResult> {
  const supabase = getSupabaseServiceClient();

  const { data: token, error } = await supabase.rpc(
    "generate_secure_deep_link_token",
    {
      reg_id: registrationId,
      dimension: dimension,
      admin_email: adminEmail,
      ttl_seconds: ttlSeconds,
    },
  );

  if (error) {
    throw new Error(`Failed to generate deep link token: ${error.message}`);
  }

  if (!token) {
    throw new Error("No token generated");
  }

  // Build CTA URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8080";
  const ctaUrl = `${baseUrl}/user/${token}/resubmit`;

  // Get expiration time
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  return {
    token,
    ctaUrl,
    expiresAt,
  };
}

/**
 * Send tracking code email for new registrations
 */
export async function sendTrackingEmail(
  registration: Registration,
  brandTokens?: EmailTemplateProps["brandTokens"],
): Promise<EmailSendResult> {
  const transport = getEmailTransport();
  const applicantName =
    `${registration.first_name} ${registration.last_name}`.trim();

  const props: EmailTemplateProps = {
    applicantName,
    trackingCode: registration.registration_id,
    supportEmail: process.env.EMAIL_FROM || "info@yecday.com",
    brandTokens,
  };

  const html = await renderEmailTemplate("tracking", props);
  const subject = getEmailSubject("tracking");

  const result = await transport.send({
    to: registration.email,
    subject,
    html,
  });

  return {
    ok: result.ok,
    template: "tracking",
    to: registration.email,
    subject,
    trackingCode: registration.registration_id,
    transportResult: result,
  };
}

/**
 * Send update request email with deep-link token
 */
export async function sendUpdateRequestEmail(
  registration: Registration,
  dimension: "payment" | "profile" | "tcc",
  adminEmail: string,
  notes?: string,
  brandTokens?: EmailTemplateProps["brandTokens"],
): Promise<EmailSendResult> {
  const transport = getEmailTransport();
  const applicantName =
    `${registration.first_name} ${registration.last_name}`.trim();

  // Generate deep-link token
  const tokenResult = await generateDeepLinkToken(
    registration.id.toString(),
    dimension,
    adminEmail,
  );

  // Determine template based on dimension
  let template: string;
  switch (dimension) {
    case "payment":
      template = "update-payment";
      break;
    case "profile":
      template = "update-info";
      break;
    case "tcc":
      template = "update-tcc";
      break;
    default:
      throw new Error(`Invalid dimension: ${dimension}`);
  }

  const props: EmailTemplateProps = {
    applicantName,
    trackingCode: registration.registration_id,
    ctaUrl: tokenResult.ctaUrl,
    dimension,
    notes,
    supportEmail: process.env.EMAIL_FROM || "info@yecday.com",
    brandTokens,
    // Add payment-specific props for payment template
    ...(dimension === "payment" && {
      priceApplied: registration.price_applied?.toString() || "0",
      packageName: registration.selected_package_code || "Standard Package",
    }),
  };

  const html = await renderEmailTemplate(template, props);
  const subject = getEmailSubject(template);

  const result = await transport.send({
    to: registration.email,
    subject,
    html,
  });

  return {
    ok: result.ok,
    template,
    to: registration.email,
    subject,
    trackingCode: registration.registration_id,
    ctaUrl: tokenResult.ctaUrl,
    transportResult: result,
  };
}

/**
 * Send approval email with badge
 */
export async function sendApprovalEmail(
  registration: Registration,
  badgeUrl?: string,
  brandTokens?: EmailTemplateProps["brandTokens"],
): Promise<EmailSendResult> {
  const transport = getEmailTransport();
  const applicantName =
    `${registration.first_name} ${registration.last_name}`.trim();

  const props: EmailTemplateProps = {
    applicantName,
    trackingCode: registration.registration_id,
    badgeUrl: badgeUrl || "",
    supportEmail: process.env.EMAIL_FROM || "info@yecday.com",
    brandTokens,
  };

  const html = await renderEmailTemplate("approval-badge", props);
  const subject = getEmailSubject("approval-badge");

  const result = await transport.send({
    to: registration.email,
    subject,
    html,
  });

  return {
    ok: result.ok,
    template: "approval-badge",
    to: registration.email,
    subject,
    trackingCode: registration.registration_id,
    badgeUrl,
    transportResult: result,
  };
}

/**
 * Send rejection email
 */
export async function sendRejectionEmail(
  registration: Registration,
  rejectedReason: "deadline_missed" | "ineligible_rule_match" | "other",
  brandTokens?: EmailTemplateProps["brandTokens"],
): Promise<EmailSendResult> {
  const transport = getEmailTransport();
  const applicantName =
    `${registration.first_name} ${registration.last_name}`.trim();

  const props: EmailTemplateProps = {
    applicantName,
    trackingCode: registration.registration_id,
    rejectedReason,
    supportEmail: process.env.EMAIL_FROM || "info@yecday.com",
    brandTokens,
  };

  const html = await renderEmailTemplate("rejection", props);
  const subject = getEmailSubject("rejection");

  const result = await transport.send({
    to: registration.email,
    subject,
    html,
  });

  return {
    ok: result.ok,
    template: "rejection",
    to: registration.email,
    subject,
    trackingCode: registration.registration_id,
    transportResult: result,
  };
}

/**
 * Event-driven email service
 * Maps events to appropriate email sends with idempotency
 */
export class EventDrivenEmailService {
  private static instance: EventDrivenEmailService;
  private processedEvents: Set<string> = new Set();

  static getInstance(): EventDrivenEmailService {
    if (!EventDrivenEmailService.instance) {
      EventDrivenEmailService.instance = new EventDrivenEmailService();
    }
    return EventDrivenEmailService.instance;
  }

  /**
   * Process registration event and send appropriate email
   */
  async processEvent(
    eventType: string,
    registration: Registration,
    adminEmail?: string,
    dimension?: "payment" | "profile" | "tcc",
    notes?: string,
    badgeUrl?: string,
    rejectedReason?: "deadline_missed" | "ineligible_rule_match" | "other",
    brandTokens?: EmailTemplateProps["brandTokens"],
  ): Promise<EmailSendResult | null> {
    // Create event ID for idempotency
    const eventId = `${eventType}-${registration.id}-${Date.now()}`;

    if (this.processedEvents.has(eventId)) {
      console.log(`Event ${eventId} already processed, skipping`);
      return null;
    }

    try {
      let result: EmailSendResult;

      switch (eventType) {
        case "registration.created":
          result = await sendTrackingEmail(registration, brandTokens);
          break;

        case "review.request_update":
          if (!adminEmail || !dimension) {
            throw new Error(
              "Admin email and dimension required for update request",
            );
          }
          result = await sendUpdateRequestEmail(
            registration,
            dimension,
            adminEmail,
            notes,
            brandTokens,
          );
          break;

        case "review.auto_approved":
        case "review.approved":
          result = await sendApprovalEmail(registration, badgeUrl, brandTokens);
          break;

        case "review.rejected":
          if (!rejectedReason) {
            throw new Error("Rejection reason required for rejection email");
          }
          result = await sendRejectionEmail(
            registration,
            rejectedReason,
            brandTokens,
          );
          break;

        default:
          console.warn(
            `No email template defined for event type: ${eventType}`,
          );
          return null;
      }

      // Mark event as processed
      this.processedEvents.add(eventId);

      console.log(`Email sent for event ${eventType}:`, {
        to: result.to,
        template: result.template,
        trackingCode: result.trackingCode,
      });

      return result;
    } catch (error) {
      console.error(`Failed to process email event ${eventType}:`, error);
      throw error;
    }
  }

  /**
   * Get brand tokens for email templates
   */
  getBrandTokens(): EmailTemplateProps["brandTokens"] {
    return {
      logoUrl: process.env.EMAIL_LOGO_URL,
      primaryColor: process.env.EMAIL_PRIMARY_COLOR || "#1A237E",
      secondaryColor: process.env.EMAIL_SECONDARY_COLOR || "#4285C5",
    };
  }

  /**
   * Clear processed events (useful for testing)
   */
  clearProcessedEvents(): void {
    this.processedEvents.clear();
  }
}

// Export singleton instance
export const eventDrivenEmailService = EventDrivenEmailService.getInstance();
