/**
 * Simple Server-Only Email Template Renderer
 *
 * This module provides server-only email template rendering without React components.
 * It's designed to avoid Next.js client/server component issues.
 */

// Note: renderToString and React imports removed as they're not used in this simple implementation

// Simple email template types
export interface SimpleEmailTemplateProps {
  applicantName?: string;
  trackingCode: string;
  ctaUrl?: string;
  deadlineLocal?: string;
  priceApplied?: string;
  packageName?: string;
  rejectedReason?: "deadline_missed" | "ineligible_rule_match" | "other";
  badgeUrl?: string;
  supportEmail?: string;
  dimension?: "payment" | "profile" | "tcc";
  notes?: string;
  token_id?: string;
}

// Simple HTML email template
function createSimpleEmailTemplate(
  templateName: string,
  props: SimpleEmailTemplateProps,
): string {
  const { trackingCode, applicantName, supportEmail } = props;

  const baseHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>YEC Day Registration</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>YEC Day Registration</h1>
          </div>
          <div class="content">
            <h2>Hello ${applicantName || "Valued Participant"},</h2>
            <p>Your registration tracking code is: <strong>${trackingCode}</strong></p>
            <p>Thank you for registering for YEC Day!</p>
          </div>
          <div class="footer">
            <p>If you have any questions, please contact: ${supportEmail || "support@yecday.com"}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return baseHtml;
}

/**
 * Render an email template to HTML string (server-only)
 */
export async function renderEmailTemplate(
  templateName: string,
  props: SimpleEmailTemplateProps,
): Promise<string> {
  return createSimpleEmailTemplate(templateName, props);
}

/**
 * Get email subject for template
 */
export function getEmailTemplateSubject(templateName: string): string {
  const subjects: Record<string, string> = {
    tracking:
      "[YEC Day] รหัสติดตามการสมัครของคุณ | Your Registration Tracking Code",
    "update-payment":
      "[YEC Day] โปรดอัปเดตสลิปโอนเงิน | Please Update Your Payment Slip",
    "update-info":
      "[YEC Day] โปรดอัปเดตข้อมูลส่วนบุคคล | Please Update Your Profile Information",
    "update-tcc":
      "[YEC Day] โปรดอัปเดตรูปบัตร TCC | Please Update Your TCC Card",
    "approval-badge":
      "[YEC Day] อนุมัติเรียบร้อย — เจอกันในงาน! | Approved — See You at the Seminar",
    rejection: "[YEC Day] คำขอสมัครไม่ผ่าน | Registration Not Approved",
  };

  return subjects[templateName] || "YEC Day Registration Update";
}

/**
 * Get available template names
 */
export function getAvailableTemplates(): string[] {
  return [
    "tracking",
    "update-payment",
    "update-info",
    "update-tcc",
    "approval-badge",
    "rejection",
  ];
}

/**
 * Validate template name
 */
export function isValidTemplate(templateName: string): boolean {
  return getAvailableTemplates().includes(templateName);
}
