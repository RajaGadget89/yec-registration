import { describe, it, expect, beforeEach, vi } from 'vitest';

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

// Mock text normalization
vi.mock('../../app/lib/textNormalize', () => ({
  normalizeName: (name: string) => name.toLowerCase(),
}));

// Import the mocked functions
import { sendPendingReviewEmail } from '../../app/lib/emailService';
import { getSupabaseServiceClient } from '../../app/lib/supabase-server';

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
};

// Utility function to create a mock Supabase client
const createMockSupabaseClient = () => {
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn(() => ({
    eq: vi.fn(),
  }));
  const mockFrom = vi.fn(() => ({
    insert: mockInsert,
    update: mockUpdate,
    select: vi.fn(() => ({
      ilike: vi.fn(() => ({
        limit: vi.fn(),
      })),
    })),
  }));

  return {
    from: mockFrom,
    insert: mockInsert,
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

describe('Unique Constraint Violations', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    resetMocks();
    mockSupabaseClient = createMockSupabaseClient();
    vi.mocked(getSupabaseServiceClient).mockReturnValue(mockSupabaseClient);
  });

  describe('Email/Phone Unique Constraint Violations', () => {
    it('should return 200 with DUPLICATE_EMAIL_OR_PHONE code for email constraint violation', async () => {
      // Arrange
      const req = createMockRequest(validRegistrationPayload);

      // Mock duplicate name check to pass
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn(() => ({
          ilike: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
        insert: mockSupabaseClient.insert,
        update: mockSupabaseClient.update,
      });

      // Mock database to return a duplicate email error
      mockSupabaseClient.insert.mockResolvedValue({
        data: null,
        error: { 
          message: 'duplicate key value violates unique constraint "registrations_email_key"',
          code: '23505'
        },
      });

      // Act
      const { POST } = await import('../../app/api/register/route');
      const response = await POST(req);

      // Assert
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('DUPLICATE_EMAIL_OR_PHONE');
      expect(responseData.message).toBe('อีเมลหรือเบอร์โทรนี้ถูกใช้ไปแล้วสำหรับการสมัคร กรุณาใช้ข้อมูลอื่น หรือโทรหาเจ้าหน้าที่เพื่อยืนยันความถูกต้อง');
      expect(responseData.contact).toBe('080-224-0008');
    });

    it('should return 200 with DUPLICATE_EMAIL_OR_PHONE code for phone constraint violation', async () => {
      // Arrange
      const req = createMockRequest(validRegistrationPayload);

      // Mock duplicate name check to pass
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn(() => ({
          ilike: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
        insert: mockSupabaseClient.insert,
        update: mockSupabaseClient.update,
      });

      // Mock database to return a duplicate phone error
      mockSupabaseClient.insert.mockResolvedValue({
        data: null,
        error: { 
          message: 'duplicate key value violates unique constraint "registrations_phone_key"',
          code: '23505'
        },
      });

      // Act
      const { POST } = await import('../../app/api/register/route');
      const response = await POST(req);

      // Assert
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('DUPLICATE_EMAIL_OR_PHONE');
      expect(responseData.message).toBe('อีเมลหรือเบอร์โทรนี้ถูกใช้ไปแล้วสำหรับการสมัคร กรุณาใช้ข้อมูลอื่น หรือโทรหาเจ้าหน้าที่เพื่อยืนยันความถูกต้อง');
      expect(responseData.contact).toBe('080-224-0008');
    });

    it('should return 200 with DUPLICATE_EMAIL_OR_PHONE code for generic unique constraint violation', async () => {
      // Arrange
      const req = createMockRequest(validRegistrationPayload);

      // Mock duplicate name check to pass
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn(() => ({
          ilike: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
        insert: mockSupabaseClient.insert,
        update: mockSupabaseClient.update,
      });

      // Mock database to return a generic unique constraint error
      mockSupabaseClient.insert.mockResolvedValue({
        data: null,
        error: { 
          message: 'duplicate key value violates unique constraint',
          code: '23505'
        },
      });

      // Act
      const { POST } = await import('../../app/api/register/route');
      const response = await POST(req);

      // Assert
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('DUPLICATE_EMAIL_OR_PHONE');
      expect(responseData.message).toBe('อีเมลหรือเบอร์โทรนี้ถูกใช้ไปแล้วสำหรับการสมัคร กรุณาใช้ข้อมูลอื่น หรือโทรหาเจ้าหน้าที่เพื่อยืนยันความถูกต้อง');
      expect(responseData.contact).toBe('080-224-0008');
    });

    it('should return 200 with DUPLICATE_EMAIL_OR_PHONE code when error message contains "unique"', async () => {
      // Arrange
      const req = createMockRequest(validRegistrationPayload);

      // Mock duplicate name check to pass
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn(() => ({
          ilike: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
        insert: mockSupabaseClient.insert,
        update: mockSupabaseClient.update,
      });

      // Mock database to return an error with "unique" in the message
      mockSupabaseClient.insert.mockResolvedValue({
        data: null,
        error: { 
          message: 'some unique constraint violation occurred',
          code: '23505'
        },
      });

      // Act
      const { POST } = await import('../../app/api/register/route');
      const response = await POST(req);

      // Assert
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('DUPLICATE_EMAIL_OR_PHONE');
      expect(responseData.message).toBe('อีเมลหรือเบอร์โทรนี้ถูกใช้ไปแล้วสำหรับการสมัคร กรุณาใช้ข้อมูลอื่น หรือโทรหาเจ้าหน้าที่เพื่อยืนยันความถูกต้อง');
      expect(responseData.contact).toBe('080-224-0008');
    });

    it('should return 500 with DATABASE_ERROR code for non-unique constraint errors', async () => {
      // Arrange
      const req = createMockRequest(validRegistrationPayload);

      // Mock duplicate name check to pass
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn(() => ({
          ilike: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
        insert: mockSupabaseClient.insert,
        update: mockSupabaseClient.update,
      });

      // Mock database to return a non-unique constraint error
      mockSupabaseClient.insert.mockResolvedValue({
        data: null,
        error: { 
          message: 'some other database error',
          code: '23503' // Foreign key violation
        },
      });

      // Act
      const { POST } = await import('../../app/api/register/route');
      const response = await POST(req);

      // Assert
      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('DATABASE_ERROR');
      expect(responseData.message).toBe('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    });
  });
});
