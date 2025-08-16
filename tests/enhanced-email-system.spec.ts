/**
 * Enhanced Email System Tests
 * Tests the production-shaped email notifications with Thai/English templates
 * and secure deep-link tokens for the comprehensive review workflow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderEmailTemplate } from '../app/lib/emails/registry';
import { eventDrivenEmailService } from '../app/lib/emails/enhancedEmailService';
import { Registration } from '../app/types/database';

// Mock the email transport
vi.mock('../app/lib/emails/transport', () => ({
  getEmailTransport: vi.fn(() => ({
    send: vi.fn().mockResolvedValue({ ok: true, id: 'test-email-id' }),
    getStats: vi.fn().mockReturnValue({ sent: 1, errors: 0 }),
    getSendLog: vi.fn().mockReturnValue([])
  }))
}));

// Mock Supabase client
vi.mock('../app/lib/supabase-server', () => ({
  getSupabaseServiceClient: vi.fn(() => ({
    rpc: vi.fn().mockResolvedValue({
      data: 'test-token-123',
      error: null
    })
  }))
}));

describe('Enhanced Email System', () => {
  const mockRegistration: Registration = {
    id: 'test-registration-id',
    registration_id: 'YEC2025-001234',
    tracking_code: 'YEC2025-001234',
    first_name: 'สมชาย',
    last_name: 'ใจดี',
    email: 'test@example.com',
    status: 'waiting_for_review',
    update_reason: null,
    review_checklist: {
      payment: { status: 'pending' },
      profile: { status: 'pending' },
      tcc: { status: 'pending' }
    },
    created_at: '2025-01-27T12:00:00Z',
    updated_at: '2025-01-27T12:00:00Z'
  } as Registration;

  const brandTokens = {
    logoUrl: 'https://example.com/logo.png',
    primaryColor: '#1A237E',
    secondaryColor: '#4285C5'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    eventDrivenEmailService.clearProcessedEvents();
  });

  describe('Email Templates', () => {
    it('should render tracking template with brand tokens', () => {
      const html = renderEmailTemplate('tracking', {
        applicantName: 'สมชาย ใจดี',
        trackingCode: 'YEC2025-001234',
        supportEmail: 'info@yecday.com',
        brandTokens
      });

      expect(html).toContain('YEC Day');
      expect(html).toContain('สมชาย ใจดี');
      expect(html).toContain('YEC2025-001234');
      expect(html).toContain('Welcome to YEC Day');
      expect(html).toContain('Registration Tracking Code');
      expect(html).toContain('info@yecday.com');
    });

    it('should render update-payment template with all props', () => {
      const html = renderEmailTemplate('update-payment', {
        applicantName: 'สมชาย ใจดี',
        trackingCode: 'YEC2025-001234',
        ctaUrl: 'https://example.com/update',
        priceApplied: '2,500',
        packageName: 'Early Bird Package',
        dimension: 'payment',
        notes: 'Please provide a clearer payment slip',
        supportEmail: 'info@yecday.com',
        brandTokens
      });

      expect(html).toContain('ต้องการข้อมูลเพิ่มเติม');
      expect(html).toContain('อัปเดตสลิปการโอนเงิน');
      expect(html).toContain('2,500');
      expect(html).toContain('Early Bird Package');
      expect(html).toContain('Please provide a clearer payment slip');
      expect(html).toContain('Update Payment Slip');
      expect(html).toContain('https://example.com/update');
    });

    it('should render update-info template with notes', () => {
      const html = renderEmailTemplate('update-info', {
        applicantName: 'สมชาย ใจดี',
        trackingCode: 'YEC2025-001234',
        ctaUrl: 'https://example.com/update',
        dimension: 'profile',
        notes: 'Please update your profile picture',
        supportEmail: 'info@yecday.com',
        brandTokens
      });

      expect(html).toContain('ต้องการข้อมูลเพิ่มเติม');
      expect(html).toContain('อัปเดตข้อมูลส่วนบุคคล');
      expect(html).toContain('Please update your profile picture');
      expect(html).toContain('Update Profile Information');
    });

    it('should render update-tcc template with dimension', () => {
      const html = renderEmailTemplate('update-tcc', {
        applicantName: 'สมชาย ใจดี',
        trackingCode: 'YEC2025-001234',
        ctaUrl: 'https://example.com/update',
        dimension: 'tcc',
        notes: 'Please provide a clearer TCC card image',
        supportEmail: 'info@yecday.com',
        brandTokens
      });

      expect(html).toContain('ต้องการข้อมูลเพิ่มเติม');
      expect(html).toContain('อัปเดตรูปบัตร TCC');
      expect(html).toContain('Please provide a clearer TCC card image');
      expect(html).toContain('Update TCC Card');
    });

    it('should render approval-badge template with badge URL', () => {
      const html = renderEmailTemplate('approval-badge', {
        applicantName: 'สมชาย ใจดี',
        trackingCode: 'YEC2025-001234',
        badgeUrl: 'https://example.com/badge.png',
        supportEmail: 'info@yecday.com',
        brandTokens
      });

      expect(html).toContain('อนุมัติเรียบร้อยแล้ว');
      expect(html).toContain('บัตรประจำตัว YEC Day ของคุณ');
      expect(html).toContain('https://example.com/badge.png');
      expect(html).toContain('Approved');
      expect(html).toContain('Your YEC Day Badge');
      expect(html).toContain('Download Badge');
    });
  });

  describe('Event-Driven Email Service', () => {
    it('should process registration.created event', async () => {
      const result = await eventDrivenEmailService.processEvent(
        'registration.created',
        mockRegistration,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        brandTokens
      );

      expect(result).toBeDefined();
      expect(result?.ok).toBe(true);
      expect(result?.template).toBe('tracking');
      expect(result?.to).toBe('test@example.com');
      expect(result?.trackingCode).toBe('YEC2025-001234');
    });

    it('should process review.request_update event for payment', async () => {
      const result = await eventDrivenEmailService.processEvent(
        'review.request_update',
        mockRegistration,
        'admin@example.com',
        'payment',
        'Please provide a clearer payment slip',
        undefined,
        undefined,
        brandTokens
      );

      expect(result).toBeDefined();
      expect(result?.ok).toBe(true);
      expect(result?.template).toBe('update-payment');
      expect(result?.to).toBe('test@example.com');
      expect(result?.ctaUrl).toContain('/user/');
    });

    it('should process review.request_update event for profile', async () => {
      const result = await eventDrivenEmailService.processEvent(
        'review.request_update',
        mockRegistration,
        'admin@example.com',
        'profile',
        'Please update your profile picture',
        undefined,
        undefined,
        brandTokens
      );

      expect(result).toBeDefined();
      expect(result?.ok).toBe(true);
      expect(result?.template).toBe('update-info');
      expect(result?.to).toBe('test@example.com');
    });

    it('should process review.request_update event for tcc', async () => {
      const result = await eventDrivenEmailService.processEvent(
        'review.request_update',
        mockRegistration,
        'admin@example.com',
        'tcc',
        'Please provide a clearer TCC card image',
        undefined,
        undefined,
        brandTokens
      );

      expect(result).toBeDefined();
      expect(result?.ok).toBe(true);
      expect(result?.template).toBe('update-tcc');
      expect(result?.to).toBe('test@example.com');
    });

    it('should process review.approved event', async () => {
      const result = await eventDrivenEmailService.processEvent(
        'review.approved',
        mockRegistration,
        'admin@example.com',
        undefined,
        undefined,
        'https://example.com/badge.png',
        undefined,
        brandTokens
      );

      expect(result).toBeDefined();
      expect(result?.ok).toBe(true);
      expect(result?.template).toBe('approval-badge');
      expect(result?.to).toBe('test@example.com');
      expect(result?.badgeUrl).toBe('https://example.com/badge.png');
    });

    it('should process review.rejected event', async () => {
      const result = await eventDrivenEmailService.processEvent(
        'review.rejected',
        mockRegistration,
        'admin@example.com',
        undefined,
        undefined,
        undefined,
        'deadline_missed',
        brandTokens
      );

      expect(result).toBeDefined();
      expect(result?.ok).toBe(true);
      expect(result?.template).toBe('rejection');
      expect(result?.to).toBe('test@example.com');
    });

    it('should handle unknown event types gracefully', async () => {
      const result = await eventDrivenEmailService.processEvent(
        'unknown.event',
        mockRegistration,
        'admin@example.com',
        undefined,
        undefined,
        undefined,
        undefined,
        brandTokens
      );

      expect(result).toBeNull();
    });

    it('should require admin email and dimension for update requests', async () => {
      await expect(
        eventDrivenEmailService.processEvent(
          'review.request_update',
          mockRegistration,
          undefined, // missing admin email
          'payment',
          undefined,
          undefined,
          undefined,
          brandTokens
        )
      ).rejects.toThrow('Admin email and dimension required for update request');

      await expect(
        eventDrivenEmailService.processEvent(
          'review.request_update',
          mockRegistration,
          'admin@example.com',
          undefined, // missing dimension
          undefined,
          undefined,
          undefined,
          brandTokens
        )
      ).rejects.toThrow('Admin email and dimension required for update request');
    });

    it('should require rejection reason for rejections', async () => {
      await expect(
        eventDrivenEmailService.processEvent(
          'review.rejected',
          mockRegistration,
          'admin@example.com',
          undefined,
          undefined,
          undefined,
          undefined, // missing rejection reason
          brandTokens
        )
      ).rejects.toThrow('Rejection reason required for rejection email');
    });
  });

  describe('Deep Link Token Generation', () => {
    it('should generate deep link tokens for different dimensions', async () => {
      const { generateDeepLinkToken } = await import('../app/lib/emails/enhancedEmailService');

      const tokenResult = await generateDeepLinkToken(
        'test-registration-id',
        'payment',
        'admin@example.com',
        86400 // 24 hours
      );

      expect(tokenResult).toBeDefined();
      expect(tokenResult.token).toBeDefined();
      expect(tokenResult.ctaUrl).toContain('/user/');
      expect(tokenResult.ctaUrl).toContain('/resubmit');
      expect(tokenResult.expiresAt).toBeDefined();
    });
  });

  describe('Brand Tokens', () => {
    it('should provide default brand tokens', () => {
      const tokens = eventDrivenEmailService.getBrandTokens();
      
      expect(tokens).toBeDefined();
      expect(tokens.primaryColor).toBe('#1A237E');
      expect(tokens.secondaryColor).toBe('#4285C5');
    });

    it('should use brand tokens in templates', () => {
      const html = renderEmailTemplate('tracking', {
        applicantName: 'สมชาย ใจดี',
        trackingCode: 'YEC2025-001234',
        supportEmail: 'info@yecday.com',
        brandTokens: {
          primaryColor: '#FF0000',
          secondaryColor: '#00FF00'
        }
      });

      // The template should use the custom colors
      expect(html).toContain('YEC Day');
      expect(html).toContain('สมชาย ใจดี');
    });
  });
});
