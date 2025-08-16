import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  dispatchEmailBatch, 
  getOutboxStats, 
  enqueueEmail, 
  retryFailedEmails,
  cleanupOldEmails 
} from '../app/lib/emails/dispatcher';
import { EmailTemplateProps } from '../app/lib/emails/registry';

// Mock Supabase client
const mockSupabase = {
  rpc: vi.fn(),
  from: vi.fn(() => ({
    update: vi.fn(() => ({
      in: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            data: [{ id: 'test-id' }],
            error: null
          }))
        }))
      }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        lt: vi.fn(() => ({
          select: vi.fn(() => ({
            data: [{ id: 'test-id' }],
            error: null
          }))
        }))
      }))
    })),
    insert: vi.fn(() => ({
      data: 'test-outbox-id',
      error: null
    }))
  })
};

vi.mock('../app/lib/supabase-server', () => ({
  createClient: () => mockSupabase
}));

// Mock email provider
vi.mock('../app/lib/emails/provider', () => ({
  sendEmail: vi.fn()
}));

// Mock audit system
vi.mock('../app/lib/audit/auditClient', () => ({
  auditEvent: vi.fn()
}));

describe('Email Outbox System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('enqueueEmail', () => {
    it('should enqueue an email successfully', async () => {
      const template = 'tracking';
      const toEmail = 'test@example.com';
      const payload: EmailTemplateProps = {
        trackingCode: 'TEST123',
        applicantName: 'Test User'
      };
      const idempotencyKey = 'test-key';

      mockSupabase.rpc.mockResolvedValue({
        data: 'test-outbox-id',
        error: null
      });

      const result = await enqueueEmail(template, toEmail, payload, idempotencyKey);

      expect(result).toBe('test-outbox-id');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('fn_enqueue_email', {
        p_template: template,
        p_to_email: toEmail,
        p_payload: payload,
        p_idempotency_key: idempotencyKey
      });
    });

    it('should handle enqueue errors', async () => {
      const template = 'tracking';
      const toEmail = 'test@example.com';
      const payload: EmailTemplateProps = {
        trackingCode: 'TEST123'
      };

      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      await expect(enqueueEmail(template, toEmail, payload)).rejects.toThrow('Failed to enqueue email: Database error');
    });
  });

  describe('getOutboxStats', () => {
    it('should return outbox statistics', async () => {
      const mockStats = {
        total_pending: 5,
        total_sent: 100,
        total_error: 2,
        oldest_pending: '2025-01-27T10:00:00Z'
      };

      mockSupabase.rpc.mockResolvedValue({
        data: [mockStats],
        error: null
      });

      const result = await getOutboxStats();

      expect(result).toEqual(mockStats);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('fn_get_outbox_stats');
    });

    it('should return default stats when no data', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await getOutboxStats();

      expect(result).toEqual({
        total_pending: 0,
        total_sent: 0,
        total_error: 0,
        oldest_pending: null
      });
    });

    it('should handle stats errors', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Stats error' }
      });

      await expect(getOutboxStats()).rejects.toThrow('Failed to get outbox stats: Stats error');
    });
  });

  describe('dispatchEmailBatch', () => {
    it('should dispatch emails successfully', async () => {
      const mockPendingEmails = [
        {
          id: 'email-1',
          template: 'tracking',
          to_email: 'test1@example.com',
          payload: { trackingCode: 'TEST1' },
          idempotency_key: 'key-1'
        },
        {
          id: 'email-2',
          template: 'rejection',
          to_email: 'test2@example.com',
          payload: { trackingCode: 'TEST2', rejectedReason: 'deadline_missed' },
          idempotency_key: 'key-2'
        }
      ];

      const mockStats = {
        total_pending: 0,
        total_sent: 0,
        total_error: 0,
        oldest_pending: null
      };

      // Mock get pending emails
      mockSupabase.rpc
        .mockResolvedValueOnce({
          data: mockPendingEmails,
          error: null
        })
        .mockResolvedValueOnce({
          data: [mockStats],
          error: null
        });

      // Mock mark as sent
      mockSupabase.rpc
        .mockResolvedValueOnce({ error: null }) // mark email-1 as sent
        .mockResolvedValueOnce({ error: null }); // mark email-2 as sent

      const result = await dispatchEmailBatch(50);

      expect(result.sent).toBe(2);
      expect(result.errors).toBe(0);
      expect(result.remaining).toBe(0);
      expect(result.details.successful).toContain('email-1');
      expect(result.details.successful).toContain('email-2');
      expect(result.details.failed).toHaveLength(0);
    });

    it('should handle dispatch errors', async () => {
      const mockPendingEmails = [
        {
          id: 'email-1',
          template: 'tracking',
          to_email: 'test1@example.com',
          payload: { trackingCode: 'TEST1' },
          idempotency_key: 'key-1'
        }
      ];

      const mockStats = {
        total_pending: 0,
        total_sent: 0,
        total_error: 0,
        oldest_pending: null
      };

      // Mock get pending emails
      mockSupabase.rpc
        .mockResolvedValueOnce({
          data: mockPendingEmails,
          error: null
        })
        .mockResolvedValueOnce({
          data: [mockStats],
          error: null
        });

      // Mock mark as error
      mockSupabase.rpc.mockResolvedValueOnce({ error: null });

      const result = await dispatchEmailBatch(50);

      expect(result.sent).toBe(0);
      expect(result.errors).toBe(1);
      expect(result.details.failed).toHaveLength(1);
      expect(result.details.failed[0].id).toBe('email-1');
    });

    it('should handle no pending emails', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await dispatchEmailBatch(50);

      expect(result.sent).toBe(0);
      expect(result.errors).toBe(0);
      expect(result.remaining).toBe(0);
      expect(result.details.successful).toHaveLength(0);
      expect(result.details.failed).toHaveLength(0);
    });

    it('should handle fetch errors', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Fetch error' }
      });

      await expect(dispatchEmailBatch(50)).rejects.toThrow('Failed to fetch pending emails: Fetch error');
    });
  });

  describe('retryFailedEmails', () => {
    it('should retry failed emails successfully', async () => {
      const emailIds = ['email-1', 'email-2'];

      const result = await retryFailedEmails(emailIds);

      expect(result).toBe(2);
      expect(mockSupabase.from).toHaveBeenCalledWith('email_outbox');
    });

    it('should handle empty email IDs', async () => {
      const result = await retryFailedEmails([]);

      expect(result).toBe(0);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should handle retry errors', async () => {
      const emailIds = ['email-1'];

      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          in: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                data: null,
                error: { message: 'Retry error' }
              }))
            }))
          }))
        }))
      });

      await expect(retryFailedEmails(emailIds)).rejects.toThrow('Failed to retry failed emails: Retry error');
    });
  });

  describe('cleanupOldEmails', () => {
    it('should cleanup old emails successfully', async () => {
      const result = await cleanupOldEmails(30);

      expect(result).toBe(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('email_outbox');
    });

    it('should handle cleanup errors', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            lt: vi.fn(() => ({
              select: vi.fn(() => ({
                data: null,
                error: { message: 'Cleanup error' }
              }))
            }))
          }))
        }))
      });

      await expect(cleanupOldEmails(30)).rejects.toThrow('Failed to cleanup old emails: Cleanup error');
    });
  });
});

