import { Resend } from 'resend';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  try {
    const { error } = await resend.emails.send({
      from: 'YEC <info@rajagadget.live>', // เปลี่ยนได้ตามที่ verify ไว้ใน Resend
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Email sending error:', error);
      throw new Error('Failed to send email');
    }
  } catch (err) {
    console.error('Unexpected error in sendEmail:', err);
    throw err;
  }
}

export async function sendBadgeEmail(
  userEmail: string,
  userName: string,
  badgeUrl: string,
  registrationId: string
): Promise<boolean> {
  const subject = 'Your YEC Day Badge';
  
  // Validate badge URL
  if (!badgeUrl || badgeUrl.trim() === '') {
    console.error('Invalid badge URL provided to sendBadgeEmail');
    return false;
  }
  
  // Test if badge URL is accessible
  let badgeAccessible = false;
  try {
    const testResponse = await fetch(badgeUrl, { method: 'HEAD' });
    badgeAccessible = testResponse.ok;
    console.log('Badge URL accessibility test:', badgeAccessible ? 'SUCCESS' : 'FAILED');
  } catch (error) {
    console.warn('Could not test badge URL accessibility:', error);
  }
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1A237E;">YEC Day Registration Confirmation</h2>
      
      <p>Dear ${userName},</p>
      
      <p>Thank you for registering for YEC Day! Your official badge is ready.</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <strong>Registration ID:</strong> ${registrationId}
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <h3 style="color: #1A237E; margin-bottom: 15px;">Your YEC Badge</h3>
        ${badgeAccessible ? `
          <img src="${badgeUrl}" alt="YEC Day Badge" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" />
          <p style="margin-top: 15px; font-size: 14px; color: #666;">
            <a href="${badgeUrl}" style="color: #4285C5; text-decoration: none;">Click here to download your badge</a>
          </p>
        ` : `
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border: 2px dashed #ccc;">
            <p style="color: #666; margin: 0;">Badge image temporarily unavailable</p>
            <p style="margin-top: 10px; font-size: 14px;">
              <a href="${badgeUrl}" style="color: #4285C5; text-decoration: none;">Click here to view your badge</a>
            </p>
          </div>
        `}
      </div>
      
      <p><strong>Important:</strong> Please show this badge at the check-in gate on the day of the event.</p>
      
      <p>If you have any questions, please contact us at info@yecday.com</p>
      
      <p>Best regards,<br>
      YEC Day Team</p>
    </div>
  `;

  try {
    console.log('Sending badge email to:', userEmail);
    console.log('Badge URL:', badgeUrl);
    
    await sendEmail({
      to: userEmail,
      subject,
      html,
    });
    
    console.log('Badge email sent successfully to:', userEmail);
    return true;
  } catch (error) {
    console.error('Error sending badge email:', error);
    return false;
  }
}

// Test email configuration
export async function testEmailConnection(): Promise<boolean> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  try {
    // Test by sending a simple email to verify the API key
    const { error } = await resend.emails.send({
      from: 'YEC <info@rajagadget.live>',
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<p>This is a test email to verify Resend configuration.</p>',
    });

    if (error) {
      console.error('Resend API test failed:', error);
      return false;
    }

    console.log('Resend API connection verified');
    return true;
  } catch (error) {
    console.error('Resend API connection failed:', error);
    return false;
  }
} 