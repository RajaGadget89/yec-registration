import { EventHandler, RegistrationEvent, EMAIL_TEMPLATES } from '../types';
import { hasEmailConfig } from '../../config';
import { sendEmail, emailTemplates } from '../../notify';

/**
 * Handler for sending email notifications based on events
 * Uses centralized configuration and appropriate email templates
 */
export class EmailNotificationHandler implements EventHandler<RegistrationEvent> {
  async handle(event: RegistrationEvent): Promise<void> {
    // Check if email configuration is available
    if (!hasEmailConfig()) {
      console.warn('Email configuration not available, skipping email notification');
      return;
    }

    const templateType = EMAIL_TEMPLATES[event.type];
    if (!templateType) {
      console.warn(`No email template defined for event type: ${event.type}`);
      return;
    }

    try {
      switch (event.type) {
        case 'registration.submitted':
          await this.handleRegistrationSubmitted(event);
          break;

        case 'registration.batch_upserted':
          await this.handleBatchUpserted(event);
          break;

        case 'admin.request_update':
          await this.handleAdminRequestUpdate(event);
          break;

        case 'admin.approved':
          await this.handleAdminApproved(event);
          break;

        case 'admin.rejected':
          await this.handleAdminRejected(event);
          break;

        default:
          console.warn(`Unhandled event type in EmailNotificationHandler: ${(event as any).type}`);
      }
    } catch (error) {
      console.error('EmailNotificationHandler error:', error);
      throw error;
    }
  }

  private async handleRegistrationSubmitted(event: RegistrationEvent): Promise<void> {
    if (event.type !== 'registration.submitted') return;

    const { registration } = event.payload;
    const fullName = `${registration.title} ${registration.first_name} ${registration.last_name}`;

    // For submitted registrations, we send the "received" email
    // This would typically be the badge email that's already sent in the registration flow
    // So we might skip this or send a different confirmation
    console.log(`Registration submitted email would be sent to ${registration.email} for ${fullName}`);
    
    // Note: The actual badge email is sent in the registration API route
    // This handler could send a follow-up confirmation if needed
  }

  private async handleBatchUpserted(event: RegistrationEvent): Promise<void> {
    if (event.type !== 'registration.batch_upserted') return;

    const { registrations } = event.payload;
    
    // Send emails to all updated registrations
    for (const registration of registrations) {
      const fullName = `${registration.title} ${registration.first_name} ${registration.last_name}`;
      
      // Send a notification that their registration has been updated
      const subject = 'YEC Day — Registration Updated';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1A237E;">YEC Day — Registration Updated / อัปเดตการลงทะเบียนแล้ว</h2>
          
          <p>Dear ${fullName} / สวัสดี ${fullName},</p>
          
          <p>Your YEC Day registration has been updated and is now under review.</p>
          <p>การลงทะเบียน YEC Day ของคุณได้รับการอัปเดตและอยู่ระหว่างการตรวจสอบ</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>Registration ID / รหัสลงทะเบียน:</strong> ${registration.registration_id}
          </div>
          
          <p>You will be notified once the review is complete.</p>
          <p>คุณจะได้รับการแจ้งเตือนเมื่อการตรวจสอบเสร็จสิ้น</p>
          
          <p>Best regards / ขอแสดงความนับถือ,<br>
          YEC Day Team</p>
        </div>
      `;

      await sendEmail(registration.email, subject, html);
      console.log(`Batch update email sent to ${registration.email}`);
    }
  }

  private async handleAdminRequestUpdate(event: RegistrationEvent): Promise<void> {
    if (event.type !== 'admin.request_update') return;

    const { registration } = event.payload;
    const fullName = `${registration.title} ${registration.first_name} ${registration.last_name}`;
    
    const { subject, html } = emailTemplates.requestUpdate(fullName, registration.registration_id);
    await sendEmail(registration.email, subject, html);
    
    console.log(`Request update email sent to ${registration.email}`);
  }

  private async handleAdminApproved(event: RegistrationEvent): Promise<void> {
    if (event.type !== 'admin.approved') return;

    const { registration } = event.payload;
    const fullName = `${registration.title} ${registration.first_name} ${registration.last_name}`;
    
    const { subject, html } = emailTemplates.approved(fullName, registration.registration_id);
    await sendEmail(registration.email, subject, html);
    
    console.log(`Approval email sent to ${registration.email}`);
  }

  private async handleAdminRejected(event: RegistrationEvent): Promise<void> {
    if (event.type !== 'admin.rejected') return;

    const { registration } = event.payload;
    const fullName = `${registration.title} ${registration.first_name} ${registration.last_name}`;
    
    const { subject, html } = emailTemplates.rejected(fullName, registration.registration_id);
    await sendEmail(registration.email, subject, html);
    
    console.log(`Rejection email sent to ${registration.email}`);
  }
}
