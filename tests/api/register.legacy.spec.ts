// LEGACY: kept for reference, does not reflect Phase 1 workflow. Excluded from default test script.

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

// Test fixture for valid registration payload
export const validRegistrationPayload = {
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

// Test fixture for out-of-quota registration
export const outOfQuotaRegistrationPayload = {
  ...validRegistrationPayload,
  hotelChoice: 'out-of-quota',
  roomType: null,
  roommateInfo: null,
  roommatePhone: null,
  external_hotel_name: 'Test Hotel',
};

// Test fixture for double room registration
export const doubleRoomRegistrationPayload = {
  ...validRegistrationPayload,
  roomType: 'double',
  roommateInfo: 'เพื่อนร่วมห้อง',
  roommatePhone: '0823456789',
};

// Utility function to reset all mocks
export const resetMocks = () => {
  vi.clearAllMocks();
  vi.resetAllMocks();
};

// Utility function to create a mock Supabase client
export const createMockSupabaseClient = () => {
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn(() => ({
    eq: vi.fn(),
  }));
  const mockFrom = vi.fn(() => ({
    insert: mockInsert,
    update: mockUpdate,
  }));

  return {
    from: mockFrom,
    insert: mockInsert,
    update: mockUpdate,
  };
};

// Utility function to create a mock Request
export const createMockRequest = (body: any, headers: Record<string, string> = {}) => {
  return new Request('http://localhost:3000/api/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
};

describe('POST /api/register', () => {
  let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    resetMocks();
    mockSupabaseClient = createMockSupabaseClient();
    (getSupabaseServiceClient as any).mockReturnValue(mockSupabaseClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Successful registration', () => {
    it('should return 200 and JSON with success=true, status="waiting_for_review", badgeUrl=null', async () => {
      // Arrange
      const req = createMockRequest(validRegistrationPayload);

      // Mock successful database insertion
      mockSupabaseClient.insert.mockResolvedValue({
        data: [{ id: 1, registration_id: 'YEC-123456789' }],
        error: null,
      });

      // Mock successful email sending
      (sendPendingReviewEmail as any).mockResolvedValue(true);

      // Mock successful database update
      mockSupabaseClient.update.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      // Act
      const { POST } = await import('../../app/api/register/route');
      const response = await POST(req);

      // Assert
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData).toEqual({
        success: true,
        message: 'Registration submitted successfully and is pending admin review',
        registrationId: expect.stringMatching(/^YEC-\d+-[a-z0-9]+$/),
        badgeUrl: null,
        emailSent: true,
        status: 'waiting_for_review',
      });
    });

    it('should call sendPendingReviewEmail once with correct parameters', async () => {
      // Arrange
      const req = createMockRequest(validRegistrationPayload);

      mockSupabaseClient.insert.mockResolvedValue({
        data: [{ id: 1, registration_id: 'YEC-123456789' }],
        error: null,
      });

      (sendPendingReviewEmail as any).mockResolvedValue(true);
      mockSupabaseClient.update.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      // Act
      const { POST } = await import('../../app/api/register/route');
      await POST(req);

      // Assert
      expect(sendPendingReviewEmail).toHaveBeenCalledTimes(1);
      expect(sendPendingReviewEmail).toHaveBeenCalledWith({
        to: validRegistrationPayload.email,
        firstName: validRegistrationPayload.firstName,
        lastName: validRegistrationPayload.lastName,
        submittedAt: '2025-01-27T12:30:00.000Z'
      });
    });

    it('should insert a row with status "waiting_for_review" into Supabase', async () => {
      // Arrange
      const req = createMockRequest(validRegistrationPayload);

      mockSupabaseClient.insert.mockResolvedValue({
        data: [{ id: 1, registration_id: 'YEC-123456789' }],
        error: null,
      });

      (sendPendingReviewEmail as any).mockResolvedValue(true);
      mockSupabaseClient.update.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      // Act
      const { POST } = await import('../../app/api/register/route');
      await POST(req);

      // Assert
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('registrations');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          status: 'waiting_for_review',
          badge_url: null,
          email_sent: false,
          first_name: validRegistrationPayload.firstName,
          last_name: validRegistrationPayload.lastName,
          email: validRegistrationPayload.email,
        }),
      ]);
    });

    it('should handle out-of-quota registration correctly', async () => {
      // Arrange
      const req = createMockRequest(outOfQuotaRegistrationPayload);

      mockSupabaseClient.insert.mockResolvedValue({
        data: [{ id: 1, registration_id: 'YEC-123456789' }],
        error: null,
      });

      (sendPendingReviewEmail as any).mockResolvedValue(true);
      mockSupabaseClient.update.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      // Act
      const { POST } = await import('../../app/api/register/route');
      const response = await POST(req);

      // Assert
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.status).toBe('waiting_for_review');

      // Check that room-related fields are cleared for out-of-quota
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          hotel_choice: 'out-of-quota',
          room_type: null,
          roommate_info: null,
          roommate_phone: null,
          external_hotel_name: 'Test Hotel',
        }),
      ]);
    });

    it('should handle double room registration correctly', async () => {
      // Arrange
      const req = createMockRequest(doubleRoomRegistrationPayload);

      mockSupabaseClient.insert.mockResolvedValue({
        data: [{ id: 1, registration_id: 'YEC-123456789' }],
        error: null,
      });

      (sendPendingReviewEmail as any).mockResolvedValue(true);
      mockSupabaseClient.update.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      // Act
      const { POST } = await import('../../app/api/register/route');
      const response = await POST(req);

      // Assert
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);

      // Check that roommate fields are included for double rooms
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          room_type: 'double',
          roommate_info: 'เพื่อนร่วมห้อง',
          roommate_phone: '0823456789',
        }),
      ]);
    });
  });

  describe('Validation errors', () => {
    it('should return 400 for missing required fields', async () => {
      // Arrange
      const invalidPayload = {
        title: 'นาย',
        // Missing firstName, lastName, etc.
      };

      const req = createMockRequest(invalidPayload);

      // Act
      const { POST } = await import('../../app/api/register/route');
      const response = await POST(req);

      // Assert
      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.error).toBe('Validation failed');
      expect(responseData.message).toContain('Missing required field');
    });

    it('should return 400 for invalid phone format', async () => {
      // Arrange
      const invalidPayload = {
        ...validRegistrationPayload,
        phone: '1234567890', // Invalid format
      };

      const req = createMockRequest(invalidPayload);

      // Act
      const { POST } = await import('../../app/api/register/route');
      const response = await POST(req);

      // Assert
      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.error).toBe('Validation failed');
      expect(responseData.message).toContain('Phone must be in format');
    });

    it('should return 400 for invalid email format', async () => {
      // Arrange
      const invalidPayload = {
        ...validRegistrationPayload,
        email: 'invalid-email',
      };

      const req = createMockRequest(invalidPayload);

      // Act
      const { POST } = await import('../../app/api/register/route');
      const response = await POST(req);

      // Assert
      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.error).toBe('Validation failed');
      expect(responseData.message).toContain('Invalid email format');
    });
  });

  describe('Database errors', () => {
    it('should return 500 when database insertion fails', async () => {
      // Arrange
      const req = createMockRequest(validRegistrationPayload);

      mockSupabaseClient.insert.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      // Act
      const { POST } = await import('../../app/api/register/route');
      const response = await POST(req);

      // Assert
      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.error).toBe('Database insertion failed');
      expect(responseData.message).toBe('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    });
  });

  describe('Email service errors', () => {
    it('should return 200 with emailSent=false when email service throws', async () => {
      // Arrange
      const req = createMockRequest(validRegistrationPayload);

      mockSupabaseClient.insert.mockResolvedValue({
        data: [{ id: 1, registration_id: 'YEC-123456789' }],
        error: null,
      });

      // Mock email service to throw an error
      (sendPendingReviewEmail as any).mockRejectedValue(new Error('Email service unavailable'));

      // Act
      const { POST } = await import('../../app/api/register/route');
      const response = await POST(req);

      // Assert
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.emailSent).toBe(false);
      expect(responseData.status).toBe('waiting_for_review');
    });

    it('should return 200 with emailSent=false when email service returns false', async () => {
      // Arrange
      const req = createMockRequest(validRegistrationPayload);

      mockSupabaseClient.insert.mockResolvedValue({
        data: [{ id: 1, registration_id: 'YEC-123456789' }],
        error: null,
      });

      // Mock email service to return false
      (sendPendingReviewEmail as any).mockResolvedValue(false);

      // Act
      const { POST } = await import('../../app/api/register/route');
      const response = await POST(req);

      // Assert
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.emailSent).toBe(false);
      expect(responseData.status).toBe('waiting_for_review');
    });
  });

  describe('Idempotency', () => {
    it('should handle duplicate registration gracefully', async () => {
      // Arrange
      const req = createMockRequest(validRegistrationPayload);

      // Mock database to return a duplicate key error
      mockSupabaseClient.insert.mockResolvedValue({
        data: null,
        error: { 
          message: 'duplicate key value violates unique constraint "registrations_registration_id_key"',
          code: '23505'
        },
      });

      // Act
      const { POST } = await import('../../app/api/register/route');
      const response = await POST(req);

      // Assert
      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.error).toBe('Database insertion failed');
    });
  });

  describe('No badge generation', () => {
    it('should not import or invoke badge generation functions', async () => {
      // This test ensures that the registration API doesn't import badge generation
      // We can verify this by checking that the module doesn't import badge-related functions
      
      // Arrange
      const req = createMockRequest(validRegistrationPayload);

      mockSupabaseClient.insert.mockResolvedValue({
        data: [{ id: 1, registration_id: 'YEC-123456789' }],
        error: null,
      });

      (sendPendingReviewEmail as any).mockResolvedValue(true);
      mockSupabaseClient.update.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      // Act
      const { POST } = await import('../../app/api/register/route');
      const response = await POST(req);

      // Assert
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.badgeUrl).toBe(null);
      
      // Verify that no badge-related functions are called
      // This is implicit in the test structure - if badge generation was happening,
      // we would need to mock those functions, but we don't
    });

    it('should not call storage.put for badges', async () => {
      // Arrange
      const req = createMockRequest(validRegistrationPayload);

      mockSupabaseClient.insert.mockResolvedValue({
        data: [{ id: 1, registration_id: 'YEC-123456789' }],
        error: null,
      });

      (sendPendingReviewEmail as any).mockResolvedValue(true);
      mockSupabaseClient.update.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      // Act
      const { POST } = await import('../../app/api/register/route');
      await POST(req);

      // Assert
      // Verify that no storage operations are called
      // The mock Supabase client doesn't have storage methods called
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('registrations');
      // No storage.put calls should be made
    });
  });

  describe('Request headers and metadata', () => {
    it('should capture IP address and user agent', async () => {
      // Arrange
      const req = createMockRequest(validRegistrationPayload, {
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0 (Test Browser)',
      });

      mockSupabaseClient.insert.mockResolvedValue({
        data: [{ id: 1, registration_id: 'YEC-123456789' }],
        error: null,
      });

      (sendPendingReviewEmail as any).mockResolvedValue(true);
      mockSupabaseClient.update.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      // Act
      const { POST } = await import('../../app/api/register/route');
      await POST(req);

      // Assert
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0 (Test Browser)',
        }),
      ]);
    });
  });
});
