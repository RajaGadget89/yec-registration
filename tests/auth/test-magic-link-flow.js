#!/usr/bin/env node

/**
 * Test script for magic link authentication flow
 * This simulates the actual flow that would happen with real Supabase tokens
 */

const http = require('http');

// Configuration
const BASE_URL = 'http://localhost:8080';

async function testMagicLinkFlow() {
  console.log('🔗 Testing Magic Link Authentication Flow');
  console.log('========================================');
  
  // Step 1: Test the magic link request
  console.log('\n1️⃣ Testing Magic Link Request');
  console.log('-----------------------------');
  
  const magicLinkData = JSON.stringify({
    email: 'raja.gadgets89@gmail.com'
  });

  const magicLinkOptions = {
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(magicLinkData)
    }
  };

  try {
    const magicLinkResponse = await new Promise((resolve, reject) => {
      const req = http.request(magicLinkOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        });
      });
      req.on('error', reject);
      req.write(magicLinkData);
      req.end();
    });

    console.log(`📡 Magic Link Response Status: ${magicLinkResponse.statusCode}`);
    console.log(`📡 Magic Link Response Body:`, magicLinkResponse.body);
    
  } catch (error) {
    console.error('❌ Magic Link Request Error:', error.message);
  }

  // Step 2: Test the callback with a simulated token
  console.log('\n2️⃣ Testing Callback with Simulated Token');
  console.log('----------------------------------------');
  
  // This would normally be a real token from Supabase
  // For testing, we'll use a properly formatted JWT structure
  const simulatedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU0OTI1ODAwLCJpYXQiOjE3NTQ5MjU0MDAsImlzcyI6Imh0dHBzOi8vd3d3emhwdnZ2Z3d5cG1xZ3Z0anYuc3VwYWJhc2UuY28iLCJzdWIiOiI5OTk5OTk5OSIsImVtYWlsIjoicmFqYS5nYWRnZXRzODlAZ21haWwuY29tIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYXQiOiI5OTk5OTk5OSIsImFtciI6W10sInNlc3Npb25faWQiOiI5OTk5OTk5OSJ9.mock_signature';

  const callbackData = JSON.stringify({
    access_token: simulatedToken,
    refresh_token: 'mock_refresh_token_12345',
    next: '/admin'
  });

  const callbackOptions = {
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/callback',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(callbackData)
    }
  };

  try {
    const callbackResponse = await new Promise((resolve, reject) => {
      const req = http.request(callbackOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        });
      });
      req.on('error', reject);
      req.write(callbackData);
      req.end();
    });

    console.log(`📡 Callback Response Status: ${callbackResponse.statusCode}`);
    console.log(`📡 Callback Response Headers:`, callbackResponse.headers);
    console.log(`📡 Callback Response Body:`, callbackResponse.body);
    
    if (callbackResponse.statusCode === 303) {
      console.log('✅ 303 Redirect Response (Expected)');
      console.log(`📍 Location: ${callbackResponse.headers.location}`);
    } else if (callbackResponse.statusCode >= 400) {
      console.log('❌ Error Response');
      try {
        const errorData = JSON.parse(callbackResponse.body);
        console.log('❌ Error Details:', errorData);
      } catch (e) {
        console.log('❌ Raw Error:', callbackResponse.body);
      }
    }
    
  } catch (error) {
    console.error('❌ Callback Request Error:', error.message);
  }

  // Step 3: Test admin dashboard access
  console.log('\n3️⃣ Testing Admin Dashboard Access');
  console.log('--------------------------------');
  
  try {
    const dashboardResponse = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 8080,
        path: '/admin',
        method: 'GET'
      }, (res) => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers
        });
      });
      req.on('error', reject);
      req.end();
    });

    console.log(`📡 Dashboard Response Status: ${dashboardResponse.statusCode}`);
    
    if (dashboardResponse.statusCode === 200) {
      console.log('✅ Dashboard accessible');
    } else if (dashboardResponse.statusCode === 302 || dashboardResponse.statusCode === 303) {
      console.log('⚠️ Dashboard redirecting (likely to login)');
      console.log(`📍 Location: ${dashboardResponse.headers.location}`);
    } else {
      console.log('❌ Dashboard access issue');
    }
    
  } catch (error) {
    console.error('❌ Dashboard Request Error:', error.message);
  }
}

async function main() {
  try {
    await testMagicLinkFlow();
    console.log('\n✅ Magic Link Flow Test Completed');
    
  } catch (error) {
    console.error('❌ Magic Link Flow Test Failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  main();
}

module.exports = { testMagicLinkFlow };
