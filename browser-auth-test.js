// Enhanced Browser Authentication Test Script
// Run this in Chrome Developer Console after clicking magic link

console.log('🧪 Starting Enhanced Authentication Test...');

// Test 1: Check current URL and tokens
console.log('📍 Current URL:', window.location.href);
console.log('🔑 Access Token in URL:', window.location.hash.includes('access_token'));
console.log('🔑 Refresh Token in URL:', window.location.hash.includes('refresh_token'));

// Test 2: Check for Supabase cookies
const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
}, {});

console.log('🍪 Current Cookies:', cookies);
const supabaseCookies = Object.keys(cookies).filter(key => key.includes('sb-'));
console.log('🔐 Supabase Cookies Found:', supabaseCookies);

// Test 3: Check localStorage and sessionStorage
console.log('💾 LocalStorage Keys:', Object.keys(localStorage));
console.log('💾 SessionStorage Keys:', Object.keys(sessionStorage));

// Test 4: Test admin API endpoint
async function testAdminAPI() {
    try {
        console.log('🌐 Testing /api/admin/me...');
        const response = await fetch('/api/admin/me', { 
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
        };
        
        try {
            result.body = await response.json();
        } catch {
            result.body = await response.text();
        }
        
        console.log('📊 Admin API Result:', result);
        
        if (response.status === 200) {
            console.log('✅ Authentication successful!');
            console.log('👤 User Data:', result.body);
            return true;
        } else {
            console.log('❌ Authentication failed:', result.body);
            return false;
        }
    } catch (error) {
        console.error('💥 API Test Error:', error);
        return false;
    }
}

// Test 5: Check for authentication errors in DOM
const authError = document.querySelector('[data-testid="auth-error"], .auth-error, .error-message');
if (authError) {
    console.log('🚨 Authentication Error in DOM:', authError.textContent);
} else {
    console.log('✅ No authentication errors found in DOM');
}

// Test 6: Check for loading states
const loadingElements = document.querySelectorAll('[data-testid="loading"], .loading, .spinner');
if (loadingElements.length > 0) {
    console.log('⏳ Loading elements found:', loadingElements.length);
} else {
    console.log('✅ No loading elements found');
}

// Run the comprehensive test
async function runComprehensiveTest() {
    console.log('🚀 Running comprehensive authentication test...');
    
    const apiTest = await testAdminAPI();
    
    // Summary
    console.log('\n📋 Test Summary:');
    console.log('================');
    console.log('🔑 Access Token Present:', window.location.hash.includes('access_token'));
    console.log('🍪 Supabase Cookies:', supabaseCookies.length > 0 ? supabaseCookies : 'None');
    console.log('🌐 API Authentication:', apiTest ? 'Success' : 'Failed');
    console.log('🚨 DOM Errors:', authError ? 'Found' : 'None');
    
    if (apiTest && supabaseCookies.length > 0) {
        console.log('🎉 All tests passed! Authentication is working perfectly.');
    } else if (supabaseCookies.length === 0) {
        console.log('🔧 Browser cleanup needed - no Supabase cookies found.');
        console.log('💡 Follow the browser cleanup instructions from the test script.');
    } else {
        console.log('🔧 Authentication issues detected. Check the output above.');
    }
}

// Run the test
runComprehensiveTest();

console.log('📋 Enhanced test completed. Check the results above.');
