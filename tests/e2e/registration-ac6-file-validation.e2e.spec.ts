import { test, expect } from '@playwright/test';

test.describe('AC6 — File Validation (TH/EN)', () => {
  test('invalid type — TH', async ({ request }) => {
    const cronSecret = '9318b95a82c5f8fcd236d8abe79f4ce8';
    
    const response = await request.post('/api/test/validate-file', {
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Accept-Language': 'th',
        'Content-Type': 'application/json'
      },
      data: {
        dimension: 'profile',
        mime: 'application/pdf',
        sizeBytes: 1024
      }
    });

    expect(response.status()).toBe(422);
    
    const data = await response.json();
    expect(data.code).toBe('FILE_VALIDATION_FAILED');
    expect(data.errors).toHaveLength(1);
    expect(data.errors[0].dimension).toBe('profile');
    expect(data.errors[0].code).toBe('INVALID_TYPE');
    expect(data.errors[0].message).toContain('ชนิดไฟล์ไม่ถูกต้อง');
  });

  test('oversize — EN', async ({ request }) => {
    const cronSecret = '9318b95a82c5f8fcd236d8abe79f4ce8';
    
    const response = await request.post('/api/test/validate-file', {
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Accept-Language': 'en',
        'Content-Type': 'application/json'
      },
      data: {
        dimension: 'payment',
        mime: 'application/pdf',
        sizeBytes: 10 * 1024 * 1024 + 1 // Just above 10MB limit
      }
    });

    expect(response.status()).toBe(422);
    
    const data = await response.json();
    expect(data.code).toBe('FILE_VALIDATION_FAILED');
    expect(data.errors).toHaveLength(1);
    expect(data.errors[0].dimension).toBe('payment');
    expect(data.errors[0].code).toBe('FILE_TOO_LARGE');
    expect(data.errors[0].message).toContain('Max 10 MB');
  });

  test('valid file — EN', async ({ request }) => {
    const cronSecret = '9318b95a82c5f8fcd236d8abe79f4ce8';
    
    const response = await request.post('/api/test/validate-file', {
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Accept-Language': 'en',
        'Content-Type': 'application/json'
      },
      data: {
        dimension: 'tcc',
        mime: 'image/png',
        sizeBytes: 1024
      }
    });

    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.ok).toBe(true);
  });

  test('missing fields — validation error', async ({ request }) => {
    const cronSecret = '9318b95a82c5f8fcd236d8abe79f4ce8';
    
    const response = await request.post('/api/test/validate-file', {
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json'
      },
      data: {
        dimension: 'payment'
        // Missing mime and sizeBytes
      }
    });

    expect(response.status()).toBe(400);
    
    const data = await response.json();
    expect(data.code).toBe('MISSING_FIELDS');
  });

  test('invalid dimension — validation error', async ({ request }) => {
    const cronSecret = '9318b95a82c5f8fcd236d8abe79f4ce8';
    
    const response = await request.post('/api/test/validate-file', {
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json'
      },
      data: {
        dimension: 'invalid',
        mime: 'image/png',
        sizeBytes: 1024
      }
    });

    expect(response.status()).toBe(400);
    
    const data = await response.json();
    expect(data.code).toBe('INVALID_DIMENSION');
  });

  test('authentication required for test helper', async ({ request }) => {
    // Test without authentication
    const response = await request.post('/api/test/validate-file', {
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        dimension: 'profile',
        mime: 'image/png',
        sizeBytes: 1024
      }
    });

    expect(response.status()).toBe(401);
  });

  test('upload endpoint validation — invalid type', async ({ request }) => {
    // Test the validation logic directly using the test helper
    const cronSecret = '9318b95a82c5f8fcd236d8abe79f4ce8';
    
    const response = await request.post('/api/test/validate-file', {
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Accept-Language': 'th',
        'Content-Type': 'application/json'
      },
      data: {
        dimension: 'profile',
        mime: 'application/pdf',
        sizeBytes: 1024
      }
    });

    expect(response.status()).toBe(422);
    
    const data = await response.json();
    expect(data.code).toBe('FILE_VALIDATION_FAILED');
    expect(data.errors).toHaveLength(1);
    expect(data.errors[0].dimension).toBe('profile');
    expect(data.errors[0].code).toBe('INVALID_TYPE');
    expect(data.errors[0].message).toContain('ชนิดไฟล์ไม่ถูกต้อง');
  });

  test('upload endpoint validation — valid file', async ({ request }) => {
    // Test the validation logic directly using the test helper
    const cronSecret = '9318b95a82c5f8fcd236d8abe79f4ce8';
    
    const response = await request.post('/api/test/validate-file', {
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Accept-Language': 'en',
        'Content-Type': 'application/json'
      },
      data: {
        dimension: 'profile',
        mime: 'image/png',
        sizeBytes: 1024
      }
    });

    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.ok).toBe(true);
  });
});


