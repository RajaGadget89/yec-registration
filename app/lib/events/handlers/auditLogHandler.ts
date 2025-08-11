import { EventHandler, RegistrationEvent } from '../types';
import { getSupabaseServiceClient } from '../../supabase-server';
import { getThailandTimeISOString } from '../../timezoneUtils';

/**
 * Handler for logging admin actions to audit log table
 * Silently skips if admin_audit_logs table doesn't exist
 */
export class AuditLogHandler implements EventHandler<RegistrationEvent> {
  async handle(event: RegistrationEvent): Promise<void> {
    // Only log admin actions
    if (!event.type.startsWith('admin.')) {
      return;
    }

    const now = getThailandTimeISOString();

    try {
      switch (event.type) {
        case 'admin.request_update':
        case 'admin.approved':
        case 'admin.rejected':
          await this.logAdminAction(event, now);
          break;

        default:
          console.warn(`Unhandled event type in AuditLogHandler: ${event.type}`);
      }
    } catch (error) {
      // Silently skip if table doesn't exist or other non-critical errors
      console.log('Admin audit logging not available:', error);
    }
  }

  private async logAdminAction(event: RegistrationEvent, timestamp: string): Promise<void> {
    if (!event.type.startsWith('admin.')) return;

    // Type guard to ensure we have admin action payload
    if (event.type !== 'admin.request_update' && 
        event.type !== 'admin.approved' && 
        event.type !== 'admin.rejected') {
      return;
    }

    const { registration, adminEmail } = event.payload as any;
    const supabase = getSupabaseServiceClient();

    // Determine the action type
    let action: string;
    switch (event.type) {
      case 'admin.request_update':
        action = 'request-update';
        break;
      case 'admin.approved':
        action = 'approve';
        break;
      case 'admin.rejected':
        action = 'reject';
        break;
      default:
        action = 'unknown';
    }

    // Create audit log entry
    const auditEntry = {
      admin_email: adminEmail,
      action: action,
      registration_id: registration.registration_id,
      before: registration,
      after: { ...registration, status: this.getNewStatus(event.type) },
      timestamp: timestamp,
      metadata: {
        event_id: event.id,
        event_type: event.type,
        reason: (event.payload as any).reason || null,
      }
    };

    const { error } = await supabase
      .from('admin_audit_logs')
      .insert([auditEntry]);

    if (error) {
      // If it's a table not found error, log it but don't throw
      if (error.message.includes('relation "admin_audit_logs" does not exist')) {
        console.log('Admin audit logs table does not exist, skipping audit logging');
        return;
      }
      throw error;
    }

    console.log(`Audit log entry created for ${action} action on registration ${registration.registration_id}`);
  }

  private getNewStatus(eventType: string): string {
    switch (eventType) {
      case 'admin.request_update':
        return 'pending';
      case 'admin.approved':
        return 'approved';
      case 'admin.rejected':
        return 'rejected';
      default:
        return 'unknown';
    }
  }
}
