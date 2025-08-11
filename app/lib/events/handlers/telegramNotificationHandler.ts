import { EventHandler, RegistrationEvent } from '../types';
import { hasTelegramConfig } from '../../config';
import { sendTelegram } from '../../notify';

/**
 * Handler for sending Telegram notifications based on events
 * Uses centralized configuration and appropriate message templates
 */
export class TelegramNotificationHandler implements EventHandler<RegistrationEvent> {
  async handle(event: RegistrationEvent): Promise<void> {
    // Check if Telegram configuration is available
    if (!hasTelegramConfig()) {
      console.warn('Telegram configuration not available, skipping Telegram notification');
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
          console.warn(`Unhandled event type in TelegramNotificationHandler: ${(event as any).type}`);
      }
    } catch (error) {
      console.error('TelegramNotificationHandler error:', error);
      throw error;
    }
  }

  private async handleRegistrationSubmitted(event: RegistrationEvent): Promise<void> {
    if (event.type !== 'registration.submitted') return;

    const { registration } = event.payload;
    const fullName = `${registration.title} ${registration.first_name} ${registration.last_name}`;
    
    const message = `🆕 New Registration Submitted\n\n` +
      `Name: ${fullName}\n` +
      `Email: ${registration.email}\n` +
      `Registration ID: ${registration.registration_id}\n` +
      `Province: ${registration.yec_province}\n` +
      `Company: ${registration.company_name}\n` +
      `Business Type: ${registration.business_type}`;

    await sendTelegram(message);
    console.log(`Registration submitted Telegram notification sent`);
  }

  private async handleBatchUpserted(event: RegistrationEvent): Promise<void> {
    if (event.type !== 'registration.batch_upserted') return;

    const { registrations, adminEmail, updatedCount } = event.payload;
    
    const message = `📦 Batch Registration Update\n\n` +
      `Updated ${updatedCount} registrations\n` +
      `Admin: ${adminEmail}\n` +
      `Status: Set to waiting_for_review\n\n` +
      `First few registrations:\n` +
      registrations.slice(0, 3).map(r => 
        `• ${r.title} ${r.first_name} ${r.last_name} (${r.registration_id})`
      ).join('\n') +
      (registrations.length > 3 ? `\n... and ${registrations.length - 3} more` : '');

    await sendTelegram(message);
    console.log(`Batch upsert Telegram notification sent for ${updatedCount} registrations`);
  }

  private async handleAdminRequestUpdate(event: RegistrationEvent): Promise<void> {
    if (event.type !== 'admin.request_update') return;

    const { registration, adminEmail } = event.payload;
    const fullName = `${registration.title} ${registration.first_name} ${registration.last_name}`;
    
    const message = `🔄 Update Requested\n\n` +
      `Name: ${fullName}\n` +
      `Email: ${registration.email}\n` +
      `Registration ID: ${registration.registration_id}\n` +
      `Requested by: ${adminEmail}\n` +
      `Status: Set to pending`;

    await sendTelegram(message);
    console.log(`Request update Telegram notification sent`);
  }

  private async handleAdminApproved(event: RegistrationEvent): Promise<void> {
    if (event.type !== 'admin.approved') return;

    const { registration, adminEmail } = event.payload;
    const fullName = `${registration.title} ${registration.first_name} ${registration.last_name}`;
    
    const message = `✅ Registration Approved\n\n` +
      `Name: ${fullName}\n` +
      `Email: ${registration.email}\n` +
      `Registration ID: ${registration.registration_id}\n` +
      `Approved by: ${adminEmail}\n` +
      `Status: Set to approved`;

    await sendTelegram(message);
    console.log(`Approval Telegram notification sent`);
  }

  private async handleAdminRejected(event: RegistrationEvent): Promise<void> {
    if (event.type !== 'admin.rejected') return;

    const { registration, adminEmail, reason } = event.payload;
    const fullName = `${registration.title} ${registration.first_name} ${registration.last_name}`;
    
    const message = `❌ Registration Rejected\n\n` +
      `Name: ${fullName}\n` +
      `Email: ${registration.email}\n` +
      `Registration ID: ${registration.registration_id}\n` +
      `Rejected by: ${adminEmail}\n` +
      `Status: Set to rejected` +
      (reason ? `\nReason: ${reason}` : '');

    await sendTelegram(message);
    console.log(`Rejection Telegram notification sent`);
  }
}
