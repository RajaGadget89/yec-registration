import nodemailer from 'nodemailer';

// Email configuration
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'your-email@gmail.com',
    pass: process.env.SMTP_PASS || 'your-app-password',
  },
};

// Create transporter
const transporter = nodemailer.createTransporter(emailConfig);

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const mailOptions = {
      from: `"YEC Day Registration" <${emailConfig.auth.user}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text,
      attachments: options.attachments || [],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

export async function sendBadgeEmail(
  userEmail: string,
  userName: string,
  badgeBuffer: Buffer,
  registrationId: string
): Promise<boolean> {
  const subject = 'Your YEC Day Badge';
  const text = `Dear ${userName},

Please find attached your official badge for YEC Day. Show this at the check-in gate.

Registration ID: ${registrationId}

Best regards,
YEC Day Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1A237E;">YEC Day Registration Confirmation</h2>
      
      <p>Dear ${userName},</p>
      
      <p>Thank you for registering for YEC Day! Please find attached your official badge.</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <strong>Registration ID:</strong> ${registrationId}
      </div>
      
      <p><strong>Important:</strong> Please show this badge at the check-in gate on the day of the event.</p>
      
      <p>If you have any questions, please contact us at info@yecday.com</p>
      
      <p>Best regards,<br>
      YEC Day Team</p>
    </div>
  `;

  return sendEmail({
    to: userEmail,
    subject,
    text,
    html,
    attachments: [
      {
        filename: 'badge.png',
        content: badgeBuffer,
        contentType: 'image/png',
      },
    ],
  });
}

// Test email configuration
export async function testEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log('Email server connection verified');
    return true;
  } catch (error) {
    console.error('Email server connection failed:', error);
    return false;
  }
} 