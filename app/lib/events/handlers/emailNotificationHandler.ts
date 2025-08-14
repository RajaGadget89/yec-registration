import { EventHandler, RegistrationEvent } from '../types';
import { hasEmailConfig } from '../../config';
import { eventDrivenEmailService } from '../../emails/enhancedEmailService';

/**
 * Enhanced handler for sending email notifications based on events
 * Uses the new enhanced email service with proper event→email mapping
 */
export class EmailNotificationHandler implements EventHandler<RegistrationEvent> {
  async handle(event: RegistrationEvent): Promise<void> {
    // Check if email configuration is available
    if (!hasEmailConfig()) {
      console.warn('Email configuration not available, skipping email notification');
      return;
    }

    try {
      const brandTokens = eventDrivenEmailService.getBrandTokens();
      let result;

      switch (event.type) {
        case 'registration.submitted':
          result = await eventDrivenEmailService.processEvent(
            'registration.created',
            event.payload.registration,
            undefined, // no admin email for new registrations
            undefined, // no dimension for new registrations
            undefined, // no notes for new registrations
            undefined, // no badge URL for new registrations
            undefined, // no rejection reason for new registrations
            brandTokens
          );
          break;

        case 'admin.request_update':
          result = await eventDrivenEmailService.processEvent(
            'review.request_update',
            event.payload.registration,
            event.payload.admin_email,
            event.payload.dimension,
            event.payload.notes,
            undefined, // no badge URL for update requests
            undefined, // no rejection reason for update requests
            brandTokens
          );
          break;

        case 'admin.approved':
          result = await eventDrivenEmailService.processEvent(
            'review.approved',
            event.payload.registration,
            event.payload.admin_email,
            undefined, // no dimension for approvals
            undefined, // no notes for approvals
            undefined, // no badge URL for approvals (will be generated separately)
            undefined, // no rejection reason for approvals
            brandTokens
          );
          break;

        case 'admin.rejected':
          result = await eventDrivenEmailService.processEvent(
            'review.rejected',
            event.payload.registration,
            event.payload.admin_email,
            undefined, // no dimension for rejections
            undefined, // no notes for rejections
            undefined, // no badge URL for rejections
            event.payload.reason as 'deadline_missed' | 'ineligible_rule_match' | 'other',
            brandTokens
          );
          break;

        case 'registration.batch_upserted':
          // For batch updates, send tracking email to notify of changes
          result = await eventDrivenEmailService.processEvent(
            'registration.created',
            event.payload.registration,
            undefined, // no admin email for batch updates
            undefined, // no dimension for batch updates
            undefined, // no notes for batch updates
            undefined, // no badge URL for batch updates
            undefined, // no rejection reason for batch updates
            brandTokens
          );
          break;

        case 'admin.mark_pass':
          // When admin marks a dimension as passed, check if all are passed for auto-approval
          // This will be handled by the database trigger, but we can log it
          console.log(`Admin marked ${event.payload.dimension} as passed for registration ${event.payload.registration.id}`);
          return;

        case 'user.resubmitted':
          // When user resubmits, we don't send an email immediately
          // The system will process the resubmission and potentially trigger approval
          console.log(`User resubmitted for registration ${event.payload.registration.id}`);
          return;

        default:
          console.warn(`No email template defined for event type: ${event.type}`);
          return;
      }

      if (result) {
        console.log(`Email sent successfully for event ${event.type}:`, {
          to: result.to,
          template: result.template,
          trackingCode: result.trackingCode,
          ctaUrl: result.ctaUrl
        });
      }
    } catch (error) {
      console.error('EmailNotificationHandler error:', error);
      // Don't throw error to prevent event processing from failing
      // Email failures should not break the main workflow
    }
  }
}
