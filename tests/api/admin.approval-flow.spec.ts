/// <reference types="vitest" />
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock the email service
vi.mock('../../app/lib/emailService', () => ({
  sendApprovedEmail: vi.fn(),
}));

// Mock the Supabase service
vi.mock('../../app/lib/supabase-server', () => ({
  getSupabaseServiceClient: vi.fn(),
}));

// Mock the badge generator
vi.mock('../../app/lib/generateBadge', () => ({
  generateBadge: vi.fn(),
}));

// Mock the timezone utils
vi.mock('../../app/lib/timezoneUtils', () => ({
  getThailandTimeISOString: vi.fn(() => '2025-01-27T12:30:00.000Z'),
}));

// Import the mocked functions
import { sendApprovedEmail } from '../../app/lib/emailService';
import { getSupabaseServiceClient } from '../../app/lib/supabase-server';
import { generateBadge } from '../../app/lib/generateBadge';
import { getThailandTimeISOString } from '../../app/lib/timezoneUtils';

// Utility function to reset all mocks
const resetMocks = () => {
  vi.clearAllMocks();
  vi.resetAllMocks();
};

// Utility function to create a mock Supabase client
const createMockSupabaseClient = () => {
  const mockSelect = vi.fn();
  const mockUpdate = vi.fn();
  const mockFrom = vi.fn(() => ({
    select: mockSelect,
    update: mockUpdate,
  }));

  return {
    from: mockFrom,
    select: mockSelect,
    update: mockUpdate,
  };
};

// Utility function to create a mock Request
const createMockRequest = (body: any, headers: Record<string, string> = {}) => {
  return new Request('http://localhost:3000/api/admin/approve-registration', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
};

describe('POST /api/admin/approve-registration - Admin Approval Flow', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    resetMocks();
    mockSupabaseClient = createMockSupabaseClient();
    (getSupabaseServiceClient as any).mockReturnValue(mockSupabaseClient);
    (generateBadge as any).mockResolvedValue('https://storage.example/badges/123.png');
    (sendApprovedEmail as any).mockResolvedValue(true);
  });

  afterEach(() => {
    resetMocks();
  });

  it('should approve registration and generate badge', async () => {
    // Arrange - seed/mock one pending record (status: "waiting_for_review")
    const mockRegistration = {
      id: 123,
      email: 'sharepoints911@gmail.com',
      first_name: 'Somchai',
      last_name: 'Jaidee',
      status: 'waiting_for_review',
      badge_url: null
    };

    const mockSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({
          data: mockRegistration,
          error: null
        }))
      }))
    }));

    const mockUpdate = vi.fn(() => ({
      eq: vi.fn(() => ({
        data: null,
        error: null
      }))
    }));

    mockSupabaseClient.from.mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
    });

    const req = createMockRequest({ registrationId: 'YEC-1234567890-abc123' });

    // Act - POST /api/admin/approve-registration with that id
    const { POST } = await import('../../app/api/admin/approve-registration/route');
    const response = await POST(req);

    // Assert
    expect(response.status).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.status).toBe('approved');
    expect(responseData.badgeUrl).toBe('https://storage.example/badges/123.png');

    // Verify badge was generated
    expect(generateBadge).toHaveBeenCalledWith({
      id: '123',
      firstName: 'Somchai',
      lastName: 'Jaidee'
    });

    // Verify sendApprovedEmail was called once with { to, firstName, lastName, badgeUrl }
    expect(sendApprovedEmail).toHaveBeenCalledWith({
      to: 'sharepoints911@gmail.com',
      firstName: 'Somchai',
      lastName: 'Jaidee',
      badgeUrl: 'https://storage.example/badges/123.png'
    });
  });

  it('should handle idempotency - approve twice returns same URL', async () => {
    // Arrange - mock already approved registration
    const mockApprovedRegistration = {
      id: 123,
      email: 'sharepoints911@gmail.com',
      first_name: 'Somchai',
      last_name: 'Jaidee',
      status: 'approved',
      badge_url: 'https://storage.example/badges/123.png'
    };

    const mockSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({
          data: mockApprovedRegistration,
          error: null
        }))
      }))
    }));

    mockSupabaseClient.from.mockReturnValue({
      select: mockSelect,
      update: vi.fn(),
    });

    const req = createMockRequest({ registrationId: 'YEC-1234567890-abc123' });

    // Act - POST /api/admin/approve-registration with already approved id
    const { POST } = await import('../../app/api/admin/approve-registration/route');
    const response = await POST(req);

    // Assert
    expect(response.status).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.status).toBe('approved');
    expect(responseData.badgeUrl).toBe('https://storage.example/badges/123.png');

    // Verify no badge generation or email sending for already approved
    expect(generateBadge).not.toHaveBeenCalled();
    expect(sendApprovedEmail).not.toHaveBeenCalled();
    expect(mockSupabaseClient.from().update).not.toHaveBeenCalled();
  });

  it('should return 404 when registration not found', async () => {
    // Arrange - mock registration not found
    const mockSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({
          data: null,
          error: { message: 'Not found' }
        }))
      }))
    }));

    mockSupabaseClient.from.mockReturnValue({
      select: mockSelect,
      update: vi.fn(),
    });

    const req = createMockRequest({ registrationId: 'NONEXISTENT-ID' });

    // Act
    const { POST } = await import('../../app/api/admin/approve-registration/route');
    const response = await POST(req);

    // Assert
    expect(response.status).toBe(404);
    const responseData = await response.json();
    expect(responseData.error).toBe('Registration not found');
  });

  it('should return 400 when registrationId is missing', async () => {
    // Arrange
    const req = createMockRequest({});

    // Act
    const { POST } = await import('../../app/api/admin/approve-registration/route');
    const response = await POST(req);

    // Assert
    expect(response.status).toBe(400);
    const responseData = await response.json();
    expect(responseData.error).toBe('Missing registrationId');
  });
});
