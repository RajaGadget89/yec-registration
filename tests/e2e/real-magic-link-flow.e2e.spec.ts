import { test, expect } from '@playwright/test';

test.describe('Real Magic Link Flow Test', () => {
  test('should follow complete magic link authentication flow', async ({ page }) => {
    console.log('🔍 Starting real magic link flow test...');
    
    // Step 1: Generate a magic link
    console.log('📧 Generating magic link...');
    const magicLinkResponse = await page.request.get(
      'http://localhost:8080/api/test/magic-link?email=raja.gadgets89@gmail.com'
    );
    
    const magicLinkData = await magicLinkResponse.json();
    console.log('Magic link response:', magicLinkData);
    
    if (!magicLinkData.ok || !magicLinkData.actionLink) {
      console.error('❌ Failed to generate magic link');
      return;
    }
    
    // Step 2: Navigate to the magic link (this should redirect to Supabase)
    console.log('🖱️ Clicking magic link...');
    console.log('Magic link URL:', magicLinkData.actionLink);
    
    // Navigate to the magic link
    await page.goto(magicLinkData.actionLink);
    
    // Wait for any redirects
    await page.waitForLoadState('networkidle');
    
    console.log('Current URL after magic link click:', page.url());
    
    // Step 3: Check if we got redirected to Supabase
    if (page.url().includes('supabase.co')) {
      console.log('✅ Successfully redirected to Supabase');
      
      // Wait for Supabase to process and redirect back
      await page.waitForURL('**/auth/callback**', { timeout: 30000 });
      
      console.log('✅ Redirected back to callback URL:', page.url());
      
      // Step 4: Check if we have tokens in the URL
      const hash = await page.evaluate(() => window.location.hash);
      console.log('URL Hash:', hash);
      
      if (hash.includes('access_token')) {
        console.log('✅ Access token found in URL hash');
        
        // Step 5: Wait for the callback page to process
        await page.waitForLoadState('networkidle');
        
        // Step 6: Check if we got redirected to admin dashboard
        const finalUrl = page.url();
        console.log('Final URL:', finalUrl);
        
        if (finalUrl.includes('/admin')) {
          console.log('✅ Successfully reached admin dashboard!');
        } else {
          console.log('❌ Did not reach admin dashboard');
          
          // Check for error messages
          const errorText = await page.textContent('body');
          console.log('Page content:', errorText?.substring(0, 500));
          
          // Take a screenshot
          await page.screenshot({ path: 'test-artifacts/magic-link-flow-error.png' });
        }
      } else {
        console.log('❌ No access token found in URL hash');
        await page.screenshot({ path: 'test-artifacts/magic-link-no-token.png' });
      }
    } else {
      console.log('❌ Did not redirect to Supabase');
      console.log('Current URL:', page.url());
      await page.screenshot({ path: 'test-artifacts/magic-link-no-supabase-redirect.png' });
    }
    
    console.log('📊 Magic link flow test completed.');
  });
});
