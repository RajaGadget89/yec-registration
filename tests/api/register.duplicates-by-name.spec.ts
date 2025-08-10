/// <reference types="vitest" />
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock the email service
vi.mock('../../app/lib/emailService', () => ({
  sendPendingReviewEmail: vi.fn(),
}));

// Mock the Supabase service
vi.mock('../../app/lib/supabase-server', () => ({
  getSupabaseServiceClient: vi.fn(),
}));

// Mock the timezone utils
vi.mock('../../app/lib/timezoneUtils', () => ({
  getThailandTimeISOString: vi.fn(() => '2025-01-27T12:30:00.000Z'),
}));

// Import the mocked functions
import { sendPendingReviewEmail } from '../../app/lib/emailService';
import { getSupabaseServiceClient } from '../../app/lib/supabase-server';
import { getThailandTimeISOString } from '../../app/lib/timezoneUtils';

// Test fixture for valid registration payload
const validRegistrationPayload = {
  title: 'นาย',
  firstName: 'Somchai',
  lastName: 'Jaidee',
  nickname: 'Somchai',
  phone: '0812345678',
  lineId: 'testuser123',
  email: 'sharepoints911@gmail.com',
  companyName: 'Test Company',
  businessType: 'เทคโนโลยี',
  businessTypeOther: null,
  yecProvince: 'bangkok',
  hotelChoice: 'in-quota',
  roomType: 'single',
  roommateInfo: null,
  roommatePhone: null,
  external_hotel_name: null,
  travelType: 'private-car',
  profileImage: null,
  chamberCard: null,
  paymentSlip: null,
};

// Utility function to reset all mocks
const resetMocks = () => {
  vi.clearAllMocks();
  vi.resetAllMocks();
};

// Utility function to create a mock Supabase client
const createMockSupabaseClient = () => {
  const mockInsert = vi.fn();
  const mockSelect = vi.fn(() => ({
    ilike: vi.fn(() => ({
      ilike: vi.fn(() => ({
        limit: vi.fn(() => ({
          data: null,
          error: null
        }))
      }))
    }))
  }));
  const mockFrom = vi.fn(() => ({
    insert: mockInsert,
    select: mockSelect,
  }));

  return {
    from: mockFrom,
    insert: mockInsert,
    select: mockSelect,
  };
};

// Utility function to create a mock Request
const createMockRequest = (body: any, headers: Record<string, string> = {}) => {
  return new Request('http://localhost:3000/api/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
};

describe('POST /api/register - Duplicate Name Detection', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    resetMocks();
    mockSupabaseClient = createMockSupabaseClient();
    (getSupabaseServiceClient as any).mockReturnValue(mockSupabaseClient);
    (getThailandTimeISOString as any).mockReturnValue('2025-01-27T12:30:00.000Z');
  });

  afterEach(() => {
    resetMocks();
  });

  it('should return DUPLICATE_NAME_MATCH when submitting with duplicate first+last name', async () => {
    // Arrange
    const req = createMockRequest({
      ...validRegistrationPayload,
      firstName: 'Somchai',
      lastName: '   JAIDEE  ' // Test normalization
    });

    // Mock existing registration found
    const mockSelect = vi.fn(() => ({
      ilike: vi.fn(() => ({
        ilike: vi.fn(() => ({
          limit: vi.fn(() => ({
            data: [{ id: 123 }],
            error: null
          }))
        }))
      }))
    }));

    mockSupabaseClient.from.mockReturnValue({
      select: mockSelect,
      insert: vi.fn(),
    });

    // Act
    const { POST } = await import('../../app/api/register/route');
    const response = await POST(req);

    // Assert
    expect(response.status).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData.code).toBe('DUPLICATE_NAME_MATCH');
    expect(responseData.message).toContain('มีข้อมูลอยู่ในระบบแล้ว');
    expect(responseData.contact).toBe('080-224-0008');

    // Verify no insert was called
    expect(mockSupabaseClient.from().insert).not.toHaveBeenCalled();

    // Verify no email was sent
    expect(sendPendingReviewEmail).not.toHaveBeenCalled();
  });

  it('should allow registration when names are different', async () => {
    // Arrange
    const req = createMockRequest({
      ...validRegistrationPayload,
      firstName: 'Somchai',
      lastName: 'Different'
    });

    // Mock no existing registration found
    const mockSelect = vi.fn(() => ({
      ilike: vi.fn(() => ({
        ilike: vi.fn(() => ({
          limit: vi.fn(() => ({
            data: [],
            error: null
          }))
        }))
      }))
    }));

    const mockInsert = vi.fn(() => ({
      data: [{ registration_id: 'YEC-1234567890-abc123' }],
      error: null
    }));

    mockSupabaseClient.from.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null
        }))
      }))
    });

    // Mock email service
    vi.mocked(sendPendingReviewEmail).mockResolvedValue(true);

    // Act
    const { POST } = await import('../../app/api/register/route');
    const response = await POST(req);

    // Assert
    expect(response.status).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.status).toBe('waiting_for_review');
    expect(responseData.badgeUrl).toBe(null);

    // Verify insert was called
    expect(mockSupabaseClient.from().insert).toHaveBeenCalled();

    // Verify email was sent
    expect(sendPendingReviewEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'sharepoints911@gmail.com',
        firstName: 'Somchai',
        lastName: 'Different',
        submittedAt: expect.any(String)
      })
    );
  });

  it('should handle name normalization correctly', async () => {
    // Arrange - Test with various name formats
    const testCases = [
      { firstName: '  Somchai  ', lastName: 'JAIDEE' },
      { firstName: 'นาย Somchai', lastName: 'Jaidee' },
      { firstName: 'ดร. Somchai', lastName: 'JAIDEE' },
      { firstName: 'นางสาว Somchai', lastName: 'Jaidee' }
    ];

    for (const testCase of testCases) {
      const req = createMockRequest({
        ...validRegistrationPayload,
        firstName: testCase.firstName,
        lastName: testCase.lastName
      });

      // Mock existing registration found
      const mockSelect = vi.fn(() => ({
        ilike: vi.fn(() => ({
          ilike: vi.fn(() => ({
            limit: vi.fn(() => ({
              data: [{ id: 123 }],
              error: null
            }))
          }))
        }))
      }));

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
        insert: vi.fn(),
      });

      // Act
      const { POST } = await import('../../app/api/register/route');
      const response = await POST(req);

      // Assert
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('DUPLICATE_NAME_MATCH');
    }
  });
});
