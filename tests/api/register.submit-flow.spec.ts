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
  firstName: 'ทดสอบ',
  lastName: 'ระบบ',
  nickname: 'ทดสอบ',
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
  // Ensure the timezone mock is properly reset
  vi.mocked(getThailandTimeISOString).mockReturnValue('2025-01-27T12:30:00.000Z');
};

// Utility function to create a mock Supabase client
const createMockSupabaseClient = () => {
  const mockInsert = vi.fn(() => ({
    data: [{ registration_id: 'YEC-1234567890-abc123' }],
    error: null
  }));
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
  const mockUpdate = vi.fn(() => ({
    eq: vi.fn(() => ({
      data: null,
      error: null
    }))
  }));
  const mockFrom = vi.fn(() => ({
    insert: mockInsert,
    select: mockSelect,
    update: mockUpdate,
  }));

  return {
    from: mockFrom,
    insert: mockInsert,
    select: mockSelect,
    update: mockUpdate,
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

describe('POST /api/register - Submit Flow', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    resetMocks();
    mockSupabaseClient = createMockSupabaseClient();
    (getSupabaseServiceClient as any).mockReturnValue(mockSupabaseClient);
    (sendPendingReviewEmail as any).mockResolvedValue(true);
  });

  afterEach(() => {
    resetMocks();
  });

  it('should insert new registration with status "waiting_for_review"', async () => {
    // Arrange
    const req = createMockRequest(validRegistrationPayload);

    // Act
    const { POST } = await import('../../app/api/register/route');
    const response = await POST(req);

    // Assert
    expect(response.status).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.status).toBe('waiting_for_review');
    expect(responseData.badgeUrl).toBe(null);
    expect(responseData.emailSent).toBe(true);

    // Verify insert was called with correct data
    expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          status: 'waiting_for_review',
          badge_url: null,
          email_sent: false,
          first_name: 'ทดสอบ',
          last_name: 'ระบบ',
          email: 'sharepoints911@gmail.com'
        })
      ])
    );
  });

  it('should call sendPendingReviewEmail once with correct parameters', async () => {
    // Arrange
    const req = createMockRequest(validRegistrationPayload);

    // Ensure the mock is properly set up
    vi.mocked(sendPendingReviewEmail).mockResolvedValue(true);
    vi.mocked(getThailandTimeISOString).mockReturnValue('2025-01-27T12:30:00.000Z');

    // Act
    const { POST } = await import('../../app/api/register/route');
    const response = await POST(req);

    // Assert
    expect(response.status).toBe(200);
    expect(sendPendingReviewEmail).toHaveBeenCalledTimes(1);
    expect(sendPendingReviewEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'sharepoints911@gmail.com',
        firstName: 'ทดสอบ',
        lastName: 'ระบบ',
        submittedAt: '2025-01-27T12:30:00.000Z'
      })
    );
  });

  it('should not generate badge on submit', async () => {
    // Arrange
    const req = createMockRequest(validRegistrationPayload);

    // Act
    const { POST } = await import('../../app/api/register/route');
    const response = await POST(req);

    // Assert
    expect(response.status).toBe(200);
    const responseData = await response.json();
    expect(responseData.badgeUrl).toBe(null);

    // Verify no badge generation was attempted
    expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          badge_url: null
        })
      ])
    );
  });

  it('should handle email service failure gracefully', async () => {
    // Arrange
    const req = createMockRequest(validRegistrationPayload);
    (sendPendingReviewEmail as any).mockResolvedValue(false);

    // Act
    const { POST } = await import('../../app/api/register/route');
    const response = await POST(req);

    // Assert
    expect(response.status).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.emailSent).toBe(false);
  });

  it('should capture IP address and user agent', async () => {
    // Arrange
    const req = createMockRequest(validRegistrationPayload, {
      'x-forwarded-for': '192.168.1.1',
      'user-agent': 'Test User Agent'
    });

    // Act
    const { POST } = await import('../../app/api/register/route');
    const response = await POST(req);

    // Assert
    expect(response.status).toBe(200);
    expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          ip_address: '192.168.1.1',
          user_agent: 'Test User Agent'
        })
      ])
    );
  });

  it('should handle different hotel choices correctly', async () => {
    // Test in-quota registration
    const inQuotaPayload = {
      ...validRegistrationPayload,
      hotelChoice: 'in-quota',
      roomType: 'single'
    };

    const req1 = createMockRequest(inQuotaPayload);
    const { POST } = await import('../../app/api/register/route');
    const response1 = await POST(req1);

    expect(response1.status).toBe(200);
    const responseData1 = await response1.json();
    expect(responseData1.success).toBe(true);

    // Test out-of-quota registration
    const outOfQuotaPayload = {
      ...validRegistrationPayload,
      hotelChoice: 'out-of-quota',
      external_hotel_name: 'Test Hotel'
    };

    const req2 = createMockRequest(outOfQuotaPayload);
    const response2 = await POST(req2);

    expect(response2.status).toBe(200);
    const responseData2 = await response2.json();
    expect(responseData2.success).toBe(true);
  });
});
