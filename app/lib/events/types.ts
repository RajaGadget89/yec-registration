import { Registration } from '../../types/database';

/**
 * Domain event types for registration lifecycle
 */
export type RegistrationEventType = 
  | 'registration.submitted'
  | 'registration.batch_upserted'
  | 'admin.request_update'
  | 'admin.approved'
  | 'admin.rejected'
  | 'document.reuploaded'
  | 'status.changed'
  | 'login.submitted'
  | 'login.succeeded';

/**
 * Base event interface
 */
export interface DomainEvent<T = any> {
  id: string;
  type: RegistrationEventType;
  payload: T;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Event payloads for each event type
 */
export interface RegistrationSubmittedPayload {
  registration: Registration;
  adminEmail?: string; // For batch operations
}

export interface RegistrationBatchUpsertedPayload {
  registrations: Registration[];
  adminEmail: string;
  updatedCount: number;
}

export interface AdminActionPayload {
  registration: Registration;
  adminEmail: string;
  reason?: string;
}

export interface DocumentReuploadedPayload {
  registration: Registration;
  documentType: string; // 'profile_image', 'chamber_card', 'payment_slip'
  userId?: string;
  adminEmail?: string;
}

export interface StatusChangedPayload {
  registration: Registration;
  beforeStatus: string;
  afterStatus: string;
  reason?: string;
  actorRole: 'user' | 'admin' | 'system';
  adminEmail?: string;
}

export interface LoginSubmittedPayload {
  email: string;
  userId?: string;
}

export interface LoginSucceededPayload {
  email: string;
  userId: string;
  adminEmail?: string;
}

/**
 * Specific event interfaces
 */
export interface RegistrationSubmittedEvent extends DomainEvent<RegistrationSubmittedPayload> {
  type: 'registration.submitted';
}

export interface RegistrationBatchUpsertedEvent extends DomainEvent<RegistrationBatchUpsertedPayload> {
  type: 'registration.batch_upserted';
}

export interface AdminRequestUpdateEvent extends DomainEvent<AdminActionPayload> {
  type: 'admin.request_update';
}

export interface AdminApprovedEvent extends DomainEvent<AdminActionPayload> {
  type: 'admin.approved';
}

export interface AdminRejectedEvent extends DomainEvent<AdminActionPayload> {
  type: 'admin.rejected';
}

export interface DocumentReuploadedEvent extends DomainEvent<DocumentReuploadedPayload> {
  type: 'document.reuploaded';
}

export interface StatusChangedEvent extends DomainEvent<StatusChangedPayload> {
  type: 'status.changed';
}

export interface LoginSubmittedEvent extends DomainEvent<LoginSubmittedPayload> {
  type: 'login.submitted';
}

export interface LoginSucceededEvent extends DomainEvent<LoginSucceededPayload> {
  type: 'login.succeeded';
}

/**
 * Union type for all registration events
 */
export type RegistrationEvent = 
  | RegistrationSubmittedEvent
  | RegistrationBatchUpsertedEvent
  | AdminRequestUpdateEvent
  | AdminApprovedEvent
  | AdminRejectedEvent
  | DocumentReuploadedEvent
  | StatusChangedEvent
  | LoginSubmittedEvent
  | LoginSucceededEvent;

/**
 * Event handler interface
 */
export interface EventHandler<T extends DomainEvent = DomainEvent> {
  handle(event: T): Promise<void>;
}

/**
 * Event handler result
 */
export interface EventHandlerResult {
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Status transition rules based on Master Context
 */
export const STATUS_TRANSITIONS: Record<RegistrationEventType, string> = {
  'registration.submitted': 'waiting_for_review',
  'registration.batch_upserted': 'waiting_for_review',
  'admin.request_update': 'pending',
  'admin.approved': 'approved',
  'admin.rejected': 'rejected',
  'document.reuploaded': 'waiting_for_review', // After re-upload, back to review
  'status.changed': 'system', // This is handled dynamically
  'login.submitted': 'system', // Login events don't change status
  'login.succeeded': 'system', // Login events don't change status
};

/**
 * Email template mapping
 */
export const EMAIL_TEMPLATES: Record<RegistrationEventType, string> = {
  'registration.submitted': 'received',
  'registration.batch_upserted': 'received',
  'admin.request_update': 'request_update',
  'admin.approved': 'approved',
  'admin.rejected': 'rejected',
  'document.reuploaded': 'received', // Re-send confirmation after re-upload
  'status.changed': 'system', // This is handled dynamically
  'login.submitted': 'system', // Login events don't send emails
  'login.succeeded': 'system', // Login events don't send emails
};
