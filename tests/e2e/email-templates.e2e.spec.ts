import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Email Template Visual Tests', () => {
  const templates = [
    'tracking',
    'update-payment', 
    'update-info',
    'update-tcc',
    'approval-badge',
    'rejection'
  ];

  test.describe('Desktop Viewport (1200x800)', () => {
    test.use({ viewport: { width: 1200, height: 800 } });

    for (const template of templates) {
      test(`should render ${template} template correctly on desktop`, async ({ page }) => {
        await page.goto(`${BASE_URL}/api/dev/preview-email?template=${template}`);
        
        // Wait for the email to load
        await page.waitForSelector('body', { timeout: 10000 });
        
        // Check that the email container is visible
        const emailContainer = page.locator('div').filter({ hasText: 'YEC Day' }).first();
        await expect(emailContainer).toBeVisible();
        
        // Check for Thai content
        await expect(page.locator('body')).toContainText('YEC Day');
        
        // Check for English content
        await expect(page.locator('body')).toContainText('Young Entrepreneurs Chamber');
        
        // Check for tracking code
        await expect(page.locator('body')).toContainText('YEC2025-001234');
        
        // Check for PDPA notice
        await expect(page.locator('body')).toContainText('PDPA Notice');
        
        // Take screenshot for visual regression testing
        await page.screenshot({ 
          path: `test-results/email-${template}-desktop.png`,
          fullPage: true 
        });
      });
    }
  });

  test.describe('Mobile Viewport (375x667)', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    for (const template of templates) {
      test(`should render ${template} template correctly on mobile`, async ({ page }) => {
        await page.goto(`${BASE_URL}/api/dev/preview-email?template=${template}`);
        
        // Wait for the email to load
        await page.waitForSelector('body', { timeout: 10000 });
        
        // Check that the email container is visible
        const emailContainer = page.locator('div').filter({ hasText: 'YEC Day' }).first();
        await expect(emailContainer).toBeVisible();
        
        // Check for Thai content
        await expect(page.locator('body')).toContainText('YEC Day');
        
        // Check for English content
        await expect(page.locator('body')).toContainText('Young Entrepreneurs Chamber');
        
        // Check for tracking code
        await expect(page.locator('body')).toContainText('YEC2025-001234');
        
        // Check for PDPA notice
        await expect(page.locator('body')).toContainText('PDPA Notice');
        
        // Take screenshot for visual regression testing
        await page.screenshot({ 
          path: `test-results/email-${template}-mobile.png`,
          fullPage: true 
        });
      });
    }
  });

  test.describe('Template-Specific Tests', () => {
    test.use({ viewport: { width: 1200, height: 800 } });

    test('tracking template should show welcome message and tracking code', async ({ page }) => {
      await page.goto(`${BASE_URL}/api/dev/preview-email?template=tracking`);
      await page.waitForSelector('body');
      
      await expect(page.locator('body')).toContainText('ยินดีต้อนรับสู่ YEC Day');
      await expect(page.locator('body')).toContainText('Welcome to YEC Day');
      await expect(page.locator('body')).toContainText('รหัสติดตามการสมัคร');
      await expect(page.locator('body')).toContainText('Registration Tracking Code');
    });

    test('update-payment template should show payment update request', async ({ page }) => {
      await page.goto(`${BASE_URL}/api/dev/preview-email?template=update-payment`);
      await page.waitForSelector('body');
      
      await expect(page.locator('body')).toContainText('ต้องการข้อมูลเพิ่มเติม');
      await expect(page.locator('body')).toContainText('Additional Information Required');
      await expect(page.locator('body')).toContainText('อัปเดตสลิปการโอนเงิน');
      await expect(page.locator('body')).toContainText('Update Payment Slip');
      await expect(page.locator('body')).toContainText('2,500');
    });

    test('approval-badge template should show approval message and badge', async ({ page }) => {
      await page.goto(`${BASE_URL}/api/dev/preview-email?template=approval-badge`);
      await page.waitForSelector('body');
      
      await expect(page.locator('body')).toContainText('อนุมัติเรียบร้อยแล้ว');
      await expect(page.locator('body')).toContainText('Approved');
      await expect(page.locator('body')).toContainText('บัตรประจำตัว YEC Day ของคุณ');
      await expect(page.locator('body')).toContainText('Your YEC Day Badge');
    });

    test('rejection template should show rejection message with reason', async ({ page }) => {
      await page.goto(`${BASE_URL}/api/dev/preview-email?template=rejection`);
      await page.waitForSelector('body');
      
      await expect(page.locator('body')).toContainText('คำขอสมัครไม่ผ่าน');
      await expect(page.locator('body')).toContainText('Registration Not Approved');
      await expect(page.locator('body')).toContainText('เนื่องจากเกินกำหนดเวลาการสมัครที่กำหนดไว้');
      await expect(page.locator('body')).toContainText('due to missing the registration deadline');
    });
  });

  test.describe('Email Structure Tests', () => {
    test.use({ viewport: { width: 1200, height: 800 } });

    test('should have proper HTML structure', async ({ page }) => {
      await page.goto(`${BASE_URL}/api/dev/preview-email?template=tracking`);
      await page.waitForSelector('body');
      
      // Check HTML structure
      const html = await page.content();
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('<head>');
      expect(html).toContain('<meta charset="utf-8">');
      expect(html).toContain('<meta name="viewport"');
      expect(html).toContain('<title>YEC Day</title>');
      expect(html).toContain('</html>');
    });

    test('should include brand colors', async ({ page }) => {
      await page.goto(`${BASE_URL}/api/dev/preview-email?template=tracking`);
      await page.waitForSelector('body');
      
      // Check for brand colors in inline styles
      const html = await page.content();
      expect(html).toContain('#1A237E'); // Primary color
      expect(html).toContain('#4285C5'); // Accent color
      expect(html).toContain('#4CD1E0'); // Highlight color
    });

    test('should include PDPA notice in footer', async ({ page }) => {
      await page.goto(`${BASE_URL}/api/dev/preview-email?template=tracking`);
      await page.waitForSelector('body');
      
      await expect(page.locator('body')).toContainText('PDPA Notice');
      await expect(page.locator('body')).toContainText('ข้อมูลส่วนบุคคลของคุณจะถูกใช้เพื่อการลงทะเบียนและติดต่อเท่านั้น');
      await expect(page.locator('body')).toContainText('Your personal data will be used for registration and contact purposes only');
    });

    test('should include support email', async ({ page }) => {
      await page.goto(`${BASE_URL}/api/dev/preview-email?template=tracking`);
      await page.waitForSelector('body');
      
      await expect(page.locator('body')).toContainText('info@yecday.com');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle invalid template gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/api/dev/preview-email?template=invalid-template`);
      
      const response = await page.waitForResponse(response => 
        response.url().includes('/api/dev/preview-email')
      );
      
      expect(response.status()).toBe(400);
      
      const responseBody = await response.json();
      expect(responseBody.error).toContain('Template \'invalid-template\' not found');
    });

    test('should handle missing template parameter', async ({ page }) => {
      await page.goto(`${BASE_URL}/api/dev/preview-email`);
      
      const response = await page.waitForResponse(response => 
        response.url().includes('/api/dev/preview-email')
      );
      
      expect(response.status()).toBe(400);
      
      const responseBody = await response.json();
      expect(responseBody.error).toContain('Template parameter is required');
    });
  });
});

