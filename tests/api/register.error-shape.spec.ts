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

// Utility function to reset all mocks
const resetMocks = () => {
  vi.clearAllMocks();
  vi.resetAllMocks();
};

// Utility function to create a mock Supabase client
const createMockSupabaseClient = () => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockFrom = vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
  }));

  return {
    from: mockFrom,
    select: mockSelect,
    insert: mockInsert,
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

describe('POST /api/register - Error Response Shape', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    resetMocks();
    mockSupabaseClient = createMockSupabaseClient();
    (getSupabaseServiceClient as any).mockReturnValue(mockSupabaseClient);
  });

  afterEach(() => {
    resetMocks();
  });

  it('should return structured JSON error when database insertion fails', async () => {
    // Arrange - Mock database failure
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
      data: null,
      error: { message: 'Database connection failed' }
    }));

    mockSupabaseClient.from.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    });

    const req = createMockRequest({
      title: 'นาย',
      firstName: 'Test',
      lastName: 'User',
      nickname: 'Test',
      phone: '0812345678',
      lineId: 'testuser',
      email: 'test@example.com',
      companyName: 'Test Company',
      businessType: 'technology',
      yecProvince: 'bangkok',
      hotelChoice: 'in-quota',
      roomType: 'single',
      travelType: 'private-car'
    });

    // Act
    const { POST } = await import('../../app/api/register/route');
    const response = await POST(req);

    // Assert
    expect(response.status).toBe(500);
    const responseData = await response.json();
    expect(responseData).toEqual({
      success: false,
      code: 'DATABASE_ERROR',
      message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง'
    });
  });

  it('should return structured JSON error for validation failures', async () => {
    // Arrange - Missing required fields
    const req = createMockRequest({
      // Missing required fields
      title: 'นาย',
      firstName: 'Test',
      // Missing lastName, nickname, phone, etc.
    });

    // Act
    const { POST } = await import('../../app/api/register/route');
    const response = await POST(req);

    // Assert
    expect(response.status).toBe(400);
    const responseData = await response.json();
    expect(responseData).toEqual({
      success: false,
      code: 'VALIDATION_ERROR',
      message: expect.stringContaining('Missing required field')
    });
  });

  it('should return structured JSON error for internal server errors', async () => {
    // Arrange - Mock Supabase client to throw
    (getSupabaseServiceClient as any).mockImplementation(() => {
      throw new Error('Supabase connection failed');
    });

    const req = createMockRequest({
      title: 'นาย',
      firstName: 'Test',
      lastName: 'User',
      nickname: 'Test',
      phone: '0812345678',
      lineId: 'testuser',
      email: 'test@example.com',
      companyName: 'Test Company',
      businessType: 'technology',
      yecProvince: 'bangkok',
      hotelChoice: 'in-quota',
      roomType: 'single',
      travelType: 'private-car'
    });

    // Act
    const { POST } = await import('../../app/api/register/route');
    const response = await POST(req);

    // Assert
    expect(response.status).toBe(500);
    const responseData = await response.json();
    expect(responseData).toEqual({
      success: false,
      code: 'INTERNAL_ERROR',
      message: 'Server error. Please try again.'
    });
  });
});
