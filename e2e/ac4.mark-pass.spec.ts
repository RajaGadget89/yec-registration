import { test, expect } from './fixtures/auth';

test.describe('AC4: Mark Pass Flow', () => {
  test('super admin can mark dimensions as passed via API', async ({ page, programmaticLogin }) => {
    // Login as super admin
    await programmaticLogin('raja.gadgets89@gmail.com');
    
    const base = process.env.E2E_BASE_URL || 'http://localhost:8080';
    
    // Get cookies for API calls
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    // Get target registration via API
    const response = await page.request.get(`${base}/api/test/registrations/one`, {
      headers: { 
        'X-E2E-RLS-BYPASS': '1',
        'Cookie': cookieHeader
      }
    });
    expect(response.status()).toBe(200);
    const registration = await response.json();
    
    // Capture pricing snapshot before mark-pass operations
    const beforeRes = await page.request.get(`${base}/api/admin/registrations/${registration.id}`, {
      headers: {
        'X-E2E-RLS-BYPASS': '1',
        'Cookie': cookieHeader
      }
    });
    expect(beforeRes.status()).toBe(200);
    const before = await beforeRes.json();
    const beforePricing = {
      price_applied: before?.price_applied,
      currency: before?.currency,
      is_early_bird: before?.is_early_bird,
      selected_package_code: before?.selected_package_code,
    };

    // Mark payment as passed via API
    const paymentResponse = await page.request.post(`${base}/api/admin/registrations/${registration.id}/mark-pass`, {
      headers: { 
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'Cookie': cookieHeader
      },
      data: { dimension: 'payment' }
    });
    expect([200, 201]).toContain(paymentResponse.status());
    
    const paymentResult = await paymentResponse.json();
    expect(paymentResult.ok).toBe(true);
    expect(paymentResult.dimension).toBe('payment');
    
    // Mark profile as passed via API
    const profileResponse = await page.request.post(`${base}/api/admin/registrations/${registration.id}/mark-pass`, {
      headers: { 
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'Cookie': cookieHeader
      },
      data: { dimension: 'profile' }
    });
    expect([200, 201]).toContain(profileResponse.status());
    
    const profileResult = await profileResponse.json();
    expect(profileResult.ok).toBe(true);
    expect(profileResult.dimension).toBe('profile');
    
    // Mark TCC as passed via API
    const tccResponse = await page.request.post(`${base}/api/admin/registrations/${registration.id}/mark-pass`, {
      headers: { 
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'Cookie': cookieHeader
      },
      data: { dimension: 'tcc' }
    });
    expect([200, 201]).toContain(tccResponse.status());
    
    const tccResult = await tccResponse.json();
    expect(tccResult.ok).toBe(true);
    expect(tccResult.dimension).toBe('tcc');
    
    // Verify that at least one of the mark-pass operations resulted in auto-approval
    const results = [paymentResult, profileResult, tccResult];
    const hasAutoApproval = results.some(result => result.all_passed === true);
    expect(hasAutoApproval).toBe(true);

    // Verify pricing remained unchanged after mark-pass transitions
    const afterRes = await page.request.get(`${base}/api/admin/registrations/${registration.id}`, {
      headers: {
        'X-E2E-RLS-BYPASS': '1',
        'Cookie': cookieHeader
      }
    });
    expect(afterRes.status()).toBe(200);
    const after = await afterRes.json();
    expect(after.price_applied).toBe(beforePricing.price_applied);
    expect(after.currency).toBe(beforePricing.currency);
    expect(after.is_early_bird).toBe(beforePricing.is_early_bird);
    expect(after.selected_package_code).toBe(beforePricing.selected_package_code);
  });

  test('payment admin can mark payment as passed via API', async ({ page, programmaticLogin }) => {
    // Login as payment admin
    await programmaticLogin('raja.gadgets89@gmail.com');
    
    const base = process.env.E2E_BASE_URL || 'http://localhost:8080';
    
    // Get cookies for API calls
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    // Get target registration via API
    const response = await page.request.get(`${base}/api/test/registrations/one`, {
      headers: { 
        'X-E2E-RLS-BYPASS': '1',
        'Cookie': cookieHeader
      }
    });
    expect(response.status()).toBe(200);
    const registration = await response.json();
    
    // Mark payment as passed via API
    const paymentResponse = await page.request.post(`${base}/api/admin/registrations/${registration.id}/mark-pass`, {
      headers: { 
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'Cookie': cookieHeader
      },
      data: { dimension: 'payment' }
    });
    expect([200, 201]).toContain(paymentResponse.status());
    
    const paymentResult = await paymentResponse.json();
    expect(paymentResult.ok).toBe(true);
    expect(paymentResult.dimension).toBe('payment');
  });

  test('TCC admin can mark TCC as passed via API', async ({ page, programmaticLogin }) => {
    // Login as TCC admin
            await programmaticLogin('yecsongkhla.official@gmail.com');
    
    const base = process.env.E2E_BASE_URL || 'http://localhost:8080';
    
    // Get cookies for API calls
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    // Get target registration via API
    const response = await page.request.get(`${base}/api/test/registrations/one`, {
      headers: { 
        'X-E2E-RLS-BYPASS': '1',
        'Cookie': cookieHeader
      }
    });
    expect(response.status()).toBe(200);
    const registration = await response.json();
    
    // Mark TCC as passed via API
    const tccResponse = await page.request.post(`${base}/api/admin/registrations/${registration.id}/mark-pass`, {
      headers: { 
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'Cookie': cookieHeader
      },
      data: { dimension: 'tcc' }
    });
    expect([200, 201]).toContain(tccResponse.status());
    
    const tccResult = await tccResponse.json();
    expect(tccResult.ok).toBe(true);
    expect(tccResult.dimension).toBe('tcc');
  });

  test('mark pass API returns correct response structure', async ({ page, programmaticLogin }) => {
    // Login as super admin
    await programmaticLogin('raja.gadgets89@gmail.com');
    
    const base = process.env.E2E_BASE_URL || 'http://localhost:8080';
    
    // Get cookies for API calls
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    // Get target registration via API
    const response = await page.request.get(`${base}/api/test/registrations/one`, {
      headers: { 
        'X-E2E-RLS-BYPASS': '1',
        'Cookie': cookieHeader
      }
    });
    expect(response.status()).toBe(200);
    const registration = await response.json();
    
    // Mark a dimension as passed
    const markPassResponse = await page.request.post(`${base}/api/admin/registrations/${registration.id}/mark-pass`, {
      headers: { 
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'Cookie': cookieHeader
      },
      data: { dimension: 'payment' }
    });
    expect([200, 201]).toContain(markPassResponse.status());
    
    const result = await markPassResponse.json();
    
    // Verify response structure
    expect(result).toHaveProperty('ok');
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('dimension');
    expect(result).toHaveProperty('message');
    expect(result.ok).toBe(true);
    expect(result.dimension).toBe('payment');
    expect(result.message).toContain('marked as passed');
  });

  test('mark pass with invalid dimension returns error', async ({ page, programmaticLogin }) => {
    // Login as super admin
    await programmaticLogin('raja.gadgets89@gmail.com');
    
    const base = process.env.E2E_BASE_URL || 'http://localhost:8080';
    
    // Get cookies for API calls
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    // Get target registration via API
    const response = await page.request.get(`${base}/api/test/registrations/one`, {
      headers: { 
        'X-E2E-RLS-BYPASS': '1',
        'Cookie': cookieHeader
      }
    });
    expect(response.status()).toBe(200);
    const registration = await response.json();
    
    // Try to mark with invalid dimension
    const markPassResponse = await page.request.post(`${base}/api/admin/registrations/${registration.id}/mark-pass`, {
      headers: { 
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'Cookie': cookieHeader
      },
      data: { dimension: 'invalid_dimension' }
    });
    
    // Should get 400 Bad Request
    expect(markPassResponse.status()).toBe(400);
    
    const result = await markPassResponse.json();
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Invalid dimension');
  });

  test('mark pass with missing dimension returns error', async ({ page, programmaticLogin }) => {
    // Login as super admin
    await programmaticLogin('raja.gadgets89@gmail.com');
    
    const base = process.env.E2E_BASE_URL || 'http://localhost:8080';
    
    // Get cookies for API calls
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    // Get target registration via API
    const response = await page.request.get(`${base}/api/test/registrations/one`, {
      headers: { 
        'X-E2E-RLS-BYPASS': '1',
        'Cookie': cookieHeader
      }
    });
    expect(response.status()).toBe(200);
    const registration = await response.json();
    
    // Try to mark with missing dimension
    const markPassResponse = await page.request.post(`${base}/api/admin/registrations/${registration.id}/mark-pass`, {
      headers: { 
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'Cookie': cookieHeader
      },
      data: {}
    });
    
    // Should get 400 Bad Request
    expect(markPassResponse.status()).toBe(400);
    
    const result = await markPassResponse.json();
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Invalid dimension');
  });
});
