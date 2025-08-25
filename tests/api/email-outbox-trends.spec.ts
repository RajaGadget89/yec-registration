import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the dependencies
vi.mock('../../app/lib/admin-guard-server', () => ({
  validateAdminAccess: vi.fn()
}));

vi.mock('../../app/lib/emails/queries/GetEmailOutboxTrends', () => ({
  GetEmailOutboxTrends: vi.fn()
}));

vi.mock('../../app/lib/emails/alerts/EmailOutboxAlertEvaluator', () => ({
  EmailOutboxAlertEvaluator: vi.fn()
}));

vi.mock('../../app/lib/audit/auditClient', () => ({
  logAccess: vi.fn()
}));

// Import the function to test
import { GET } from '../../app/api/admin/email-outbox-trends/route';

describe('Email Outbox Trends API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return trends and alerts when admin access is valid', async () => {
    // Mock dependencies
    const { validateAdminAccess } = await import('../../app/lib/admin-guard-server');
    const { GetEmailOutboxTrends } = await import('../../app/lib/emails/queries/GetEmailOutboxTrends');
    const { EmailOutboxAlertEvaluator } = await import('../../app/lib/emails/alerts/EmailOutboxAlertEvaluator');
    const { logAccess } = await import('../../app/lib/audit/auditClient');

    // Mock admin access
    (validateAdminAccess as any).mockReturnValue({
      valid: true,
      adminEmail: 'admin@example.com'
    });

    // Mock trends data
    const mockTrends = {
      window: "24h" as const,
      buckets: [
        {
          ts: "2025-01-27T00:00:00.000Z",
          queued: 5,
          sent: 3,
          failed: 1,
          pending_snapshot: 2
        }
      ],
      summary: {
        total_queued: 10,
        total_sent: 8,
        total_failed: 2,
        oldest_pending: "2025-01-27T10:00:00.000Z",
        current_pending: 5,
        success_rate_24h: 0.8
      }
    };

    // Mock alert data
    const mockAlert = {
      ok: true,
      reasons: [],
      details: {}
    };

    // Mock the use case and evaluator
    const mockTrendsQuery = {
      execute: vi.fn().mockResolvedValue(mockTrends)
    };
    (GetEmailOutboxTrends as any).mockImplementation(() => mockTrendsQuery);

    const mockAlertEvaluator = {
      evaluate: vi.fn().mockReturnValue(mockAlert)
    };
    (EmailOutboxAlertEvaluator as any).mockImplementation(() => mockAlertEvaluator);

    // Mock audit logging
    (logAccess as any).mockResolvedValue(undefined);

    // Create mock request
    const request = new NextRequest('http://localhost:3000/api/admin/email-outbox-trends');

    // Call the API
    const response = await GET(request);
    const data = await response.json();

    // Assertions
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.window).toBe("24h");
    expect(data.trends).toEqual(mockTrends);
    expect(data.alert).toEqual(mockAlert);

    // Verify dependencies were called
    expect(validateAdminAccess).toHaveBeenCalledWith(request);
    expect(mockTrendsQuery.execute).toHaveBeenCalled();
    expect(mockAlertEvaluator.evaluate).toHaveBeenCalledWith(mockTrends);
    expect(logAccess).toHaveBeenCalledWith(expect.objectContaining({
      action: "admin.email_outbox_trends.read",
      result: "success"
    }));
  });

  it('should return 401 when admin access is invalid', async () => {
    // Mock dependencies
    const { validateAdminAccess } = await import('../../app/lib/admin-guard-server');

    // Mock admin access failure
    (validateAdminAccess as any).mockReturnValue({
      valid: false,
      adminEmail: null
    });

    // Create mock request
    const request = new NextRequest('http://localhost:3000/api/admin/email-outbox-trends');

    // Call the API
    const response = await GET(request);
    const data = await response.json();

    // Assertions
    expect(response.status).toBe(401);
    expect(data.ok).toBe(false);
    expect(data.error).toBe("unauthorized");
  });

  it('should return 500 when trends query throws an error', async () => {
    // Mock dependencies
    const { validateAdminAccess } = await import('../../app/lib/admin-guard-server');
    const { GetEmailOutboxTrends } = await import('../../app/lib/emails/queries/GetEmailOutboxTrends');
    const { logAccess } = await import('../../app/lib/audit/auditClient');

    // Mock admin access
    (validateAdminAccess as any).mockReturnValue({
      valid: true,
      adminEmail: 'admin@example.com'
    });

    // Mock trends query error
    const mockTrendsQuery = {
      execute: vi.fn().mockRejectedValue(new Error('Database error'))
    };
    (GetEmailOutboxTrends as any).mockImplementation(() => mockTrendsQuery);

    // Mock audit logging
    (logAccess as any).mockResolvedValue(undefined);

    // Create mock request
    const request = new NextRequest('http://localhost:3000/api/admin/email-outbox-trends');

    // Call the API
    const response = await GET(request);
    const data = await response.json();

    // Assertions
    expect(response.status).toBe(500);
    expect(data.ok).toBe(false);
    expect(data.error).toBe("internal_server_error");
    expect(data.message).toBe("Failed to get email outbox trends");

    // Verify audit logging was called for error
    expect(logAccess).toHaveBeenCalledWith(expect.objectContaining({
      action: "admin.email_outbox_trends.read",
      result: "error"
    }));
  });

  it('should return 500 when alert evaluator throws an error', async () => {
    // Mock dependencies
    const { validateAdminAccess } = await import('../../app/lib/admin-guard-server');
    const { GetEmailOutboxTrends } = await import('../../app/lib/emails/queries/GetEmailOutboxTrends');
    const { EmailOutboxAlertEvaluator } = await import('../../app/lib/emails/alerts/EmailOutboxAlertEvaluator');
    const { logAccess } = await import('../../app/lib/audit/auditClient');

    // Mock admin access
    (validateAdminAccess as any).mockReturnValue({
      valid: true,
      adminEmail: 'admin@example.com'
    });

    // Mock trends data
    const mockTrends = {
      window: "24h" as const,
      buckets: [],
      summary: {
        total_queued: 0,
        total_sent: 0,
        total_failed: 0,
        oldest_pending: null,
        current_pending: 0,
        success_rate_24h: 0
      }
    };

    // Mock the use case
    const mockTrendsQuery = {
      execute: vi.fn().mockResolvedValue(mockTrends)
    };
    (GetEmailOutboxTrends as any).mockImplementation(() => mockTrendsQuery);

    // Mock alert evaluator error
    const mockAlertEvaluator = {
      evaluate: vi.fn().mockImplementation(() => {
        throw new Error('Alert evaluation error');
      })
    };
    (EmailOutboxAlertEvaluator as any).mockImplementation(() => mockAlertEvaluator);

    // Mock audit logging
    (logAccess as any).mockResolvedValue(undefined);

    // Create mock request
    const request = new NextRequest('http://localhost:3000/api/admin/email-outbox-trends');

    // Call the API
    const response = await GET(request);
    const data = await response.json();

    // Assertions
    expect(response.status).toBe(500);
    expect(data.ok).toBe(false);
    expect(data.error).toBe("internal_server_error");
  });
});
