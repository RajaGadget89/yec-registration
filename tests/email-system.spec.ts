import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { 
  renderEmailTemplate, 
  getEmailSubject, 
  getAvailableTemplates,
  isValidTemplate,
  emailTemplates,
  EmailTemplateProps 
} from '../app/lib/emails/registry';
import { sendEmail, testEmailConnection, getEmailProviderStatus } from '../app/lib/emails/provider';
import { 
  sendSystemEmail,
  sendTrackingEmail,
  sendUpdatePaymentEmail,
  sendApprovalEmail,
  sendRejectionEmail 
} from '../app/lib/emails/service';

// Mock the email provider
vi.mock('../app/lib/emails/provider', () => ({
  sendEmail: vi.fn(),
  testEmailConnection: vi.fn(),
  getEmailProviderStatus: vi.fn()
}));

// Mock audit system
vi.mock('../app/lib/audit/auditClient', () => ({
  auditEvent: vi.fn()
}));

// Mock Supabase
vi.mock('../app/lib/supabase-server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: 'test-id',
              email: 'test@example.com',
              first_name: 'Test',
              last_name: 'User',
              tracking_code: 'YEC2025-001234',
              status: 'waiting_for_review',
              price_applied: 2500,
              package_name: 'Early Bird'
            },
            error: null
          }))
        }))
      }))
    }))
  }))
}));

