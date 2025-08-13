/**
 * Test data utilities for audit E2E tests
 * Generates unique test data with proper PII masking
 */

/**
 * Generate a unique test identifier
 */
export function generateTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Mask email address for testing (avoids storing raw PII)
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  const maskedLocal = localPart.length > 2 
    ? localPart.substring(0, 2) + '*'.repeat(localPart.length - 2)
    : localPart;
  return `${maskedLocal}@${domain}`;
}

/**
 * Mask phone number for testing
 */
export function maskPhone(phone: string): string {
  if (phone.startsWith('+66')) {
    return '+66' + '*'.repeat(phone.length - 3);
  }
  if (phone.startsWith('0')) {
    return '0' + '*'.repeat(phone.length - 1);
  }
  return '*'.repeat(phone.length);
}

/**
 * Generate test registration data with masked PII
 */
export function generateTestRegistrationData(testId: string) {
  const maskedEmail = `test-${testId}@example.com`;
  const maskedPhone = '0812345678'; // Will be masked in actual usage
  
  // Use shorter testId for fields with length constraints
  const shortId = testId.substring(0, 8);
  
  return {
    title: 'Mr.',
    firstName: 'Test',
    lastName: 'User',
    nickname: `Test${shortId}`, // Keep under 30 chars
    phone: maskedPhone,
    lineId: `test${shortId}`, // Keep under 30 chars
    email: maskedEmail,
    companyName: 'Test Company',
    businessType: 'Technology',
    businessTypeOther: null,
    yecProvince: 'Bangkok',
    hotelChoice: 'in-quota',
    roomType: 'single',
    roommateInfo: null,
    roommatePhone: null,
    externalHotelName: null,
    travelType: 'private-car',
    profileImage: null,
    chamberCard: null,
    paymentSlip: null
  };
}

/**
 * Generate test admin data
 */
export function generateTestAdminData(testId: string) {
  return {
    email: `admin-${testId}@example.com`,
    password: 'test-password-123'
  };
}

/**
 * Sample registration data for different scenarios
 */
export const SAMPLE_REGISTRATION_DATA = {
  // Basic registration
  basic: {
    title: 'Mr.',
    firstName: 'John',
    lastName: 'Doe',
    nickname: 'JohnD',
    phone: '0812345678',
    lineId: 'johndoe',
    email: 'john.doe@example.com',
    companyName: 'Tech Corp',
    businessType: 'Technology',
    businessTypeOther: null,
    yecProvince: 'Bangkok',
    hotelChoice: 'in-quota',
    roomType: 'single',
    roommateInfo: null,
    roommatePhone: null,
    externalHotelName: null,
    travelType: 'private-car',
    profileImage: null,
    chamberCard: null,
    paymentSlip: null
  },

  // Registration with roommate
  withRoommate: {
    title: 'Ms.',
    firstName: 'Jane',
    lastName: 'Smith',
    nickname: 'JaneS',
    phone: '0898765432',
    lineId: 'janesmith',
    email: 'jane.smith@example.com',
    companyName: 'Design Studio',
    businessType: 'Creative',
    businessTypeOther: null,
    yecProvince: 'Chiang Mai',
    hotelChoice: 'in-quota',
    roomType: 'double',
    roommateInfo: 'Roommate Name',
    roommatePhone: '0876543210',
    externalHotelName: null,
    travelType: 'van',
    profileImage: null,
    chamberCard: null,
    paymentSlip: null
  },

  // External hotel registration
  externalHotel: {
    title: 'Dr.',
    firstName: 'Robert',
    lastName: 'Johnson',
    nickname: 'RobJ',
    phone: '0865432109',
    lineId: 'robjohnson',
    email: 'robert.johnson@example.com',
    companyName: 'Consulting Inc',
    businessType: 'Consulting',
    businessTypeOther: null,
    yecProvince: 'Phuket',
    hotelChoice: 'out-of-quota',
    roomType: null,
    roommateInfo: null,
    roommatePhone: null,
    externalHotelName: 'Grand Hotel Phuket',
    travelType: 'private-car',
    profileImage: null,
    chamberCard: null,
    paymentSlip: null
  }
};

/**
 * Expected audit events for different scenarios
 */
export const EXPECTED_AUDIT_EVENTS = {
  // Registration submission
  registration: ['RegisterSubmitted', 'RegistrationCreated'],
  
  // Admin review
  adminReview: ['StatusChanged'],
  
  // Admin approval
  adminApproval: ['AdminReviewed'],
  
  // Send back flow
  sendBack: ['StatusChanged'],
  
  // Document re-upload
  documentReupload: ['DocumentReuploaded'],
  
  // Final approval
  finalApproval: ['AdminReviewed', 'BadgeIssued']
};

/**
 * Generate test headers with request ID
 */
export function generateTestHeaders(requestId?: string) {
  return {
    'Content-Type': 'application/json',
    'User-Agent': 'Playwright-Test/1.0',
    'X-Request-ID': requestId || generateTestId(),
    'X-Forwarded-For': '127.0.0.1'
  };
}

/**
 * Create a test context with unique identifiers
 */
export function createTestContext(testName: string) {
  const testId = generateTestId();
  const runId = Date.now();
  
  return {
    testId,
    runId,
    testName,
    tag: `${testName}-${runId}`,
    headers: generateTestHeaders(testId),
    registrationData: generateTestRegistrationData(testId),
    adminData: generateTestAdminData(testId)
  };
}
