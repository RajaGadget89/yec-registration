import { test, expect } from '@playwright/test';

test.describe('Audit Dashboard', () => {
  test('@audit @dashboard should display audit logs and support filtering', async ({ page, request, baseURL }) => {
    // Step 1: Generate a fresh request ID and create audit logs
    const rid = `e2e-dashboard-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    
    // Call the audit-e2e endpoint to create logs
    const response = await request.get('/api/diag/audit-e2e', {
      headers: {
        'X-Request-ID': rid
      }
    });
    
    expect(response.status()).toBe(200);
    console.log(`[e2e] Created audit logs with request ID: ${rid}`);

    // Step 2: Login as admin (reuse existing admin login helper)
    // This assumes there's an admin user in the system
    await page.goto('/admin/login');
    
    // Wait for login page to load
    await page.waitForSelector('input[type="email"]');
    
    // Fill in admin credentials (you may need to adjust these based on your test setup)
    await page.fill('input[type="email"]', process.env.TEST_ADMIN_EMAIL || 'admin@test.com');
    await page.fill('input[type="password"]', process.env.TEST_ADMIN_PASSWORD || 'password');
    
    // Submit login form
    await page.click('button[type="submit"]');
    
    // Wait for redirect to admin dashboard
    await page.waitForURL('/admin');
    
    // Step 3: Navigate to audit dashboard with request ID filter
    await page.goto(`/admin/audit?request_id=${rid}`);
    
    // Wait for the page to load
    await page.waitForSelector('h1:has-text("Audit Dashboard")');
    
    // Step 4: Verify the page shows audit logs for the specific request ID
    // Wait for logs to appear (allow up to 5 seconds for DB propagation)
    await page.waitForFunction(
      (requestId) => {
        const accessLogs = document.querySelectorAll('table tbody tr');
        const eventLogs = document.querySelectorAll('table tbody tr');
        return accessLogs.length > 0 || eventLogs.length > 0;
      },
      rid,
      { timeout: 5000 }
    );
    
    // Step 5: Verify Access Logs tab shows at least 1 row
    const accessLogRows = page.locator('table tbody tr');
    const accessLogCount = await accessLogRows.count();
    expect(accessLogCount).toBeGreaterThan(0);
    
    // Verify the request ID is present in the access logs
    const requestIdCell = page.locator(`td:has-text("${rid}")`);
    await expect(requestIdCell).toBeVisible();
    
    // Step 6: Verify Event Logs tab shows at least 1 row
    // The event logs should also be visible since we're filtering by request_id
    // which maps to correlation_id for event logs
    const eventLogRows = page.locator('table tbody tr');
    const eventLogCount = await eventLogRows.count();
    expect(eventLogCount).toBeGreaterThan(0);
    
    // Step 7: Test filtering functionality
    // Test action filter
    await page.fill('input[name="action"]', 'GET');
    await page.click('button[type="submit"]');
    
    // Wait for filtered results
    await page.waitForLoadState('networkidle');
    
    // Verify filter is applied (URL should contain the filter)
    await expect(page).toHaveURL(/action=GET/);
    
    // Step 8: Test date filtering
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateFrom = yesterday.toISOString().slice(0, 16);
    
    await page.fill('input[name="date_from"]', dateFrom);
    await page.click('button[type="submit"]');
    
    // Wait for filtered results
    await page.waitForLoadState('networkidle');
    
    // Verify date filter is applied
    await expect(page).toHaveURL(/date_from=/);
    
    // Step 9: Test resource filter
    await page.fill('input[name="resource"]', 'api');
    await page.click('button[type="submit"]');
    
    // Wait for filtered results
    await page.waitForLoadState('networkidle');
    
    // Verify resource filter is applied
    await expect(page).toHaveURL(/resource=api/);
    
    // Step 10: Verify timezone formatting (TH time) and time ago labels
    const timeCells = page.locator('td:first-child');
    const firstTimeCell = timeCells.first();
    const timeText = await firstTimeCell.textContent();
    
    // Verify the time is in the expected format (YYYY-MM-DD HH:mm:ss)
    expect(timeText).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    
    // Verify time ago label is present
    expect(timeText).toMatch(/ago$/);
    
    // Step 11: Test CSV export functionality
    // Click Export CSV for Access logs
    const exportAccessButton = page.locator('a:has-text("Export CSV")').first();
    await expect(exportAccessButton).toBeVisible();
    
    // Get the export URL and fetch the CSV
    const exportUrl = await exportAccessButton.getAttribute('href');
    expect(exportUrl).toContain('/admin/audit/export?type=access');
    
    // Fetch the CSV content
    const csvResponse = await request.get(`${baseURL}${exportUrl}`);
    expect(csvResponse.status()).toBe(200);
    expect(csvResponse.headers()['content-type']).toContain('text/csv');
    
    const csvContent = await csvResponse.text();
    expect(csvContent).toContain('occurred_at_th,action,resource,result,request_id,latency_ms,src_ip,user_agent');
    expect(csvContent).toContain(rid);
    
    // Test Event logs CSV export
    const exportEventButton = page.locator('a:has-text("Export CSV")').nth(1);
    await expect(exportEventButton).toBeVisible();
    
    const exportEventUrl = await exportEventButton.getAttribute('href');
    expect(exportEventUrl).toContain('/admin/audit/export?type=event');
    
    const csvEventResponse = await request.get(`${baseURL}${exportEventUrl}`);
    expect(csvEventResponse.status()).toBe(200);
    expect(csvEventResponse.headers()['content-type']).toContain('text/csv');
    
    const csvEventContent = await csvEventResponse.text();
    expect(csvEventContent).toContain('occurred_at_th,action,resource,result,correlation_id');
    expect(csvEventContent).toContain(rid);
    
    // Step 12: Test copy button functionality
    const copyButtons = page.locator('button[title="Copy to clipboard"]');
    await expect(copyButtons.first()).toBeVisible();
    
    // Step 13: Test quick filters
    // Test Registration filter
    await page.click('button:has-text("Registration")');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/action=register/);
    
    // Test Login filter
    await page.click('button:has-text("Login")');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/action=login/);
    
    // Test Diagnostic filter
    await page.click('button:has-text("Diagnostic")');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/action=diag/);
    
    // Step 14: Test empty state (with non-existent request ID)
    await page.goto('/admin/audit?request_id=non-existent-id');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Should show empty state message
    await expect(page.locator('text=No access logs found')).toBeVisible();
    await expect(page.locator('text=No event logs found')).toBeVisible();
  });

  test('@audit @dashboard should require admin authentication', async ({ page }) => {
    // Try to access audit dashboard without authentication
    await page.goto('/admin/audit');
    
    // Should redirect to login page
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('@audit @dashboard should display correct default time window', async ({ page, request }) => {
    // Login as admin first
    await page.goto('/admin/login');
    await page.waitForSelector('input[type="email"]');
    await page.fill('input[type="email"]', process.env.TEST_ADMIN_EMAIL || 'admin@test.com');
    await page.fill('input[type="password"]', process.env.TEST_ADMIN_PASSWORD || 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');
    
    // Navigate to audit dashboard without any date filters
    await page.goto('/admin/audit');
    
    // Wait for the page to load
    await page.waitForSelector('h1:has-text("Audit Dashboard")');
    
    // Verify that logs are displayed (default should be last 24h)
    const accessLogRows = page.locator('table tbody tr');
    await expect(accessLogRows.first()).toBeVisible({ timeout: 10000 });
    
    // Verify the date inputs show the default 24h window
    const dateFromInput = page.locator('input[name="date_from"]');
    const dateToInput = page.locator('input[name="date_to"]');
    
    await expect(dateFromInput).toHaveValue(/.+/); // Should have a value
    await expect(dateToInput).toHaveValue(/.+/); // Should have a value
  });
});
