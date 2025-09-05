#!/usr/bin/env node

/**
 * Authentication Test Runner
 * 
 * This script runs all authentication tests to confirm RED state
 * before implementing business role authentication enhancements.
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Running Authentication Tests - Expected RED State');
console.log('==================================================');

const testFiles = [
  'tests/auth/business-role-authentication.test.ts',
  'tests/auth/api-route-business-role-validation.test.ts',
  'tests/auth/type-definitions.test.ts',
  'tests/auth/ac1-ac6-regression.test.ts'
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

for (const testFile of testFiles) {
  console.log(`\n📁 Running: ${testFile}`);
  console.log('─'.repeat(50));
  
  try {
    const result = execSync(`npx jest ${testFile} --verbose --no-coverage`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log(result);
    
    // Count tests (basic parsing)
    const testCount = (result.match(/✓|✗/g) || []).length;
    const passCount = (result.match(/✓/g) || []).length;
    const failCount = (result.match(/✗/g) || []).length;
    
    totalTests += testCount;
    passedTests += passCount;
    failedTests += failCount;
    
    console.log(`✅ ${testFile}: ${passCount} passed, ${failCount} failed`);
    
  } catch (error) {
    console.log('❌ Test execution failed:', error.message);
    failedTests++;
  }
}

console.log('\n📊 Test Summary');
console.log('================');
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);

if (failedTests > 0) {
  console.log('\n🔴 RED STATE CONFIRMED');
  console.log('Expected failures detected - ready for PATCH phase');
} else {
  console.log('\n🟢 All tests passed - unexpected GREEN state');
  console.log('Review test expectations and implementation');
}

console.log('\n📝 Next Steps:');
console.log('1. Review failed tests to understand gaps');
console.log('2. Proceed to PATCH phase to implement fixes');
console.log('3. Re-run tests to confirm GREEN state');