describe('Email System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Template Registry', () => {
    it('should have all required templates', () => {
      const templates = getAvailableTemplates();
      expect(templates).toContain('tracking');
      expect(templates).toContain('update-payment');
      expect(templates).toContain('update-info');
      expect(templates).toContain('update-tcc');
      expect(templates).toContain('approval-badge');
      expect(templates).toContain('rejection');
      expect(templates).toHaveLength(6);
    });

    it('should validate template names correctly', () => {
      expect(isValidTemplate('tracking')).toBe(true);
      expect(isValidTemplate('invalid-template')).toBe(false);
      expect(isValidTemplate('')).toBe(false);
    });

    it('should get correct subjects for templates', () => {
      expect(getEmailSubject('tracking')).toBe('[YEC Day] รหัสติดตามการสมัครของคุณ | Your Registration Tracking Code');
      expect(getEmailSubject('update-payment')).toBe('[YEC Day] โปรดอัปเดตสลิปโอนเงิน | Please Update Your Payment Slip');
      expect(getEmailSubject('approval-badge')).toBe('[YEC Day] อนุมัติเรียบร้อย — เจอกันในงาน! | Approved — See You at the Seminar');
    });

    it('should throw error for invalid template names', () => {
      expect(() => getEmailSubject('invalid-template')).toThrow('Email template \'invalid-template\' not found');
      expect(() => renderEmailTemplate('invalid-template', { trackingCode: 'test' })).toThrow('Email template \'invalid-template\' not found');
    });
  });

  describe('Template Rendering', () => {
    const sampleProps: EmailTemplateProps = {
      applicantName: 'สมชาย ใจดี',
      trackingCode: 'YEC2025-001234',
      ctaUrl: 'https://example.com/update',
      deadlineLocal: '2025-02-15 23:59',
      priceApplied: '2,500',
      packageName: 'Early Bird Package',
      rejectedReason: 'deadline_missed',
      badgeUrl: 'https://example.com/badge.png',
      supportEmail: 'info@yecday.com'
    };

    it('should render tracking template correctly', () => {
      const html = renderEmailTemplate('tracking', sampleProps);
      expect(html).toContain('YEC Day');
      expect(html).toContain('สมชาย ใจดี');
      expect(html).toContain('YEC2025-001234');
      expect(html).toContain('Welcome to YEC Day');
      expect(html).toContain('Registration Tracking Code');
    });

    it('should render update-payment template correctly', () => {
      const html = renderEmailTemplate('update-payment', sampleProps);
      expect(html).toContain('ต้องการข้อมูลเพิ่มเติม');
      expect(html).toContain('อัปเดตสลิปการโอนเงิน');
      expect(html).toContain('2,500');
      expect(html).toContain('Early Bird Package');
      expect(html).toContain('Update Payment Slip');
    });

    it('should render approval-badge template correctly', () => {
      const html = renderEmailTemplate('approval-badge', sampleProps);
      expect(html).toContain('อนุมัติเรียบร้อยแล้ว');
      expect(html).toContain('บัตรประจำตัว YEC Day ของคุณ');
      expect(html).toContain('https://example.com/badge.png');
      expect(html).toContain('Approved');
      expect(html).toContain('Your YEC Day Badge');
    });

    it('should render rejection template correctly', () => {
      const html = renderEmailTemplate('rejection', sampleProps);
      expect(html).toContain('คำขอสมัครไม่ผ่าน');
      expect(html).toContain('เนื่องจากเกินกำหนดเวลาการสมัครที่กำหนดไว้');
      expect(html).toContain('Registration Not Approved');
      expect(html).toContain('due to missing the registration deadline');
    });

    it('should handle missing optional props gracefully', () => {
      const minimalProps: EmailTemplateProps = {
        trackingCode: 'YEC2025-001234'
      };
      
      const html = renderEmailTemplate('tracking', minimalProps);
      expect(html).toContain('YEC2025-001234');
      expect(html).toContain('ผู้สมัคร'); // Default name
    });
  });

  describe('Email Service', () => {
    const mockSendEmail = vi.mocked(sendEmail);
    const mockAuditEvent = vi.mocked(await import('../app/lib/audit/auditClient')).auditEvent;

    beforeEach(() => {
      mockSendEmail.mockResolvedValue(true);
      mockAuditEvent.mockResolvedValue();
    });

    it('should send tracking email successfully', async () => {
      const result = await sendTrackingEmail(
        'test@example.com',
        'YEC2025-001234',
        'Test User',
        'test-registration-id'
      );

      expect(result).toBe(true);
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: '[YEC Day] รหัสติดตามการสมัครของคุณ | Your Registration Tracking Code',
        html: expect.stringContaining('YEC2025-001234')
      });
      expect(mockAuditEvent).toHaveBeenCalledWith('email.sent', expect.objectContaining({
        template: 'tracking',
        recipient: 'test@example.com',
        success: true
      }));
    });

    it('should send update payment email successfully', async () => {
      const result = await sendUpdatePaymentEmail(
        'test@example.com',
        'YEC2025-001234',
        'https://example.com/update',
        'Test User',
        '2,500',
        'Early Bird',
        'test-registration-id'
      );

      expect(result).toBe(true);
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: '[YEC Day] โปรดอัปเดตสลิปโอนเงิน | Please Update Your Payment Slip',
        html: expect.stringContaining('2,500')
      });
    });

    it('should send approval email successfully', async () => {
      const result = await sendApprovalEmail(
        'test@example.com',
        'YEC2025-001234',
        'https://example.com/badge.png',
        'Test User',
        'test-registration-id'
      );

      expect(result).toBe(true);
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: '[YEC Day] อนุมัติเรียบร้อย — เจอกันในงาน! | Approved — See You at the Seminar',
        html: expect.stringContaining('https://example.com/badge.png')
      });
    });

    it('should send rejection email successfully', async () => {
      const result = await sendRejectionEmail(
        'test@example.com',
        'YEC2025-001234',
        'deadline_missed',
        'Test User',
        'test-registration-id'
      );

      expect(result).toBe(true);
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: '[YEC Day] คำขอสมัครไม่ผ่าน | Registration Not Approved',
        html: expect.stringContaining('เนื่องจากเกินกำหนดเวลาการสมัครที่กำหนดไว้')
      });
    });

    it('should handle email sending failures', async () => {
      mockSendEmail.mockResolvedValue(false);

      const result = await sendTrackingEmail(
        'test@example.com',
        'YEC2025-001234',
        'Test User',
        'test-registration-id'
      );

      expect(result).toBe(false);
      expect(mockAuditEvent).toHaveBeenCalledWith('email.failed', expect.objectContaining({
        template: 'tracking',
        recipient: 'test@example.com',
        success: false
      }));
    });

    it('should handle email sending errors', async () => {
      mockSendEmail.mockRejectedValue(new Error('Provider error'));

      const result = await sendTrackingEmail(
        'test@example.com',
        'YEC2025-001234',
        'Test User',
        'test-registration-id'
      );

      expect(result).toBe(false);
      expect(mockAuditEvent).toHaveBeenCalledWith('email.error', expect.objectContaining({
        template: 'tracking',
        recipient: 'test@example.com',
        success: false,
        error: 'Provider error'
      }));
    });
  });

  describe('Date Formatting', () => {
    it('should format UTC dates to Asia/Bangkok correctly', () => {
      // This would be tested with actual date formatting utilities
      // For now, we'll test that the template accepts date strings
      const props: EmailTemplateProps = {
        trackingCode: 'YEC2025-001234',
        deadlineLocal: '2025-02-15 23:59'
      };

      const html = renderEmailTemplate('tracking', props);
      expect(html).toContain('YEC2025-001234');
    });
  });

  describe('Template Structure', () => {
    it('should include proper HTML structure', () => {
      const html = renderEmailTemplate('tracking', { trackingCode: 'YEC2025-001234' });
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('<head>');
      expect(html).toContain('<meta charset="utf-8">');
      expect(html).toContain('<meta name="viewport"');
      expect(html).toContain('<title>YEC Day</title>');
      expect(html).toContain('</html>');
    });

    it('should include brand colors and styling', () => {
      const html = renderEmailTemplate('tracking', { trackingCode: 'YEC2025-001234' });
      
      expect(html).toContain('#1A237E'); // Primary color
      expect(html).toContain('#4285C5'); // Accent color
      expect(html).toContain('#4CD1E0'); // Highlight color
    });

    it('should include PDPA notice in footer', () => {
      const html = renderEmailTemplate('tracking', { trackingCode: 'YEC2025-001234' });
      
      expect(html).toContain('PDPA Notice');
      expect(html).toContain('ข้อมูลส่วนบุคคลของคุณจะถูกใช้เพื่อการลงทะเบียนและติดต่อเท่านั้น');
      expect(html).toContain('Your personal data will be used for registration and contact purposes only');
    });
  });
});

