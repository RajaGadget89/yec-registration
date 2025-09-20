/**
 * Simple Server-Only Email Template Renderer
 *
 * This module provides server-only email template rendering with HTML strings.
 * It creates beautiful email templates without React DOM dependencies.
 */

import { EmailTemplateProps } from "./registry";

// Use the main EmailTemplateProps interface to avoid type conversion issues
export type SimpleEmailTemplateProps = EmailTemplateProps;

// Get base URL for logo
const getBaseUrl = () => {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://yecday.com"
  );
};

// Create beautiful HTML email template
function createEmailTemplate(
  templateName: string,
  props: SimpleEmailTemplateProps,
): string {
  const {
    applicantName = "ผู้สมัคร",
    trackingCode,
    ctaUrl,
    notes,
    priceApplied = "0",
    packageName = "Standard Package",
    // rejectedReason is intentionally unused in certain templates
    // but kept for type completeness
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    rejectedReason,
    badgeUrl,
    supportEmail = "info@yecday.com",
  } = props;

  const baseUrl = getBaseUrl();
  const logoUrl = `${baseUrl}/assets/logo-full.png`;

  // Template-specific content
  let title = "";
  let content = "";
  let ctaButton = "";
  let showTrackingCode = false;
  let showNextSteps = false;

  switch (templateName) {
    case "tracking":
      title = "ยินดีต้อนรับสู่ YEC Day! | Welcome to YEC Day!";
      content = `
        <p>ขอบคุณที่สมัครเข้าร่วมงาน YEC Day! เราได้รับคำขอลงทะเบียนของคุณแล้ว
        และกำลังดำเนินการตรวจสอบข้อมูล | Thank you for registering for YEC
        Day! We have received your registration request and are processing
        your information.</p>
      `;
      showTrackingCode = true;
      showNextSteps = true;
      break;

    case "update-payment":
      title = "ต้องการข้อมูลเพิ่มเติม | Additional Information Required";
      content = `
        <p>ขอบคุณที่สมัครเข้าร่วมงาน YEC Day! เราได้ตรวจสอบข้อมูลการสมัครของคุณแล้ว
        และต้องการให้คุณอัปเดตสลิปโอนเงิน | Thank you for registering for YEC Day! 
        We have reviewed your registration and need you to update your payment slip.</p>
        
        <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h4 style="color: #0c4a6e; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">รายละเอียดแพ็กเกจ | Package Details:</h4>
          <p style="color: #0c4a6e; font-size: 14px; margin: 0 0 4px 0;"><strong>แพ็กเกจ | Package:</strong> ${packageName}</p>
          <p style="color: #0c4a6e; font-size: 14px; margin: 0;"><strong>ราคา | Price:</strong> ฿${priceApplied}</p>
        </div>
        
        ${
          notes
            ? `
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h4 style="color: #92400e; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">หมายเหตุจากทีมงาน | Team Notes:</h4>
          <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.5;">${notes}</p>
        </div>
        `
            : ""
        }
        
        <p>กรุณาคลิกปุ่มด้านล่างเพื่ออัปเดตสลิปโอนเงินของคุณ | 
        Please click the button below to update your payment slip.</p>
      `;
      if (ctaUrl) {
        ctaButton = `
          <div style="text-align: center; margin: 32px 0;">
            <a href="${ctaUrl}" style="background-color: #1A237E; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600; font-size: 16px;">
              อัปเดตสลิปโอนเงิน | Update Payment Slip
            </a>
          </div>
        `;
      }
      showTrackingCode = true;
      break;

    case "update-info":
      title = "ต้องการข้อมูลเพิ่มเติม | Additional Information Required";
      content = `
        <p>ขอบคุณที่สมัครเข้าร่วมงาน YEC Day! เราได้ตรวจสอบข้อมูลการสมัครของคุณแล้ว
        และต้องการให้คุณอัปเดตข้อมูลส่วนบุคคล | Thank you for registering for YEC Day! 
        We have reviewed your registration and need you to update your profile information.</p>
        
        ${
          notes
            ? `
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h4 style="color: #92400e; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">หมายเหตุจากทีมงาน | Team Notes:</h4>
          <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.5;">${notes}</p>
        </div>
        `
            : ""
        }
        
        <p>กรุณาคลิกปุ่มด้านล่างเพื่ออัปเดตข้อมูลส่วนบุคคลของคุณ | 
        Please click the button below to update your profile information.</p>
      `;
      if (ctaUrl) {
        ctaButton = `
          <div style="text-align: center; margin: 32px 0;">
            <a href="${ctaUrl}" style="background-color: #1A237E; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600; font-size: 16px;">
              อัปเดตข้อมูลส่วนบุคคล | Update Profile Information
            </a>
          </div>
        `;
      }
      showTrackingCode = true;
      break;

    case "update-tcc":
      title = "ต้องการข้อมูลเพิ่มเติม | Additional Information Required";
      content = `
        <p>ขอบคุณที่สมัครเข้าร่วมงาน YEC Day! เราได้ตรวจสอบข้อมูลการสมัครของคุณแล้ว
        และต้องการให้คุณอัปเดตรูปบัตร TCC | Thank you for registering for YEC Day! 
        We have reviewed your registration and need you to update your TCC card.</p>
        
        ${
          notes
            ? `
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h4 style="color: #92400e; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">หมายเหตุจากทีมงาน | Team Notes:</h4>
          <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.5;">${notes}</p>
        </div>
        `
            : ""
        }
        
        <p>กรุณาคลิกปุ่มด้านล่างเพื่ออัปเดตรูปบัตร TCC ของคุณ | 
        Please click the button below to update your TCC card.</p>
      `;
      if (ctaUrl) {
        ctaButton = `
          <div style="text-align: center; margin: 32px 0;">
            <a href="${ctaUrl}" style="background-color: #1A237E; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600; font-size: 16px;">
              อัปเดตรูปบัตร TCC | Update TCC Card
            </a>
          </div>
        `;
      }
      showTrackingCode = true;
      break;

    case "approval-badge":
      title =
        "🎉 อนุมัติเรียบร้อย — เจอกันในงาน! | Approved — See You at the Seminar!";
      content = `
        <div style="background-color: #dcfce7; border: 1px solid #16a34a; border-radius: 8px; padding: 20px; margin: 16px 0; text-align: center;">
          <h3 style="color: #15803d; font-size: 20px; font-weight: 600; margin: 0 0 12px 0;">🎊 ยินดีด้วย! | Congratulations! 🎊</h3>
          <p style="color: #15803d; font-size: 16px; margin: 0; line-height: 1.5;">การสมัครของคุณได้รับการอนุมัติแล้ว! | Your registration has been approved!</p>
        </div>
        
        <p>ขอบคุณที่สมัครเข้าร่วมงาน YEC Day! เราได้ตรวจสอบข้อมูลการสมัครของคุณแล้ว
        และยินดีที่จะแจ้งให้ทราบว่าคุณได้รับการอนุมัติให้เข้าร่วมงานแล้ว | 
        Thank you for registering for YEC Day! We have reviewed your registration 
        and are pleased to inform you that you have been approved to attend the event.</p>
        
        ${
          badgeUrl
            ? `
        <div style="text-align: center; margin: 24px 0;">
          <h4 style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">บัตรเข้าร่วมงานของคุณ | Your Event Badge:</h4>
          <img src="${badgeUrl}" alt="YEC Day Event Badge" style="max-width: 300px; height: auto; border: 2px solid #e5e7eb; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);" />
          <p style="font-size: 14px; color: #6b7280; margin: 12px 0 0 0;">กรุณาพิมพ์หรือบันทึกบัตรนี้เพื่อนำมาแสดงในวันงาน | Please print or save this badge to present at the event.</p>
        </div>
        `
            : ""
        }
        
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h4 style="color: #92400e; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">📅 ข้อมูลสำคัญ | Important Information:</h4>
          <ul style="color: #92400e; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.6;">
            <li>กรุณามาในวันงานตามเวลาที่กำหนด | Please arrive at the event on time</li>
            <li>นำบัตรประจำตัวประชาชนมาด้วย | Bring your ID card</li>
            <li>หากมีคำถามติดต่อทีมงานได้ตลอดเวลา | Contact our team if you have any questions</li>
          </ul>
        </div>
      `;
      showTrackingCode = true;
      break;

    case "rejection":
      title = "คำขอสมัครไม่ผ่าน | Registration Not Approved";

      content = `
        <div style="background-color: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 20px; margin: 16px 0; text-align: center;">
          <h3 style="color: #dc2626; font-size: 20px; font-weight: 600; margin: 0 0 12px 0;">ขออภัย | We Apologize</h3>
          <p style="color: #dc2626; font-size: 16px; margin: 0; line-height: 1.5;">การสมัครของคุณไม่ผ่านการพิจารณา | Your registration was not approved</p>
        </div>
        
        <p>ขอบคุณที่สนใจเข้าร่วมงาน YEC Day! เราได้ตรวจสอบข้อมูลการสมัครของคุณแล้ว
        และขออภัยที่ต้องแจ้งให้ทราบว่าการสมัครของคุณไม่ผ่านการพิจารณา | 
        Thank you for your interest in YEC Day! We have reviewed your registration 
        and unfortunately, we must inform you that your registration was not approved.</p>
        
        
        ${
          notes
            ? `
        <div style="background-color: #fff7ed; border: 1px solid #fb923c; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h4 style="color: #9a3412; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">หมายเหตุจากทีมงาน | Team Notes</h4>
          <p style="color: #9a3412; font-size: 14px; margin: 0; line-height: 1.5;">${notes}</p>
        </div>
        `
            : ""
        }
        
        <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h4 style="color: #0c4a6e; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">ข้อมูลเพิ่มเติม | Additional Information:</h4>
          <ul style="color: #0c4a6e; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.6;">
            <li>คุณสามารถสมัครใหม่ในกิจกรรมครั้งต่อไป | You can apply again for future events</li>
            <li>หากมีคำถามติดต่อทีมงานได้ตลอดเวลา | Contact our team if you have any questions</li>
            <li>เราหวังว่าจะได้พบคุณในโอกาสหน้า | We hope to see you in future events</li>
          </ul>
        </div>
      `;
      showTrackingCode = true;
      break;

    default:
      throw new Error(`Email template '${templateName}' not found`);
  }

  // Build the complete HTML email
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>YEC Day Registration</title>
        <style>
          body { 
            font-family: Arial, Helvetica, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f9fafb;
          }
          .email-container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #ffffff;
          }
          .header {
            background-color: #1A237E;
            padding: 24px;
            text-align: center;
          }
          .header img {
            max-width: 200px;
            height: auto;
            margin-bottom: 12px;
          }
          .header-text {
            color: #ffffff;
            font-size: 16px;
            font-weight: 500;
            opacity: 0.9;
          }
          .content {
            padding: 32px 24px;
          }
          .title {
            color: #1A237E;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 20px;
            text-align: center;
            line-height: 1.3;
          }
          .greeting {
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 20px;
            color: #374151;
          }
          .main-content {
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 24px;
            color: #374151;
          }
          .tracking-code {
            background-color: #f9fafb;
            border: 2px solid #4285C5;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 24px;
            text-align: center;
          }
          .tracking-title {
            color: #1A237E;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 12px;
          }
          .tracking-number {
            font-size: 24px;
            font-weight: bold;
            color: #4285C5;
            font-family: monospace;
            letter-spacing: 2px;
            margin-bottom: 8px;
            background-color: #ffffff;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          }
          .tracking-note {
            font-size: 14px;
            color: #6b7280;
            margin: 0;
          }
          .next-steps {
            background-color: #4CD1E015;
            border: 1px solid #4CD1E0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 24px;
          }
          .next-steps-title {
            color: #4CD1E0;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 12px;
          }
          .next-steps ul {
            margin: 0;
            padding-left: 20px;
            font-size: 14px;
            line-height: 1.6;
            color: #374151;
          }
          .next-steps li {
            margin-bottom: 8px;
          }
          .footer {
            background-color: #f3f4f6;
            padding: 20px 24px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
          }
          .footer p {
            font-size: 14px;
            color: #6b7280;
            margin: 0 0 8px 0;
          }
          .footer a {
            color: #1A237E;
            text-decoration: none;
            font-weight: 500;
          }
          .footer a:hover {
            text-decoration: underline;
          }
          .footer-bottom {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #9ca3af;
          }
          img { max-width: 100%; height: auto; }
          a { color: #1A237E; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <!-- Header with Logo -->
          <div class="header">
            <img src="${logoUrl}" alt="YEC Day Logo" />
            <div class="header-text">Young Entrepreneurs Chamber</div>
          </div>

          <!-- Main Content -->
          <div class="content">
            <!-- Title -->
            <h1 class="title">${title}</h1>

            <!-- Greeting -->
            <p class="greeting">สวัสดี ${applicantName} ที่รัก | Dear ${applicantName},</p>

            <!-- Main Content -->
            <div class="main-content">${content}</div>

            ${ctaButton}

            ${
              showTrackingCode
                ? `
            <!-- Tracking Code Section -->
            <div class="tracking-code">
              <h3 class="tracking-title">รหัสติดตามการสมัคร | Registration Tracking Code</h3>
              <div class="tracking-number">${trackingCode}</div>
              <p class="tracking-note">เก็บรหัสนี้ไว้เพื่อติดตามสถานะการสมัครของคุณ | Keep this code to track your registration status</p>
            </div>
            `
                : ""
            }

            ${
              showNextSteps
                ? `
            <!-- Next Steps Section -->
            <div class="next-steps">
              <h3 class="next-steps-title">ขั้นตอนต่อไป | Next Steps</h3>
              <ul>
                <li>ทีมงานจะตรวจสอบข้อมูลการสมัครของคุณ | Our team will review your registration information</li>
                <li>คุณจะได้รับการแจ้งเตือนเมื่อการตรวจสอบเสร็จสิ้น | You will be notified once the review is complete</li>
                <li>หากต้องการข้อมูลเพิ่มเติม เราจะติดต่อคุณ | If additional information is needed, we will contact you</li>
              </ul>
            </div>
            `
                : ""
            }
          </div>

          <!-- Footer -->
          <div class="footer">
            <p><strong>หากมีคำถาม | Questions?</strong></p>
            <p>ติดต่อเราได้ที่ | Contact us at <a href="mailto:${supportEmail}">${supportEmail}</a></p>
            <div class="footer-bottom">
              <p>YEC Day - Young Entrepreneurs Chamber</p>
              <p>This email was sent to ${applicantName} regarding their YEC Day registration.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Render an email template to HTML string (server-only)
 */
export async function renderEmailTemplate(
  templateName: string,
  props: SimpleEmailTemplateProps,
): Promise<string> {
  return createEmailTemplate(templateName, props);
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
