#!/usr/bin/env node

/**
 * Real Magic Link Debug Test with Playwright
 * 
 * This script reproduces the exact authentication callback issue
 * using the real magic link URL from the user's email.
 */

const { chromium } = require('@playwright/test');

// Real magic link URL from the user's email
const REAL_MAGIC_LINK_URL = "http://localhost:8080/auth/callback#access_token=eyJhbGciOiJIUzI1NiIsImtpZCI6IkJ5TnFtL3FQVlY1WXkzMWMiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3d2d3pocHl2b2d3eXBtcWd2dGp2LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIyZDZjYjU4YS03ODY1LTRmYTAtYjU3ZC04NWZhYjY2ZWYwYjEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU0OTMwNTM5LCJpYXQiOjE3NTQ5MjY5MzksImVtYWlsIjoicmFqYS5nYWRnZXRzODlAZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbF92ZXJpZmllZCI6dHJ1ZX0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoib3RwIiwidGltZXN0YW1wIjoxNzU0OTI2OTM5fV0sInNlc3Npb25faWQiOiJmOGU5NTIzMC0wNjU1LTQ0N2QtYmEzZC0wMmY2MDAxMDA0ZTUiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.IPxJUDQJkbDBzTFOuk-3qBB0PHt1VrA4JAp3rKeKbGQ&expires_at=1754930539&expires_in=3600&refresh_token=nhg3ruonyezf&token_type=bearer&type=magiclink";

async function testRealMagicLink() {
  console.log('🔍 Testing Real Magic Link Authentication');
  console.log('========================================');
  console.log('');
  
  let browser;
  
  try {
    // Launch browser
    console.log('Launching browser...');
    browser = await chromium.launch({ 
      headless: false,
      devtools: true
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Enable console logging
    const consoleMessages = [];
    page.on('console', msg => {
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });
    
    // Enable network logging
    page.on('request', request => {
      console.log(`[Network Request] ${request.method()} ${request.url()}`);
    });
    
    page.on('response', response => {
      console.log(`[Network Response] ${response.status()} ${response.url()}`);
    });
    
    // Navigate to the real magic link URL
    console.log('Navigating to magic link URL...');
    console.log(`URL: ${REAL_MAGIC_LINK_URL}`);
    console.log('');
    
    await page.goto(REAL_MAGIC_LINK_URL, { waitUntil: 'networkidle' });
    
    // Wait for the page to process
    console.log('Waiting for authentication processing...');
    await page.waitForTimeout(5000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    // Check for error messages
    const errorElements = await page.$$('[data-testid="error-message"]');
    if (errorElements.length > 0) {
      const errorMessage = await page.textContent('[data-testid="error-message"]');
      console.log(`❌ Error Message: ${errorMessage}`);
    }
    
    // Check for success messages
    const successElements = await page.$$('[data-testid="success-message"]');
    if (successElements.length > 0) {
      const successMessage = await page.textContent('[data-testid="success-message"]');
      console.log(`✅ Success Message: ${successMessage}`);
    }
    
    // Check for loading state
    const loadingElements = await page.$$('[data-testid="loading-message"]');
    if (loadingElements.length > 0) {
      console.log('⏳ Still in loading state...');
    }
    
    console.log('');
    console.log('📋 Console Messages:');
    consoleMessages.forEach(msg => {
      console.log(`  - ${msg}`);
    });
    
    // Check cookies
    const cookies = await context.cookies();
    const authCookies = cookies.filter(c => 
      c.name === 'sb-access-token' || 
      c.name === 'sb-refresh-token' || 
      c.name === 'admin-email'
    );
    
    console.log('');
    console.log('🍪 Authentication Cookies:');
    authCookies.forEach(cookie => {
      console.log(`  - ${cookie.name}: ${cookie.value.substring(0, 20)}...`);
    });
    
    // Check if we're on admin page
    if (currentUrl.includes('/admin')) {
      console.log('');
      console.log('✅ Successfully redirected to admin page!');
      
      // Check if admin page loads correctly
      const adminContent = await page.textContent('body');
      if (adminContent.includes('Admin Dashboard')) {
        console.log('✅ Admin dashboard content loaded correctly');
      } else {
        console.log('⚠️ Admin page loaded but content may be different');
      }
    } else {
      console.log('');
      console.log('❌ Not redirected to admin page');
      console.log(`Current URL: ${currentUrl}`);
    }
    
    // Wait a bit more to see if anything changes
    console.log('');
    console.log('Waiting additional 5 seconds to observe any changes...');
    await page.waitForTimeout(5000);
    
    const finalUrl = page.url();
    console.log(`Final URL: ${finalUrl}`);
    
    // Final status
    console.log('');
    console.log('📊 FINAL STATUS:');
    if (finalUrl.includes('/admin')) {
      console.log('✅ AUTHENTICATION SUCCESSFUL');
    } else {
      console.log('❌ AUTHENTICATION FAILED');
      console.log('Check console messages above for error details');
    }
    
    // Analyze specific error patterns
    console.log('');
    console.log('🔍 ERROR ANALYSIS:');
    const hasServerError = consoleMessages.some(msg => 
      msg.includes('[callback] server error:')
    );
    const hasJsonError = consoleMessages.some(msg => 
      msg.includes('could not parse error response as JSON')
    );
    const hasRedirectLog = consoleMessages.some(msg => 
      msg.includes('response redirected:')
    );
    
    console.log(`- Server Error Pattern: ${hasServerError ? '❌ FOUND' : '✅ NOT FOUND'}`);
    console.log(`- JSON Parsing Error: ${hasJsonError ? '❌ FOUND' : '✅ NOT FOUND'}`);
    console.log(`- Redirect Log: ${hasRedirectLog ? '✅ FOUND' : '❌ NOT FOUND'}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (browser) {
      console.log('');
      console.log('Closing browser...');
      await browser.close();
    }
  }
}

// Run the test
testRealMagicLink().catch(console.error);
