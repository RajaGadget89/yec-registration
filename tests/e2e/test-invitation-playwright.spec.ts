import { test, expect } from '@playwright/test';

test.describe('Invitation Acceptance E2E Test', () => {
  test('should capture real runtime and DOM behavior', async ({ page }) => {
    // Set up comprehensive logging
    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });
    
    page.on('request', request => {
      if (request.url().includes('invitations/token') || request.url().includes('admin/accept')) {
        console.log(`[NETWORK REQUEST] ${request.method()} ${request.url()}`);
        console.log(`[REQUEST HEADERS]`, request.headers());
        if (request.postData()) {
          console.log(`[REQUEST BODY]`, request.postData());
        }
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('invitations/token') || response.url().includes('admin/accept')) {
        console.log(`[NETWORK RESPONSE] ${response.status()} ${response.url()}`);
        console.log(`[RESPONSE HEADERS]`, response.headers());
      }
    });
    
    page.on('pageerror', error => {
      console.log(`[PAGE ERROR] ${error.message}`);
    });

    // Test the exact URL from the user's screenshots
    console.log('📝 Testing invitation acceptance with real browser...');
    
    const token = 'XGd0Eu5bXeNSRjwzpwJf6z4vODezI+LBWgrICkBXqNY=';
    const acceptUrl = `http://localhost:8080/admin/accept?token=${encodeURIComponent(token)}`;
    
    console.log('Navigate to:', acceptUrl);
    
    // Navigate to the page
    await page.goto(acceptUrl, { waitUntil: 'networkidle' });
    
    // Wait for page to load and any JavaScript to execute
    await page.waitForTimeout(3000);
    
    // Capture the current state
    console.log('📝 Capturing page state...');
    
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Check for error messages in the page content
    const pageContent = await page.content();
    console.log('Page content length:', pageContent.length);
    
    // Look for specific error states in the DOM
    const errorElements = await page.locator('text=/expired|Expired|EXPIRED|invalid|Invalid|INVALID/').all();
    console.log('Error elements found:', errorElements.length);
    
    for (let i = 0; i < errorElements.length; i++) {
      const text = await errorElements[i].textContent();
      console.log(`Error element ${i + 1}:`, text);
    }
    
    // Check for loading states
    const loadingElements = await page.locator('text=/loading|Loading|LOADING|verifying|Verifying/').all();
    console.log('Loading elements found:', loadingElements.length);
    
    for (let i = 0; i < loadingElements.length; i++) {
      const text = await loadingElements[i].textContent();
      console.log(`Loading element ${i + 1}:`, text);
    }
    
    // Check for success states
    const successElements = await page.locator('text=/success|Success|SUCCESS|welcome|Welcome/').all();
    console.log('Success elements found:', successElements.length);
    
    for (let i = 0; i < successElements.length; i++) {
      const text = await successElements[i].textContent();
      console.log(`Success element ${i + 1}:`, text);
    }
    
    // Check for any forms on the page
    const forms = await page.locator('form').all();
    console.log('Forms found on page:', forms.length);
    
    if (forms.length > 0) {
      for (let i = 0; i < forms.length; i++) {
        const formAction = await forms[i].getAttribute('action');
        const formMethod = await forms[i].getAttribute('method');
        console.log(`Form ${i + 1}: action="${formAction}", method="${formMethod}"`);
      }
    }
    
    // Check for any buttons
    const buttons = await page.locator('button').all();
    console.log('Buttons found on page:', buttons.length);
    
    for (let i = 0; i < buttons.length; i++) {
      const buttonText = await buttons[i].textContent();
      const buttonType = await buttons[i].getAttribute('type');
      console.log(`Button ${i + 1}: "${buttonText}", type="${buttonType}"`);
    }
    
    // Check for any input fields
    const inputs = await page.locator('input').all();
    console.log('Input fields found on page:', inputs.length);
    
    for (let i = 0; i < inputs.length; i++) {
      const inputType = await inputs[i].getAttribute('type');
      const inputName = await inputs[i].getAttribute('name');
      const inputValue = await inputs[i].getAttribute('value');
      console.log(`Input ${i + 1}: type="${inputType}", name="${inputName}", value="${inputValue}"`);
    }
    
    // Check for any React state or data attributes
    const dataTestIds = await page.locator('[data-testid]').all();
    console.log('Elements with data-testid found:', dataTestIds.length);
    
    for (let i = 0; i < dataTestIds.length; i++) {
      const testId = await dataTestIds[i].getAttribute('data-testid');
      const text = await dataTestIds[i].textContent();
      console.log(`Test ID ${i + 1}: "${testId}" - "${text}"`);
    }
    
    // Take a screenshot for debugging
    console.log('📸 Taking screenshot for debugging...');
    await page.screenshot({ path: 'playwright-e2e-test-screenshot.png', fullPage: true });
    console.log('Screenshot saved as: playwright-e2e-test-screenshot.png');
    
    // Final analysis
    console.log('🔍 Final E2E Analysis:');
    console.log('======================');
    console.log('Error elements in DOM:', errorElements.length);
    console.log('Loading elements in DOM:', loadingElements.length);
    console.log('Success elements in DOM:', successElements.length);
    console.log('Forms on page:', forms.length);
    console.log('Buttons on page:', buttons.length);
    console.log('Input fields on page:', inputs.length);
    console.log('Data test IDs found:', dataTestIds.length);
    
    if (errorElements.length > 0) {
      console.log('❌ Error state detected - invitation is being rejected');
    }
    
    if (loadingElements.length > 0) {
      console.log('⚠️  Loading state detected - page might be stuck');
    }
    
    if (successElements.length > 0) {
      console.log('✅ Success state detected - invitation was accepted');
    }
    
    // Wait for any additional network requests
    await page.waitForTimeout(2000);
    
    console.log('💡 Next Steps:');
    console.log('==============');
    console.log('1. Check the screenshot: playwright-e2e-test-screenshot.png');
    console.log('2. Review the browser console output above');
    console.log('3. Check the network requests and responses');
    console.log('4. Verify the DOM state matches the expected behavior');
  });
});





