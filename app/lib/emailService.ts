import { Resend } from "resend";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({
      from: "YEC <info@rajagadget.live>", // เปลี่ยนได้ตามที่ verify ไว้ใน Resend
      to,
      subject,
      html,
    });

    if (error) {
      console.error("Email sending error:", error);
      throw new Error("Failed to send email");
    }
  } catch (err) {
    console.error("Unexpected error in sendEmail:", err);
    throw err;
  }
}

export async function sendBadgeEmail(
  userEmail: string,
  userName: string,
  badgeUrl: string,
  registrationId: string,
): Promise<boolean> {
  const subject = "Your YEC Day Badge";

  // Validate badge URL
  if (!badgeUrl || badgeUrl.trim() === "") {
    console.error("Invalid badge URL provided to sendBadgeEmail");
    return false;
  }

  // Test if badge URL is accessible
  let badgeAccessible = false;
  try {
    const testResponse = await fetch(badgeUrl, { method: "HEAD" });
    badgeAccessible = testResponse.ok;
    console.log(
      "Badge URL accessibility test:",
      badgeAccessible ? "SUCCESS" : "FAILED",
    );
  } catch (error) {
    console.warn("Could not test badge URL accessibility:", error);
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
        ${
          badgeAccessible
            ? `
          <img src="${badgeUrl}" alt="YEC Day Badge" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" />
          <p style="margin-top: 15px; font-size: 14px; color: #666;">
            <a href="${badgeUrl}" style="color: #4285C5; text-decoration: none;">Click here to download your badge</a>
          </p>
        `
            : `
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border: 2px dashed #ccc;">
            <p style="color: #666; margin: 0;">Badge image temporarily unavailable</p>
            <p style="margin-top: 10px; font-size: 14px;">
              <a href="${badgeUrl}" style="color: #4285C5; text-decoration: none;">Click here to view your badge</a>
            </p>
          </div>
        `
        }
      </div>
      
      <p><strong>Important:</strong> Please show this badge at the check-in gate on the day of the event.</p>
      
      <p>If you have any questions, please contact us at info@yecday.com</p>
      
      <p>Best regards,<br>
      YEC Day Team</p>
    </div>
  `;

  try {
    console.log("Sending badge email to:", userEmail);
    console.log("Badge URL:", badgeUrl);

    await sendEmail({
      to: userEmail,
      subject,
      html,
    });

    console.log("Badge email sent successfully to:", userEmail);
    return true;
  } catch (error) {
    console.error("Error sending badge email:", error);
    return false;
  }
}

export async function sendPendingReviewEmail({
  to,
  firstName,
  lastName,
  submittedAt,
}: {
  to: string;
  firstName: string;
  lastName: string;
  submittedAt: string;
}): Promise<boolean> {
  const subject = "YEC Day Registration - Pending Admin Review";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1A237E;">YEC Day Registration - Pending Review</h2>
      
      <p>Dear ${firstName} ${lastName},</p>
      
      <p>Thank you for submitting your registration for YEC Day! Your application has been received and is currently under review by our administrative team.</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <strong>Submission Date:</strong> ${submittedAt}
      </div>
      
      <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
        <h3 style="color: #856404; margin-top: 0;">What happens next?</h3>
        <ul style="color: #856404; margin-bottom: 0;">
          <li>Our team will review your registration details</li>
          <li>You will receive an email notification once your registration is approved</li>
          <li>Upon approval, your official YEC Day badge will be generated and sent to you</li>
        </ul>
      </div>
      
      <p><strong>Important:</strong> Please do not reply to this email. If you have any questions or need to make changes to your registration, please contact us at info@yecday.com</p>
      
      <p>We appreciate your patience and look forward to seeing you at YEC Day!</p>
      
      <p>Best regards,<br>
      YEC Day Team</p>
    </div>
  `;

  try {
    console.log("Sending pending review email to:", to);

    await sendEmail({
      to,
      subject,
      html,
    });

    console.log("Pending review email sent successfully to:", to);
    return true;
  } catch (error) {
    console.error("Error sending pending review email:", error);
    return false;
  }
}

export async function sendApprovedEmail({
  to,
  firstName,
  lastName,
  badgeUrl,
}: {
  to: string;
  firstName: string;
  lastName: string;
  badgeUrl: string;
}): Promise<boolean> {
  const subject = "YEC Day Registration - Approved!";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1A237E;">YEC Day Registration - Approved!</h2>
      
      <p>Dear ${firstName} ${lastName},</p>
      
      <p>Great news! Your YEC Day registration has been approved. Your official badge is ready and attached to this email.</p>
      
      <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
        <h3 style="color: #155724; margin-top: 0;">✅ Registration Approved</h3>
        <p style="color: #155724; margin-bottom: 0;">Your registration has been reviewed and approved by our administrative team.</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <h3 style="color: #1A237E; margin-bottom: 15px;">Your YEC Badge</h3>
        <img src="${badgeUrl}" alt="YEC Day Badge" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" />
        <p style="margin-top: 15px; font-size: 14px; color: #666;">
          <a href="${badgeUrl}" style="color: #4285C5; text-decoration: none;">Click here to download your badge</a>
        </p>
      </div>
      
      <p><strong>Important:</strong> Please show this badge at the check-in gate on the day of the event.</p>
      
      <p>If you have any questions, please contact us at info@yecday.com</p>
      
      <p>Best regards,<br>
      YEC Day Team</p>
    </div>
  `;

  try {
    console.log("Sending approved email to:", to);
    console.log("Badge URL:", badgeUrl);

    await sendEmail({
      to,
      subject,
      html,
    });

    console.log("Approved email sent successfully to:", to);
    return true;
  } catch (error) {
    console.error("Error sending approved email:", error);
    return false;
  }
}

// Test email configuration
export async function testEmailConnection(): Promise<boolean> {
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    // Test by sending a simple email to verify the API key
    const { error } = await resend.emails.send({
      from: "YEC <info@rajagadget.live>",
      to: "sharepoints911@gmail.com",
      subject: "Test Email",
      html: "<p>This is a test email to verify Resend configuration.</p>",
    });

    if (error) {
      console.error("Resend API test failed:", error);
      return false;
    }

    console.log("Resend API connection verified");
    return true;
  } catch (error) {
    console.error("Resend API connection failed:", error);
    return false;
  }
}
