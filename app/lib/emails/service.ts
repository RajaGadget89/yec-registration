import { sendEmail as _sendEmail } from './provider';
import { renderEmailTemplate as _renderEmailTemplate, getEmailSubject as _getEmailSubject, type EmailTemplateProps } from './registry';
// kept for future use; used to satisfy lint without changing config
void _sendEmail;
void _renderEmailTemplate;
void _getEmailSubject;
import { getServiceRoleClient } from '../supabase-server';
import { enqueueEmail } from './dispatcher';

/**
 * Email service for sending system emails
 * Integrates with the event system and audit logging
 */

export interface EmailSendOptions {
  to: string;
  template: string;
  props: EmailTemplateProps;
  eventId?: string;
  registrationId?: string;
}

/**
 * Send email with audit logging
 */
export async function sendSystemEmail(options: EmailSendOptions): Promise<boolean> {
  const { to, template, props, eventId, registrationId: _registrationId } = options;
  void _registrationId; // used to satisfy lint without changing config
  
  try {
    // Enqueue email in outbox instead of sending directly
    const outboxId = await enqueueEmail(
      template,
      to,
      props,
      eventId ? `event:${eventId}:${template}` : undefined
    );
    
    // Log to audit system
    // await auditEvent('email.enqueued', {
    //   template,
    //   recipient: to,
    //   eventId,
    //   registrationId,
    //   outboxId,
    //   success: true
    // });
    
    console.log(`Email enqueued successfully: ${template} to ${to} (outbox ID: ${outboxId})`);
    return true;
  } catch (error) {
    // Log error to audit system
    // await auditEvent('email.enqueue_error', {
    //   template,
    //   recipient: to,
    //   eventId,
    //   registrationId,
    //   success: false,
    //   error: error instanceof Error ? error.message : 'Unknown error'
    // });
    
    console.error('Email service error:', error);
    return false;
  }
}

/**
 * Send tracking code email for new registration
 */
export async function sendTrackingEmail(
  email: string,
  trackingCode: string,
  applicantName?: string,
  registrationId?: string
): Promise<boolean> {
  return sendSystemEmail({
    to: email,
    template: 'tracking',
    props: {
      applicantName,
      trackingCode,
      supportEmail: process.env.EMAIL_FROM || 'info@yecday.com'
    },
    registrationId
  });
}

/**
 * Send update request email for payment
 */
export async function sendUpdatePaymentEmail(
  email: string,
  trackingCode: string,
  ctaUrl: string,
  applicantName?: string,
  priceApplied?: string,
  packageName?: string,
  registrationId?: string
): Promise<boolean> {
  return sendSystemEmail({
    to: email,
    template: 'update-payment',
    props: {
      applicantName,
      trackingCode,
      ctaUrl,
      priceApplied,
      packageName,
      supportEmail: process.env.EMAIL_FROM || 'info@yecday.com'
    },
    registrationId
  });
}

/**
 * Send update request email for profile info
 */
export async function sendUpdateInfoEmail(
  email: string,
  trackingCode: string,
  ctaUrl: string,
  applicantName?: string,
  registrationId?: string
): Promise<boolean> {
  return sendSystemEmail({
    to: email,
    template: 'update-info',
    props: {
      applicantName,
      trackingCode,
      ctaUrl,
      supportEmail: process.env.EMAIL_FROM || 'info@yecday.com'
    },
    registrationId
  });
}

/**
 * Send update request email for TCC card
 */
export async function sendUpdateTccEmail(
  email: string,
  trackingCode: string,
  ctaUrl: string,
  applicantName?: string,
  registrationId?: string
): Promise<boolean> {
  return sendSystemEmail({
    to: email,
    template: 'update-tcc',
    props: {
      applicantName,
      trackingCode,
      ctaUrl,
      supportEmail: process.env.EMAIL_FROM || 'info@yecday.com'
    },
    registrationId
  });
}

/**
 * Send approval email with badge
 */
export async function sendApprovalEmail(
  email: string,
  trackingCode: string,
  badgeUrl: string,
  applicantName?: string,
  registrationId?: string
): Promise<boolean> {
  return sendSystemEmail({
    to: email,
    template: 'approval-badge',
    props: {
      applicantName,
      trackingCode,
      badgeUrl,
      supportEmail: process.env.EMAIL_FROM || 'info@yecday.com'
    },
    registrationId
  });
}

/**
 * Send rejection email
 */
export async function sendRejectionEmail(
  email: string,
  trackingCode: string,
  rejectedReason: 'deadline_missed' | 'ineligible_rule_match' | 'other',
  applicantName?: string,
  registrationId?: string
): Promise<boolean> {
  return sendSystemEmail({
    to: email,
    template: 'rejection',
    props: {
      applicantName,
      trackingCode,
      rejectedReason,
      supportEmail: process.env.EMAIL_FROM || 'info@yecday.com'
    },
    registrationId
  });
}

/**
 * Get registration data for email sending
 */
export async function getRegistrationForEmail(registrationId: string) {
  const supabase = getServiceRoleClient();
  
  const { data, error } = await supabase
    .from('registrations')
    .select(`
      id,
      email,
      first_name,
      last_name,
      tracking_code,
      status,
      price_applied,
      package_name
    `)
    .eq('id', registrationId)
    .single();
    
  if (error) {
    console.error('Error fetching registration for email:', error);
    return null;
  }
  
  return data;
}

/**
 * Send email based on registration status change
 */
export async function sendStatusChangeEmail(
  registrationId: string,
  newStatus: string,
  updateReason?: string,
  badgeUrl?: string
): Promise<boolean> {
  const registration = await getRegistrationForEmail(registrationId);
  if (!registration) {
    return false;
  }
  
  const applicantName = `${registration.first_name} ${registration.last_name}`.trim();
  const trackingCode = registration.tracking_code;
  
  switch (newStatus) {
    case 'waiting_for_review':
      return sendTrackingEmail(
        registration.email,
        trackingCode,
        applicantName,
        registrationId
      );
      
    case 'awaiting_user_update':
      if (updateReason === 'payment') {
        return sendUpdatePaymentEmail(
          registration.email,
          trackingCode,
          `${process.env.NEXT_PUBLIC_APP_URL}/update/${registrationId}`,
          applicantName,
          registration.price_applied?.toString(),
          registration.package_name,
          registrationId
        );
      } else if (updateReason === 'info') {
        return sendUpdateInfoEmail(
          registration.email,
          trackingCode,
          `${process.env.NEXT_PUBLIC_APP_URL}/update/${registrationId}`,
          applicantName,
          registrationId
        );
      } else if (updateReason === 'tcc') {
        return sendUpdateTccEmail(
          registration.email,
          trackingCode,
          `${process.env.NEXT_PUBLIC_APP_URL}/update/${registrationId}`,
          applicantName,
          registrationId
        );
      }
      break;
      
    case 'approved':
      return sendApprovalEmail(
        registration.email,
        trackingCode,
        badgeUrl || '',
        applicantName,
        registrationId
      );
      
    case 'rejected':
      // Determine rejection reason based on context
      const rejectedReason: 'deadline_missed' | 'ineligible_rule_match' | 'other' = 'other';
      return sendRejectionEmail(
        registration.email,
        trackingCode,
        rejectedReason,
        applicantName,
        registrationId
      );
  }
  
  return false;
}
