#!/usr/bin/env node

/**
 * Real UI Behavior Test
 * Captures actual runtime and DOM behavior to find the real root cause
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 REAL UI BEHAVIOR TEST');
console.log('=========================\n');

console.log('This test will capture the actual runtime behavior and DOM state');
console.log('to identify the real root cause of the persistent hydration error.\n');

// Test URLs to check
const testUrls = [
  'http://localhost:8080/admin/login',
  'http://localhost:8080/',
  'http://localhost:8080/admin/login?next=%2Fadmin'
];

async function capturePageBehavior(url) {
  console.log(`\n📄 Testing: ${url}`);
  console.log('='.repeat(50));
  
  try {
    const response = await fetch(url);
    const html = await response.text();
    
    console.log(`✅ Response Status: ${response.status}`);
    console.log(`✅ Content Length: ${html.length} characters`);
    
    // Check for hydration-related content
    const hydrationMarkers = [
      'hydration',
      'mismatch',
      'server rendered',
      'client properties',
      'bis_skin_checked',
      'window',
      'document',
      'navigator'
    ];
    
    console.log('\n🔍 Hydration Markers Found:');
    hydrationMarkers.forEach(marker => {
      const matches = html.match(new RegExp(marker, 'gi'));
      if (matches) {
        console.log(`  - "${marker}": ${matches.length} occurrences`);
      }
    });
    
    // Check for React hydration markers
    const reactMarkers = [
      '__next_f',
      '__NEXT_DATA__',
      'react-hydration',
      'hydration-mismatch'
    ];
    
    console.log('\n⚛️  React Markers Found:');
    reactMarkers.forEach(marker => {
      const matches = html.match(new RegExp(marker, 'gi'));
      if (matches) {
        console.log(`  - "${marker}": ${matches.length} occurrences`);
      }
    });
    
    // Check for browser extension markers
    const extensionMarkers = [
      'bis_skin_checked',
      'data-extension',
      'chrome-extension',
      'moz-extension'
    ];
    
    console.log('\n🔌 Browser Extension Markers:');
    extensionMarkers.forEach(marker => {
      const matches = html.match(new RegExp(marker, 'gi'));
      if (matches) {
        console.log(`  - "${marker}": ${matches.length} occurrences`);
      }
    });
    
    // Save HTML for analysis
    const filename = `test-${url.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
    fs.writeFileSync(filename, html);
    console.log(`\n💾 HTML saved to: ${filename}`);
    
    return {
      url,
      status: response.status,
      length: html.length,
      html
    };
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return null;
  }
}

async function checkServerLogs() {
  console.log('\n📋 CHECKING SERVER LOGS');
  console.log('========================\n');
  
  try {
    // Check if server is running
    const healthResponse = await fetch('http://localhost:8080/api/health');
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ Server is running');
      console.log(`   Status: ${health.status}`);
      console.log(`   Environment: ${health.environment}`);
      console.log(`   Uptime: ${health.uptime}s`);
    } else {
      console.log('❌ Server health check failed');
    }
  } catch (error) {
    console.log('❌ Server not responding');
    console.log(`   Error: ${error.message}`);
  }
}

async function analyzeComponentFiles() {
  console.log('\n🔍 ANALYZING COMPONENT FILES');
  console.log('============================\n');
  
  const componentFiles = [
    'app/admin/_components/AdminUserInfoClient.tsx',
    'app/admin/_components/EmailOutboxNavWidget.tsx',
    'app/components/RegistrationForm/FormField.tsx',
    'app/admin/_components/ChecklistChips.tsx'
  ];
  
  componentFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} exists`);
      
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for potential hydration issues
      const issues = [];
      
      if (content.includes('typeof window')) {
        issues.push('Uses typeof window check');
      }
      if (content.includes('Date.now()')) {
        issues.push('Uses Date.now()');
      }
      if (content.includes('Math.random()')) {
        issues.push('Uses Math.random()');
      }
      if (content.includes('navigator')) {
        issues.push('Uses navigator');
      }
      if (content.includes('localStorage')) {
        issues.push('Uses localStorage');
      }
      if (content.includes('document')) {
        issues.push('Uses document');
      }
      
      if (issues.length > 0) {
        console.log(`   ⚠️  Potential issues: ${issues.join(', ')}`);
      } else {
        console.log(`   ✅ No obvious hydration issues`);
      }
    } else {
      console.log(`❌ ${file} not found`);
    }
  });
}

async function runComprehensiveTest() {
  console.log('🚀 STARTING COMPREHENSIVE UI BEHAVIOR TEST');
  console.log('==========================================\n');
  
  // Check server status
  await checkServerLogs();
  
  // Analyze component files
  await analyzeComponentFiles();
  
  // Test each URL
  const results = [];
  for (const url of testUrls) {
    const result = await capturePageBehavior(url);
    if (result) {
      results.push(result);
    }
  }
  
  console.log('\n📊 TEST SUMMARY');
  console.log('================\n');
  
  console.log(`✅ Tested ${results.length} URLs`);
  results.forEach(result => {
    console.log(`   - ${result.url}: ${result.status} (${result.length} chars)`);
  });
  
  console.log('\n🔍 NEXT STEPS');
  console.log('=============\n');
  
  console.log('1. Review the captured HTML files for hydration markers');
  console.log('2. Check browser console for specific error details');
  console.log('3. Identify which component is causing the mismatch');
  console.log('4. Test with browser extensions disabled');
  console.log('5. Compare server vs client rendered content');
  
  console.log('\n⚠️  IMPORTANT NOTES');
  console.log('==================\n');
  
  console.log('• The hydration error might be caused by browser extensions');
  console.log('• Check for bis_skin_checked attributes in the HTML');
  console.log('• Compare server-rendered vs client-rendered content');
  console.log('• Look for dynamic content that changes between renders');
  
  console.log('\n✅ Comprehensive test completed!');
  console.log('Review the results above and captured HTML files.');
}

// Check if fetch is available
if (typeof fetch === 'undefined') {
  try {
    global.fetch = require('node-fetch');
    console.log('✅ node-fetch loaded');
  } catch (error) {
    console.log('❌ node-fetch not available');
    console.log('Please run: npm install node-fetch');
    process.exit(1);
  }
}

// Run the comprehensive test
runComprehensiveTest().catch(console.error);
