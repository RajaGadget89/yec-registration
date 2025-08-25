import { test, expect } from '@playwright/test';

test.describe('Email Outbox Debug - UI Analysis', () => {
  test('should analyze Email Outbox component structure and styling', async ({ page }) => {
    console.log('=== Starting Email Outbox Debug Test ===');
    
    // Navigate directly to admin dashboard
    await page.goto('/admin');
    console.log('✅ Navigated to admin dashboard');

    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded completely');

    // Take initial screenshot
    await page.screenshot({ 
      path: 'test-results/email-outbox-debug-initial.png',
      fullPage: true 
    });
    console.log('✅ Captured initial screenshot');

    // Check if we're on login page or admin dashboard
    const isLoginPage = await page.locator('text=Admin Login').isVisible();
    if (isLoginPage) {
      console.log('⚠️ On login page - will analyze what we can see');
      
      // Take screenshot of login page
      await page.screenshot({ 
        path: 'test-results/email-outbox-debug-login-page.png',
        fullPage: true 
      });
      console.log('✅ Captured login page screenshot');
      
      // Try to access admin page directly
      await page.goto('/admin', { waitUntil: 'networkidle' });
      console.log('✅ Attempted direct admin access');
    }

    // Check if Email Outbox section exists
    const emailOutboxSection = page.locator('text=Email Outbox').first();
    const isEmailOutboxVisible = await emailOutboxSection.isVisible();
    console.log(`📧 Email Outbox section visible: ${isEmailOutboxVisible}`);

    if (!isEmailOutboxVisible) {
      console.log('❌ Email Outbox not visible - taking full page screenshot for analysis');
      await page.screenshot({ 
        path: 'test-results/email-outbox-debug-not-visible.png',
        fullPage: true 
      });
      
      // Log all visible text for debugging
      const allText = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('*'))
          .map(el => el.textContent?.trim())
          .filter(text => text && text.length > 0)
          .slice(0, 20); // First 20 text elements
      });
      console.log('📝 Visible text elements:', allText);
      
      return; // Exit early if Email Outbox not visible
    }

    console.log('✅ Email Outbox section is visible');

    // Analyze the Email Outbox container structure
    const emailOutboxContainer = page.locator('text=Email Outbox').first().locator('..').locator('..').locator('..');
    
    // Get computed styles of the Email Outbox container
    const containerStyles = await emailOutboxContainer.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        borderRadius: styles.borderRadius,
        boxShadow: styles.boxShadow,
        padding: styles.padding,
        margin: styles.margin,
        border: styles.border,
        transition: styles.transition,
        transform: styles.transform,
        className: el.className,
        tagName: el.tagName
      };
    });
    
    console.log('📊 Email Outbox Container Styles:', JSON.stringify(containerStyles, null, 2));

    // Check for transition-none class
    const hasTransitionNone = await emailOutboxContainer.evaluate((el) => {
      return el.classList.contains('transition-none');
    });
    console.log(`🔍 Has transition-none class: ${hasTransitionNone}`);

    // Analyze all elements within Email Outbox
    const emailOutboxElements = await page.locator('text=Email Outbox').first().locator('..').locator('..').locator('..').locator('*').all();
    console.log(`📋 Found ${emailOutboxElements.length} elements within Email Outbox`);

    // Check for specific elements
    const statsElements = page.locator('text=Pending, text=Sent, text=Errors, text=Oldest, text=Success Rate');
    const statsCount = await statsElements.count();
    console.log(`📊 Found ${statsCount} stats elements`);

    // Analyze each stat element
    for (let i = 0; i < statsCount; i++) {
      const statElement = statsElements.nth(i);
      const text = await statElement.textContent();
      const styles = await statElement.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          backgroundColor: styles.backgroundColor,
          borderRadius: styles.borderRadius,
          border: styles.border,
          padding: styles.padding,
          className: el.className
        };
      });
      console.log(`📊 Stat ${i + 1} (${text?.trim()}):`, JSON.stringify(styles, null, 2));
    }

    // Check for action buttons
    const refreshButton = page.locator('button:has-text("Refresh")');
    const dispatchButton = page.locator('button:has-text("Dispatch Now")');
    
    console.log(`🔘 Refresh button visible: ${await refreshButton.isVisible()}`);
    console.log(`🔘 Dispatch button visible: ${await dispatchButton.isVisible()}`);

    // Analyze button styles
    if (await refreshButton.isVisible()) {
      const refreshStyles = await refreshButton.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          backgroundColor: styles.backgroundColor,
          border: styles.border,
          borderRadius: styles.borderRadius,
          className: el.className
        };
      });
      console.log('🔘 Refresh button styles:', JSON.stringify(refreshStyles, null, 2));
    }

    if (await dispatchButton.isVisible()) {
      const dispatchStyles = await dispatchButton.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          backgroundColor: styles.backgroundColor,
          border: styles.border,
          borderRadius: styles.borderRadius,
          className: el.className
        };
      });
      console.log('🔘 Dispatch button styles:', JSON.stringify(dispatchStyles, null, 2));
    }

    // Check for chart section
    const chartSection = page.locator('text=24h Activity');
    console.log(`📈 Chart section visible: ${await chartSection.isVisible()}`);

    // Analyze global CSS effects
    const globalStyles = await page.evaluate(() => {
      const styleSheets = Array.from(document.styleSheets);
      const globalRules: Array<{selector: string; styles: string; source: string}> = [];
      
      styleSheets.forEach((sheet, index) => {
        try {
          const rules = Array.from(sheet.cssRules || sheet.rules || []);
          rules.forEach((rule) => {
            if (rule instanceof CSSStyleRule) {
              if (rule.selectorText === '*' || rule.selectorText.includes('transition')) {
                globalRules.push({
                  selector: rule.selectorText,
                  styles: rule.style.cssText,
                  source: sheet.href || `stylesheet-${index}`
                });
              }
            }
          });
        } catch (e) {
          // Cross-origin stylesheets will throw errors
        }
      });
      
      return globalRules;
    });
    
    console.log('🌐 Global CSS rules affecting transitions:', JSON.stringify(globalStyles, null, 2));

    // Check for any hover effects
    const hoverEffects = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const hoverElements: Array<{tagName: string; className: string; transition: string; selector: string}> = [];
      
      elements.forEach((el) => {
        const styles = window.getComputedStyle(el);
        if (styles.transition !== 'none' && styles.transition !== '') {
          hoverElements.push({
            tagName: el.tagName,
            className: el.className,
            transition: styles.transition,
            selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ').join('.') : '')
          });
        }
      });
      
      return hoverElements.slice(0, 10); // Limit to first 10
    });
    
    console.log('🎯 Elements with transitions:', JSON.stringify(hoverEffects, null, 2));

    // Take detailed screenshot of Email Outbox section
    const emailOutboxScreenshot = page.locator('text=Email Outbox').first().locator('..').locator('..').locator('..');
    await emailOutboxScreenshot.screenshot({ 
      path: 'test-results/email-outbox-debug-detail.png' 
    });
    console.log('✅ Captured detailed Email Outbox screenshot');

    // Test hover interactions
    console.log('🖱️ Testing hover interactions...');
    
    // Hover over Email Outbox container
    await emailOutboxContainer.hover();
    await page.waitForTimeout(1000);
    
    // Check if any hover effects are applied
    const hoverStyles = await emailOutboxContainer.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        transform: styles.transform,
        boxShadow: styles.boxShadow,
        backgroundColor: styles.backgroundColor,
        transition: styles.transition
      };
    });
    
    console.log('🖱️ Styles after hover:', JSON.stringify(hoverStyles, null, 2));

    // Take screenshot after hover
    await emailOutboxContainer.screenshot({ 
      path: 'test-results/email-outbox-debug-hover.png' 
    });
    console.log('✅ Captured hover screenshot');

    // Test button hover effects
    if (await refreshButton.isVisible()) {
      await refreshButton.hover();
      await page.waitForTimeout(500);
      
      const refreshHoverStyles = await refreshButton.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          backgroundColor: styles.backgroundColor,
          transform: styles.transform,
          transition: styles.transition
        };
      });
      
      console.log('🔘 Refresh button hover styles:', JSON.stringify(refreshHoverStyles, null, 2));
    }

    if (await dispatchButton.isVisible()) {
      await dispatchButton.hover();
      await page.waitForTimeout(500);
      
      const dispatchHoverStyles = await dispatchButton.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          backgroundColor: styles.backgroundColor,
          transform: styles.transform,
          transition: styles.transition
        };
      });
      
      console.log('🔘 Dispatch button hover styles:', JSON.stringify(dispatchHoverStyles, null, 2));
    }

    // Final screenshot
    await page.screenshot({ 
      path: 'test-results/email-outbox-debug-final.png',
      fullPage: true 
    });
    console.log('✅ Captured final screenshot');

    console.log('=== Email Outbox Debug Test Complete ===');
  });

  test('should compare Email Outbox with KPI cards styling', async ({ page }) => {
    console.log('=== Starting Email Outbox vs KPI Cards Comparison ===');
    
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Check if we can access the admin page
    const isLoginPage = await page.locator('text=Admin Login').isVisible();
    if (isLoginPage) {
      console.log('⚠️ Cannot access admin page - skipping comparison test');
      return;
    }

    // Get KPI card styles for comparison
    const kpiCards = page.locator('text=Total Registrations').first().locator('..').locator('..');
    const kpiStyles = await kpiCards.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        borderRadius: styles.borderRadius,
        boxShadow: styles.boxShadow,
        padding: styles.padding,
        border: styles.border,
        transition: styles.transition,
        className: el.className
      };
    });
    
    console.log('📊 KPI Card Styles:', JSON.stringify(kpiStyles, null, 2));

    // Get Email Outbox styles
    const emailOutboxContainer = page.locator('text=Email Outbox').first().locator('..').locator('..').locator('..');
    const emailOutboxStyles = await emailOutboxContainer.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        borderRadius: styles.borderRadius,
        boxShadow: styles.boxShadow,
        padding: styles.padding,
        border: styles.border,
        transition: styles.transition,
        className: el.className
      };
    });
    
    console.log('📊 Email Outbox Styles:', JSON.stringify(emailOutboxStyles, null, 2));

    // Compare styles
    const comparison = {
      backgroundColor: kpiStyles.backgroundColor === emailOutboxStyles.backgroundColor ? '✅ Match' : '❌ Different',
      borderRadius: kpiStyles.borderRadius === emailOutboxStyles.borderRadius ? '✅ Match' : '❌ Different',
      boxShadow: kpiStyles.boxShadow === emailOutboxStyles.boxShadow ? '✅ Match' : '❌ Different',
      padding: kpiStyles.padding === emailOutboxStyles.padding ? '✅ Match' : '❌ Different',
      border: kpiStyles.border === emailOutboxStyles.border ? '✅ Match' : '❌ Different',
      transition: kpiStyles.transition === emailOutboxStyles.transition ? '✅ Match' : '❌ Different'
    };
    
    console.log('🔍 Style Comparison:', JSON.stringify(comparison, null, 2));

    // Take comparison screenshot
    await page.screenshot({ 
      path: 'test-results/email-outbox-kpi-comparison.png',
      fullPage: true 
    });
    console.log('✅ Captured comparison screenshot');

    console.log('=== Comparison Test Complete ===');
  });
});
