import { render } from "@react-email/render";
import { EmailTemplateProps } from "./registry";
import { BaseLayout } from "./components/BaseLayout";
import { TrackingTemplate } from "./templates/tracking";
import { UpdatePaymentTemplate } from "./templates/update-payment";
import { UpdateInfoTemplate } from "./templates/update-info";
import { UpdateTCCTemplate } from "./templates/update-tcc";
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
        <UpdateTCCTemplate {...props} />
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
 * Render email template to HTML string using @react-email/render
 * @param templateName Template name from registry
 * @param props Template props
 * @returns HTML string
 */
export async function renderEmailTemplate(
  templateName: string,
  props: EmailTemplateProps,
): Promise<string> {
  const template = emailTemplates[templateName as keyof typeof emailTemplates];
  if (!template) {
    throw new Error(`Email template '${templateName}' not found`);
  }

  const element = template.renderer(props);
  const rendered = await render(element);

  console.log("[EMAIL-RENDER] Render result type:", typeof rendered);
  console.log(
    "[EMAIL-RENDER] Render result keys:",
    rendered && typeof rendered === "object" ? Object.keys(rendered) : "N/A",
  );
  console.log("[EMAIL-RENDER] Render result:", rendered);

  // Ensure we return a string
  if (typeof rendered === "string") {
    return rendered;
  } else if (rendered && typeof rendered === "object" && "html" in rendered) {
    return (rendered as any).html as string;
  } else {
    console.error("Unexpected render result type:", typeof rendered, rendered);
    throw new Error(
      `Email template rendering failed: unexpected result type ${typeof rendered}`,
    );
  }
}

/**
 * Get email subject for template
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
 * Get available template names
 * @returns Array of template names
 */
export function getAvailableTemplates(): string[] {
  return Object.keys(emailTemplates);
}

/**
 * Validate template name
 * @param templateName Template name to validate
 * @returns True if template exists
 */
export function isValidTemplate(templateName: string): boolean {
  return templateName in emailTemplates;
}
