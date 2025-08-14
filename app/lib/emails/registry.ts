/** @jsxImportSource react */
import { renderEmailTemplate as renderTemplate, getEmailSubject as getSubject } from './render';

// Common props for all email templates
export interface EmailTemplateProps {
  applicantName?: string;
  trackingCode: string;
  ctaUrl?: string;
  deadlineLocal?: string;
  priceApplied?: string;
  packageName?: string;
  rejectedReason?: 'deadline_missed' | 'ineligible_rule_match' | 'other';
  badgeUrl?: string;
  supportEmail?: string;
}

// Re-export the safe rendering functions
export const renderEmailTemplate = renderTemplate;
export const getEmailSubject = getSubject;

/**
 * Get available template names
 * @returns Array of template names
 */
export function getAvailableTemplates(): string[] {
  return ['tracking', 'update-payment', 'update-info', 'update-tcc', 'approval-badge', 'rejection'];
}

/**
 * Validate template name
 * @param templateName Template name to validate
 * @returns True if template exists
 */
export function isValidTemplate(templateName: string): boolean {
  return getAvailableTemplates().includes(templateName);
}
