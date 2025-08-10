import { Resend } from 'resend';

/**
 * Send email notification using Resend
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param html - Email HTML content
 * @returns Promise<boolean> - true if sent successfully, false otherwise
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not configured, skipping email notification');
    return false;
  }

  try {
    const resend = new Resend(resendApiKey);
    const { error } = await resend.emails.send({
      from: 'YEC <info@rajagadget.live>',
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Email sending error:', error);
      return false;
    }

    console.log('Email sent successfully to:', to);
    return true;
  } catch (err) {
    console.error('Unexpected error in sendEmail:', err);
    return false;
  }
}

/**
 * Send Telegram notification
 * @param text - Message text to send
 * @returns Promise<boolean> - true if sent successfully, false otherwise
 */
export async function sendTelegram(text: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!botToken || !chatId) {
    console.warn('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured, skipping Telegram notification');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      console.error('Telegram API error:', response.status, response.statusText);
      return false;
    }

    const result = await response.json();
    if (!result.ok) {
      console.error('Telegram API returned error:', result);
      return false;
    }

    console.log('Telegram notification sent successfully');
    return true;
  } catch (err) {
    console.error('Unexpected error in sendTelegram:', err);
    return false;
  }
}

/**
 * Email templates for admin actions
 */
export const emailTemplates = {
  approved: (name: string, registrationId: string) => ({
    subject: 'YEC Day — Registration Approved',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1A237E;">YEC Day — Registration Approved / อนุมัติการลงทะเบียนแล้ว</h2>
        
        <p>Dear ${name} / สวัสดี ${name},</p>
        
        <p>We are pleased to inform you that your YEC Day registration has been approved!</p>
        <p>เรามีความยินดีที่จะแจ้งให้ทราบว่าการลงทะเบียน YEC Day ของคุณได้รับการอนุมัติแล้ว!</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>Registration ID / รหัสลงทะเบียน:</strong> ${registrationId}
        </div>
        
        <p>You will receive further details about the event schedule and logistics soon.</p>
        <p>คุณจะได้รับรายละเอียดเพิ่มเติมเกี่ยวกับกำหนดการและ logistics ของงานในเร็วๆ นี้</p>
        
        <p>If you have any questions, please contact us at info@yecday.com</p>
        <p>หากมีคำถามใดๆ กรุณาติดต่อเราได้ที่ info@yecday.com</p>
        
        <p>Best regards / ขอแสดงความนับถือ,<br>
        YEC Day Team</p>
      </div>
    `
  }),
  
  rejected: (name: string, registrationId: string) => ({
    subject: 'YEC Day — Registration Rejected',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1A237E;">YEC Day — Registration Rejected / ไม่อนุมัติการลงทะเบียน</h2>
        
        <p>Dear ${name} / สวัสดี ${name},</p>
        
        <p>We regret to inform you that your YEC Day registration has been rejected.</p>
        <p>เราต้องขออภัยที่แจ้งให้ทราบว่าการลงทะเบียน YEC Day ของคุณไม่ได้รับการอนุมัติ</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>Registration ID / รหัสลงทะเบียน:</strong> ${registrationId}
        </div>
        
        <p>If you believe this is an error or have questions, please contact us at info@yecday.com</p>
        <p>หากคุณคิดว่านี่เป็นข้อผิดพลาดหรือมีคำถาม กรุณาติดต่อเราได้ที่ info@yecday.com</p>
        
        <p>Best regards / ขอแสดงความนับถือ,<br>
        YEC Day Team</p>
      </div>
    `
  }),
  
  requestUpdate: (name: string, registrationId: string) => ({
    subject: 'YEC Day — Action Required: Please update your registration',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1A237E;">YEC Day — Action Required / ต้องดำเนินการ</h2>
        
        <p>Dear ${name} / สวัสดี ${name},</p>
        
        <p>Your YEC Day registration requires additional information or updates.</p>
        <p>การลงทะเบียน YEC Day ของคุณต้องการข้อมูลเพิ่มเติมหรือการอัปเดต</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>Registration ID / รหัสลงทะเบียน:</strong> ${registrationId}
        </div>
        
        <p>Please review and update your registration information at your earliest convenience.</p>
        <p>กรุณาตรวจสอบและอัปเดตข้อมูลการลงทะเบียนของคุณโดยเร็วที่สุดเท่าที่จะทำได้</p>
        
        <p>If you have any questions, please contact us at info@yecday.com</p>
        <p>หากมีคำถามใดๆ กรุณาติดต่อเราได้ที่ info@yecday.com</p>
        
        <p>Best regards / ขอแสดงความนับถือ,<br>
        YEC Day Team</p>
      </div>
    `
  })
};
