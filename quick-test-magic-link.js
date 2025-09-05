#!/usr/bin/env node

/**
 * Quick Magic Link Authentication Test
 * 
 * This test quickly identifies the exact issue with magic link authentication
 */

const { chromium } = require('playwright');

async function quickTest() {
  console.log('🔍 Quick Magic Link Authentication Test');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Step 1: Check current auth state
    console.log('📋 Step 1: Checking current authentication state');
    await page.goto('http://localhost:8080/api/admin/me');
    const adminMeResponse = await page.textContent('body');
    console.log('Admin/me response:', adminMeResponse);
    
    // Step 2: Check if magic link endpoint works
    console.log('📋 Step 2: Testing magic link generation');
    await page.goto('http://localhost:8080/api/test/magic-link?email=raja.gadgets89@gmail.com');
    const magicLinkResponse = await page.textContent('body');
    console.log('Magic link response:', magicLinkResponse);
    
    // Step 3: Check login page
    console.log('📋 Step 3: Checking login page');
    await page.goto('http://localhost:8080/admin/login');
    const loginPageTitle = await page.title();
    console.log('Login page title:', loginPageTitle);
    
    // Step 4: Check callback page
    console.log('📋 Step 4: Checking callback page');
    await page.goto('http://localhost:8080/auth/callback');
    const callbackPageTitle = await page.title();
    console.log('Callback page title:', callbackPageTitle);
    
    // Step 5: Check if verify endpoint exists
    console.log('📋 Step 5: Checking verify endpoint');
    try {
      await page.goto('http://localhost:8080/auth/verify');
      const verifyPageTitle = await page.title();
      console.log('Verify endpoint exists, title:', verifyPageTitle);
    } catch (error) {
      console.log('Verify endpoint does not exist or is not accessible');
    }
    
    // Step 6: Check if confirm endpoint exists
    console.log('📋 Step 6: Checking confirm endpoint');
    try {
      await page.goto('http://localhost:8080/auth/confirm');
      const confirmPageTitle = await page.title();
      console.log('Confirm endpoint exists, title:', confirmPageTitle);
    } catch (error) {
      console.log('Confirm endpoint does not exist or is not accessible');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

quickTest().catch(console.error);