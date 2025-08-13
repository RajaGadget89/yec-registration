import { Resend } from 'resend';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

interface EmailProvider {
  sendEmail(options: EmailOptions): Promise<boolean>;
}

class ResendProvider implements EmailProvider {
  private resend: Resend;
  private fromEmail: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }
    
    this.resend = new Resend(apiKey);
    this.fromEmail = process.env.EMAIL_FROM || 'YEC <info@rajagadget.live>';
  }

  async sendEmail({ to, subject, html, from, replyTo }: EmailOptions): Promise<boolean> {
    try {
      const { error } = await this.resend.emails.send({
        from: from || this.fromEmail,
        to,
        subject,
        html,
        replyTo,
      });

      if (error) {
        console.error('Resend email sending error:', error);
        return false;
      }

      console.log('Email sent successfully via Resend to:', to);
      return true;
    } catch (err) {
      console.error('Unexpected error in Resend sendEmail:', err);
      return false;
    }
  }
}

class SendGridProvider implements EmailProvider {
  async sendEmail({ to, subject, html, from, replyTo }: EmailOptions): Promise<boolean> {
    // TODO: Implement SendGrid integration when needed
    console.warn('SendGrid provider not implemented yet');
    return false;
  }
}

// Provider selection logic
function createEmailProvider(): EmailProvider {
  const resendApiKey = process.env.RESEND_API_KEY;
  const sendgridApiKey = process.env.SENDGRID_API_KEY;

  if (resendApiKey) {
    try {
      return new ResendProvider();
    } catch (error) {
      console.error('Failed to initialize Resend provider:', error);
    }
  }

  if (sendgridApiKey) {
    return new SendGridProvider();
  }

  throw new Error('No email provider configured. Please set RESEND_API_KEY or SENDGRID_API_KEY');
}

// Global provider instance
let emailProvider: EmailProvider | null = null;

function getEmailProvider(): EmailProvider {
  if (!emailProvider) {
    emailProvider = createEmailProvider();
  }
  return emailProvider;
}

/**
 * Send email using the configured provider
 * @param options Email options
 * @returns Promise<boolean> - true if sent successfully
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const provider = getEmailProvider();
    return await provider.sendEmail(options);
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
}

/**
 * Test email provider connection
 * @param testEmail Optional test email address
 * @returns Promise<boolean> - true if test successful
 */
export async function testEmailConnection(testEmail?: string): Promise<boolean> {
  const testTo = testEmail || 'test@example.com';
  
  try {
    const provider = getEmailProvider();
    const result = await provider.sendEmail({
      to: testTo,
      subject: 'YEC Day - Email Service Test',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #1A237E;">YEC Day Email Service Test</h2>
          <p>This is a test email to verify the email service configuration.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Provider:</strong> ${provider.constructor.name}</p>
        </div>
      `,
    });

    return result;
  } catch (error) {
    console.error('Email connection test failed:', error);
    return false;
  }
}

/**
 * Get email provider status
 * @returns Object with provider info and configuration status
 */
export function getEmailProviderStatus() {
  const resendApiKey = process.env.RESEND_API_KEY;
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.EMAIL_FROM;

  return {
    resendConfigured: !!resendApiKey,
    sendgridConfigured: !!sendgridApiKey,
    fromEmail,
    provider: emailProvider?.constructor.name || 'None',
  };
}

