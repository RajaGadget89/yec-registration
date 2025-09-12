/**
 * Server-Only Email Template Renderer
 *
 * This module contains server-only functionality for rendering email templates.
 * It should only be imported and used in server-side contexts (API routes, server components).
 */

import React from "react";
import { renderToString } from "react-dom/server";
import { EmailTemplateProps } from "./registry";
import { BaseLayout } from "./components/BaseLayoutWrapper";
import { TrackingTemplate } from "./templates/tracking";
import { UpdatePaymentTemplate } from "./templates/update-payment";
import { UpdateInfoTemplate } from "./templates/update-info";
import { UpdateTccTemplate } from "./templates/update-tcc";
import { ApprovalBadgeTemplate } from "./templates/approval-badge";
import { RejectionTemplate } from "./templates/rejection";

// Template registry mapping logical names to renderers
const emailTemplates = {
  tracking: {
    renderer: (props: EmailTemplateProps) => (
      <BaseLayout supportEmail={props.supportEmail}>
        <TrackingTemplate {...props} />
      </BaseLayout>
    ),
    subject:
      "[YEC Day] รหัสติดตามการสมัครของคุณ | Your Registration Tracking Code",
  },

  "update-payment": {
    renderer: (props: EmailTemplateProps) => (
      <BaseLayout supportEmail={props.supportEmail}>
        <UpdatePaymentTemplate {...props} />
      </BaseLayout>
    ),
    subject:
      "[YEC Day] โปรดอัปเดตสลิปโอนเงิน | Please Update Your Payment Slip",
  },

  "update-info": {
    renderer: (props: EmailTemplateProps) => (
      <BaseLayout supportEmail={props.supportEmail}>
        <UpdateInfoTemplate {...props} />
      </BaseLayout>
    ),
    subject:
      "[YEC Day] โปรดอัปเดตข้อมูลส่วนบุคคล | Please Update Your Profile Information",
  },

  "update-tcc": {
    renderer: (props: EmailTemplateProps) => (
      <BaseLayout supportEmail={props.supportEmail}>
        <UpdateTccTemplate {...props} />
      </BaseLayout>
    ),
    subject: "[YEC Day] โปรดอัปเดตรูปบัตร TCC | Please Update Your TCC Card",
  },

  "approval-badge": {
    renderer: (props: EmailTemplateProps) => (
      <BaseLayout supportEmail={props.supportEmail}>
        <ApprovalBadgeTemplate {...props} />
      </BaseLayout>
    ),
    subject:
      "[YEC Day] อนุมัติเรียบร้อย — เจอกันในงาน! | Approved — See You at the Seminar",
  },

  rejection: {
    renderer: (props: EmailTemplateProps) => (
      <BaseLayout supportEmail={props.supportEmail}>
        <RejectionTemplate {...props} />
      </BaseLayout>
    ),
    subject: "[YEC Day] คำขอสมัครไม่ผ่าน | Registration Not Approved",
  },
};

/**
 * Server-only function to render email template to HTML
 * @param templateName Template name from registry
 * @param props Template props
 * @returns HTML string
 */
export async function renderEmailTemplate(
  templateName: string,
  props?: EmailTemplateProps,
): Promise<string> {
  const template = emailTemplates[templateName as keyof typeof emailTemplates];
  if (!template) {
    throw new Error(`Email template '${templateName}' not found`);
  }

  try {
    // Render React component to HTML string
    const html = renderToString(template.renderer((props || {}) as any));

    // Wrap in proper HTML structure
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${template.subject}</title>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;
  } catch (error) {
    console.error(`Failed to render email template '${templateName}':`, error);

    // Fallback HTML for error cases
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${template.subject}</title>
        </head>
        <body>
          <h1>YEC Day Registration</h1>
          <p>There was an error rendering your email template.</p>
          <p>Template: ${templateName}</p>
          <p>Please contact support if you continue to receive this message.</p>
        </body>
      </html>
    `;
  }
}

/**
 * Server-only function to get email subject for template
 * @param templateName Template name from registry
 * @returns Subject string
 */
export function getEmailSubject(templateName: string): string {
  const template = emailTemplates[templateName as keyof typeof emailTemplates];
  if (!template) {
    throw new Error(`Email template '${templateName}' not found`);
  }

  return template.subject;
}

/**
 * Server-only function to get available template names
 * @returns Array of template names
 */
export function getAvailableTemplates(): string[] {
  return Object.keys(emailTemplates);
}

/**
 * Server-only function to validate template name
 * @param templateName Template name to validate
 * @returns True if template exists
 */
export function isValidTemplate(templateName: string): boolean {
  return templateName in emailTemplates;
}
