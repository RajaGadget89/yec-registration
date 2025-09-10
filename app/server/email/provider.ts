import { Resend } from "resend";
import { getSupabaseServiceClient } from "../../lib/supabase-server";
import { getEmailFromAddress } from "../../lib/config";
import { getAppBaseUrl } from "../../lib/app-url";
import { promises as fs } from "fs";
import path from "path";

export interface EmailProvider {
  sendInvitationEmail(params: {
    email: string;
    token: string;
    locale: "en" | "th";
  }): Promise<{
    messageId: string;
    provider: string;
    status: "success" | "error";
    error?: string;
  }>;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  invitation_id?: string;
  token: string;
  created_at: string;
}

/**
 * Test Email Provider for E2E testing and development
 * Writes messages to database outbox table or local file
 */
export class TestEmailProvider implements EmailProvider {
  async sendInvitationEmail(params: {
    email: string;
    token: string;
    locale: "en" | "th";
  }): Promise<{
    messageId: string;
    provider: string;
    status: "success" | "error";
    error?: string;
  }> {
    try {
      const messageId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Get email templates
      const templates = await this.getEmailTemplates(
        params.token,
        params.locale,
      );

      // Create email message
      const message: EmailMessage = {
        to: params.email,
        subject: templates.subject,
        html: templates.html,
        text: templates.text,
        token: params.token,
        created_at: new Date().toISOString(),
      };

      // Write to database outbox if available, otherwise to local file
      await this.writeToOutbox(message, messageId);

      return {
        messageId,
        provider: "test",
        status: "success",
      };
    } catch (error) {
      console.error("TestEmailProvider error:", error);
      return {
        messageId: `error_${Date.now()}`,
        provider: "test",
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async getEmailTemplates(token: string, locale: "en" | "th") {
    const base = await getAppBaseUrl();
    const u = new URL("/admin/accept", base);
    u.searchParams.set("token", token);
    const acceptUrl = u.toString();
    const expiresAt = new Date(
      Date.now() + 48 * 60 * 60 * 1000,
    ).toLocaleString();
    const supportEmail = "info@yecday.com";

    if (locale === "th") {
      return {
        subject: "เชิญเข้าร่วมเป็นผู้ดูแลระบบ YEC Day (หมดอายุใน 48 ชั่วโมง)",
        html: `
          <div style="font-family: 'Sarabun', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1A237E;">เชิญเข้าร่วมเป็นผู้ดูแลระบบ YEC Day</h2>
            
            <p>คุณได้รับเชิญให้เข้าร่วมเป็นผู้ดูแลระบบของ YEC Day</p>
            
            <div style="background-color: #e3f2fd; border: 1px solid #bbdefb; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <h3 style="color: #1565c0; margin-top: 0;">🔐 เข้าถึงระบบผู้ดูแล</h3>
              <p style="color: #1565c0; margin-bottom: 0;">คลิกปุ่มด้านล่างเพื่อยอมรับคำเชิญและตั้งค่าบัญชีผู้ดูแลของคุณ</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${acceptUrl}" style="display: inline-block; background-color: #1A237E; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                ยอมรับคำเชิญ
              </a>
            </div>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <h3 style="color: #856404; margin-top: 0;">⚠️ สำคัญ</h3>
              <ul style="color: #856404; margin-bottom: 0;">
                <li>คำเชิญนี้จะหมดอายุในวันที่ ${expiresAt}</li>
                <li>เก็บคำเชิญนี้ไว้อย่างปลอดภัยและอย่าแชร์กับผู้อื่น</li>
                <li>หากคุณไม่คาดหวังคำเชิญนี้ กรุณาติดต่อเราทันที</li>
              </ul>
            </div>
            
            <p>หากคุณมีคำถามใดๆ กรุณาติดต่อเราที่ ${supportEmail}</p>
            
            <p>ขอแสดงความนับถือ<br>
            ทีมผู้ดูแล YEC Day</p>
          </div>
        `,
        text: `เชิญเข้าร่วมเป็นผู้ดูแลระบบ YEC Day

คุณได้รับเชิญให้เข้าร่วมเป็นผู้ดูแลระบบของ YEC Day

เข้าถึงระบบผู้ดูแล: คลิกปุ่มด้านล่างเพื่อยอมรับคำเชิญและตั้งค่าบัญชีผู้ดูแลของคุณ

ยอมรับคำเชิญ: ${acceptUrl}

สำคัญ:
- คำเชิญนี้จะหมดอายุในวันที่ ${expiresAt}
- เก็บคำเชิญนี้ไว้อย่างปลอดภัยและอย่าแชร์กับผู้อื่น
- หากคุณไม่คาดหวังคำเชิญนี้ กรุณาติดต่อเราทันที

หากคุณมีคำถามใดๆ กรุณาติดต่อเราที่ ${supportEmail}

ขอแสดงความนับถือ
ทีมผู้ดูแล YEC Day`,
      };
    } else {
      return {
        subject: "You are invited to Admin Console (expires in 48 hours)",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1A237E;">Admin Console Invitation</h2>
            
            <p>You have been invited to join the YEC Day Admin Console.</p>
            
            <div style="background-color: #e3f2fd; border: 1px solid #bbdefb; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <h3 style="color: #1565c0; margin-top: 0;">🔐 Admin Access</h3>
              <p style="color: #1565c0; margin-bottom: 0;">Click the button below to accept your invitation and set up your admin account.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${acceptUrl}" style="display: inline-block; background-color: #1A237E; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Accept Invitation
              </a>
            </div>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <h3 style="color: #856404; margin-top: 0;">⚠️ Important</h3>
              <ul style="color: #856404; margin-bottom: 0;">
                <li>This invitation expires on ${expiresAt}</li>
                <li>Keep this invitation secure and do not share it with others</li>
                <li>If you did not expect this invitation, please contact us immediately</li>
              </ul>
            </div>
            
            <p>If you have any questions, please contact us at ${supportEmail}</p>
            
            <p>Best regards,<br>
            YEC Day Admin Team</p>
          </div>
        `,
        text: `Admin Console Invitation

You have been invited to join the YEC Day Admin Console.

Admin Access: Click the button below to accept your invitation and set up your admin account.

Accept Invitation: ${acceptUrl}

Important:
- This invitation expires on ${expiresAt}
- Keep this invitation secure and do not share it with others
- If you did not expect this invitation, please contact us immediately

If you have any questions, please contact us at ${supportEmail}

Best regards,
YEC Day Admin Team`,
      };
    }
  }

  private async writeToOutbox(message: EmailMessage, messageId: string) {
    try {
      // Try to write to database outbox first
      const supabase = getSupabaseServiceClient();
      const { error } = await (supabase as any).from("email_outbox").insert({
        id: messageId,
        to_email: message.to,
        subject: message.subject,
        html_content: message.html,
        text_content: message.text,
        template: "admin.invitation",
        payload: {
          token: message.token,
          acceptUrl: `${getAppBaseUrl()}/admin/accept?token=${message.token}`,
          expiresAt: new Date(
            Date.now() + 48 * 60 * 60 * 1000,
          ).toLocaleString(),
          supportEmail: "info@yecday.com",
        },
        created_at: message.created_at,
        status: "sent",
      });

      if (error) {
        console.warn(
          "Failed to write to database outbox, falling back to file:",
          error,
        );
        await this.writeToLocalFile(message, messageId);
      }
    } catch (error) {
      console.warn(
        "Database outbox not available, writing to local file:",
        error,
      );
      await this.writeToLocalFile(message, messageId);
    }
  }

  private async writeToLocalFile(message: EmailMessage, messageId: string) {
    // Write to local file for E2E testing
    const mailDir = path.join(process.cwd(), ".e2e", "mail");
    const filePath = path.join(mailDir, `${messageId}.json`);

    try {
      await fs.mkdir(mailDir, { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(message, null, 2));
      console.log(`Test email written to: ${filePath}`);
    } catch (error) {
      console.error("Failed to write test email to file:", error);
      throw error;
    }
  }
}

/**
 * SMTP Email Provider for production/staging
 * Uses environment variables for SMTP configuration
 */
export class SmtpEmailProvider implements EmailProvider {
  private resend: Resend;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY environment variable is required for SmtpEmailProvider",
      );
    }
    this.resend = new Resend(apiKey);
  }

  async sendInvitationEmail(params: {
    email: string;
    token: string;
    locale: "en" | "th";
  }): Promise<{
    messageId: string;
    provider: string;
    status: "success" | "error";
    error?: string;
  }> {
    try {
      const messageId = `smtp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Get email templates
      const templates = await this.getEmailTemplates(
        params.token,
        params.locale,
      );

      // Send via Resend
      const { data, error } = await this.resend.emails.send({
        from: getEmailFromAddress(),
        to: params.email,
        subject: templates.subject,
        html: templates.html,
      });

      if (error) {
        console.error("SMTP email sending error:", error);
        return {
          messageId,
          provider: "smtp",
          status: "error",
          error: error.message || "Failed to send email",
        };
      }

      return {
        messageId: data?.id || messageId,
        provider: "smtp",
        status: "success",
      };
    } catch (error) {
      console.error("SmtpEmailProvider error:", error);
      return {
        messageId: `error_${Date.now()}`,
        provider: "smtp",
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async getEmailTemplates(token: string, locale: "en" | "th") {
    const base = await getAppBaseUrl();
    const u = new URL("/admin/accept", base);
    u.searchParams.set("token", token);
    const acceptUrl = u.toString();
    const expiresAt = new Date(
      Date.now() + 48 * 60 * 60 * 1000,
    ).toLocaleString();
    const supportEmail = "info@yecday.com";

    if (locale === "th") {
      return {
        subject: "เชิญเข้าร่วมเป็นผู้ดูแลระบบ YEC Day (หมดอายุใน 48 ชั่วโมง)",
        html: `
          <div style="font-family: 'Sarabun', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1A237E;">เชิญเข้าร่วมเป็นผู้ดูแลระบบ YEC Day</h2>
            
            <p>คุณได้รับเชิญให้เข้าร่วมเป็นผู้ดูแลระบบของ YEC Day</p>
            
            <div style="background-color: #e3f2fd; border: 1px solid #bbdefb; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <h3 style="color: #1565c0; margin-top: 0;">🔐 เข้าถึงระบบผู้ดูแล</h3>
              <p style="color: #1565c0; margin-bottom: 0;">คลิกปุ่มด้านล่างเพื่อยอมรับคำเชิญและตั้งค่าบัญชีผู้ดูแลของคุณ</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${acceptUrl}" style="display: inline-block; background-color: #1A237E; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                ยอมรับคำเชิญ
              </a>
            </div>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <h3 style="color: #856404; margin-top: 0;">⚠️ สำคัญ</h3>
              <ul style="color: #856404; margin-bottom: 0;">
                <li>คำเชิญนี้จะหมดอายุในวันที่ ${expiresAt}</li>
                <li>เก็บคำเชิญนี้ไว้อย่างปลอดภัยและอย่าแชร์กับผู้อื่น</li>
                <li>หากคุณไม่คาดหวังคำเชิญนี้ กรุณาติดต่อเราทันที</li>
              </ul>
            </div>
            
            <p>หากคุณมีคำถามใดๆ กรุณาติดต่อเราที่ ${supportEmail}</p>
            
            <p>ขอแสดงความนับถือ<br>
            ทีมผู้ดูแล YEC Day</p>
          </div>
        `,
      };
    } else {
      return {
        subject: "You are invited to Admin Console (expires in 48 hours)",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1A237E;">Admin Console Invitation</h2>
            
            <p>You have been invited to join the YEC Day Admin Console.</p>
            
            <div style="background-color: #e3f2fd; border: 1px solid #bbdefb; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <h3 style="color: #1565c0; margin-top: 0;">🔐 Admin Access</h3>
              <p style="color: #1565c0; margin-bottom: 0;">Click the button below to accept your invitation and set up your admin account.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${acceptUrl}" style="display: inline-block; background-color: #1A237E; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Accept Invitation
              </a>
            </div>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <h3 style="color: #856404; margin-top: 0;">⚠️ Important</h3>
              <ul style="color: #856404; margin-bottom: 0;">
                <li>This invitation expires on ${expiresAt}</li>
                <li>Keep this invitation secure and do not share it with others</li>
                <li>If you did not expect this invitation, please contact us immediately</li>
              </ul>
            </div>
            
            <p>If you have any questions, please contact us at ${supportEmail}</p>
            
            <p>Best regards,<br>
            YEC Day Admin Team</p>
          </div>
        `,
      };
    }
  }
}

/**
 * Factory function to create the appropriate email provider
 */
export function createEmailProvider(): EmailProvider {
  const provider =
    process.env.EMAIL_PROVIDER ||
    (process.env.NODE_ENV === "test" ? "test" : "smtp");

  switch (provider) {
    case "test":
      return new TestEmailProvider();
    case "smtp":
      return new SmtpEmailProvider();
    default:
      throw new Error(`Unknown email provider: ${provider}`);
  }
}

/**
 * Main function to send invitation emails
 */
export async function sendInvitationEmail(params: {
  email: string;
  token: string;
  locale?: "en" | "th";
}): Promise<{
  messageId: string;
  provider: string;
  status: "success" | "error";
  error?: string;
}> {
  const provider = createEmailProvider();
  const locale = params.locale || "en";

  return provider.sendInvitationEmail({
    email: params.email,
    token: params.token,
    locale,
  });
}
