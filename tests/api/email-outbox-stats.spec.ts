import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the dependencies
vi.mock('../../app/lib/admin-guard-server', () => ({
  validateAdminAccess: vi.fn()
}));

vi.mock('../../app/lib/emails/dispatcher', () => ({
  getOutboxStats: vi.fn()
}));

vi.mock('../../app/lib/audit/auditClient', () => ({
  logAccess: vi.fn()
}));

// Import the function to test
import { GET } from '../../app/api/admin/email-outbox-stats/route';

describe('Email Outbox Stats API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return stats when admin access is valid', async () => {
    // Mock dependencies
    const { validateAdminAccess } = await import('../../app/lib/admin-guard-server');
    const { getOutboxStats } = await import('../../app/lib/emails/dispatcher');
    const { logAccess } = await import('../../app/lib/audit/auditClient');

    (validateAdminAccess as any).mockReturnValue({
      valid: true,
      adminEmail: 'admin@test.com'
    });

    (getOutboxStats as any).mockResolvedValue({
      total_pending: 5,
      total_sent: 100,
      total_error: 2,
      oldest_pending: '2025-01-27T10:00:00Z'
    });

    (logAccess as any).mockResolvedValue(undefined);

    // Create mock request
    const request = new NextRequest('http://localhost:3000/api/admin/email-outbox-stats');

    // Call the API
    const response = await GET(request);
    const data = await response.json();

    // Verify response
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.stats).toEqual({
      total_pending: 5,
      total_sent: 100,
      total_error: 2,
      oldest_pending: '2025-01-27T10:00:00Z'
    });

    // Verify dependencies were called
    expect(validateAdminAccess).toHaveBeenCalledWith(request);
    expect(getOutboxStats).toHaveBeenCalled();
    expect(logAccess).toHaveBeenCalled();
  });

  it('should return 401 when admin access is invalid', async () => {
    // Mock dependencies
    const { validateAdminAccess } = await import('../../app/lib/admin-guard-server');

    (validateAdminAccess as any).mockReturnValue({
      valid: false,
      adminEmail: null
    });

    // Create mock request
    const request = new NextRequest('http://localhost:3000/api/admin/email-outbox-stats');

    // Call the API
    const response = await GET(request);
    const data = await response.json();

    // Verify response
    expect(response.status).toBe(401);
    expect(data.ok).toBe(false);
    expect(data.error).toBe('unauthorized');
  });

  it('should return 500 when getOutboxStats throws an error', async () => {
    // Mock dependencies
    const { validateAdminAccess } = await import('../../app/lib/admin-guard-server');
    const { getOutboxStats } = await import('../../app/lib/emails/dispatcher');
    const { logAccess } = await import('../../app/lib/audit/auditClient');

    (validateAdminAccess as any).mockReturnValue({
      valid: true,
      adminEmail: 'admin@test.com'
    });

    (getOutboxStats as any).mockRejectedValue(new Error('Database error'));
    (logAccess as any).mockResolvedValue(undefined);

    // Create mock request
    const request = new NextRequest('http://localhost:3000/api/admin/email-outbox-stats');

    // Call the API
    const response = await GET(request);
    const data = await response.json();

    // Verify response
    expect(response.status).toBe(500);
    expect(data.ok).toBe(false);
    expect(data.error).toBe('Database error');
  });
});
