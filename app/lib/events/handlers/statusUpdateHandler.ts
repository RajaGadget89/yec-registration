import { EventHandler, RegistrationEvent, STATUS_TRANSITIONS } from '../types';
import { getSupabaseServiceClient } from '../../supabase-server';
import { getThailandTimeISOString } from '../../timezoneUtils';

/**
 * Handler for updating registration status based on events
 * Implements status transition rules from Master Context
 */
export class StatusUpdateHandler implements EventHandler<RegistrationEvent> {
  async handle(event: RegistrationEvent): Promise<void> {
    const newStatus = STATUS_TRANSITIONS[event.type];
    
    if (!newStatus) {
      console.warn(`No status transition defined for event type: ${event.type}`);
      return;
    }

    const supabase = getSupabaseServiceClient();
    const now = getThailandTimeISOString();

    try {
      switch (event.type) {
        case 'registration.submitted':
        case 'admin.request_update':
        case 'admin.approved':
        case 'admin.rejected':
          // Single registration update
          const { error } = await supabase
            .from('registrations')
            .update({ 
              status: newStatus,
              updated_at: now
            })
            .eq('id', event.payload.registration.id);

          if (error) {
            throw new Error(`Failed to update registration status: ${error.message}`);
          }

          console.log(`Updated registration ${event.payload.registration.registration_id} status to ${newStatus}`);
          break;

        case 'registration.batch_upserted':
          // Batch update for multiple registrations
          const registrationIds = event.payload.registrations.map(r => r.id);
          
          const { error: batchError } = await supabase
            .from('registrations')
            .update({ 
              status: newStatus,
              updated_at: now
            })
            .in('id', registrationIds);

          if (batchError) {
            throw new Error(`Failed to update batch registration status: ${batchError.message}`);
          }

          console.log(`Updated ${registrationIds.length} registrations status to ${newStatus}`);
          break;

        default:
          console.warn(`Unhandled event type in StatusUpdateHandler: ${(event as any).type}`);
      }
    } catch (error) {
      console.error('StatusUpdateHandler error:', error);
      throw error;
    }
  }
}
