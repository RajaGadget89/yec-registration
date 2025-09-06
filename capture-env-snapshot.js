#!/usr/bin/env node

/**
 * Environment Snapshot Script for Admin Job Assignment Go-Live
 * Captures runtime environment variables for verification
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
try {
  require('dotenv').config({ path: path.join(__dirname, '.env.local') });
} catch (error) {
  console.warn('Warning: Could not load .env.local file:', error.message);
}

// Get timestamp for this run
const timestamp = process.env.TIMESTAMP || new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const artifactsDir = path.join(__dirname, 'artifacts', 'go-live', timestamp);

// Ensure artifacts directory exists
if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

// Environment variables to capture
const envVars = [
  'FEATURES_ADMIN_MANAGEMENT',
  'FEATURES_ADMIN_JOB_ASSIGNMENT', 
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_APP_URL',
  'E2E_TEST_MODE',
  'TEST_HELPERS_ENABLED',
  'NODE_ENV',
  'VERCEL_ENV',
  'SUPABASE_ENV'
];

// Function to mask sensitive values
function maskValue(key, value) {
  if (!value) return 'undefined';
  
  // Mask URLs but keep the domain visible
  if (key.includes('URL') && value.includes('://')) {
    try {
      const url = new URL(value);
      return `${url.protocol}//${url.host}${url.pathname}`;
    } catch {
      return 'masked-url';
    }
  }
  
  // Mask API keys and secrets
  if (key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN')) {
    return value.length > 8 ? `${value.slice(0, 4)}...${value.slice(-4)}` : 'masked';
  }
  
  return value;
}

// Capture environment snapshot
const envSnapshot = {
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV || 'development',
  variables: {}
};

envVars.forEach(key => {
  const value = process.env[key];
  envSnapshot.variables[key] = {
    present: value !== undefined,
    value: maskValue(key, value)
  };
});

// Write to file
const outputFile = path.join(artifactsDir, 'env-snapshot.txt');
const content = `[env-snapshot]
Timestamp: ${envSnapshot.timestamp}
Environment: ${envSnapshot.environment}

Environment Variables:
${envVars.map(key => {
  const varInfo = envSnapshot.variables[key];
  return `${key}=${varInfo.present ? varInfo.value : 'undefined'}`;
}).join('\n')}

Feature Flags Status:
- FEATURES_ADMIN_MANAGEMENT: ${envSnapshot.variables.FEATURES_ADMIN_MANAGEMENT.present ? envSnapshot.variables.FEATURES_ADMIN_MANAGEMENT.value : 'undefined'}
- FEATURES_ADMIN_JOB_ASSIGNMENT: ${envSnapshot.variables.FEATURES_ADMIN_JOB_ASSIGNMENT.present ? envSnapshot.variables.FEATURES_ADMIN_JOB_ASSIGNMENT.value : 'undefined'}

Database Configuration:
- NEXT_PUBLIC_SUPABASE_URL: ${envSnapshot.variables.NEXT_PUBLIC_SUPABASE_URL.present ? envSnapshot.variables.NEXT_PUBLIC_SUPABASE_URL.value : 'undefined'}
- SUPABASE_ENV: ${envSnapshot.variables.SUPABASE_ENV.present ? envSnapshot.variables.SUPABASE_ENV.value : 'undefined'}

Application Configuration:
- NEXT_PUBLIC_APP_URL: ${envSnapshot.variables.NEXT_PUBLIC_APP_URL.present ? envSnapshot.variables.NEXT_PUBLIC_APP_URL.value : 'undefined'}
- NODE_ENV: ${envSnapshot.variables.NODE_ENV.present ? envSnapshot.variables.NODE_ENV.value : 'undefined'}
- VERCEL_ENV: ${envSnapshot.variables.VERCEL_ENV.present ? envSnapshot.variables.VERCEL_ENV.value : 'undefined'}

Test Configuration:
- E2E_TEST_MODE: ${envSnapshot.variables.E2E_TEST_MODE.present ? envSnapshot.variables.E2E_TEST_MODE.value : 'undefined'}
- TEST_HELPERS_ENABLED: ${envSnapshot.variables.TEST_HELPERS_ENABLED.present ? envSnapshot.variables.TEST_HELPERS_ENABLED.value : 'undefined'}
`;

fs.writeFileSync(outputFile, content);

console.log(`Environment snapshot captured to: ${outputFile}`);
console.log('\nEnvironment Summary:');
console.log(`- Feature Flags: ${envSnapshot.variables.FEATURES_ADMIN_MANAGEMENT.present ? '✅' : '❌'} ADMIN_MANAGEMENT, ${envSnapshot.variables.FEATURES_ADMIN_JOB_ASSIGNMENT.present ? '✅' : '❌'} JOB_ASSIGNMENT`);
console.log(`- Database: ${envSnapshot.variables.NEXT_PUBLIC_SUPABASE_URL.present ? '✅' : '❌'} URL configured`);
console.log(`- App URL: ${envSnapshot.variables.NEXT_PUBLIC_APP_URL.present ? '✅' : '❌'} configured`);

// Also write JSON version for programmatic access
const jsonFile = path.join(artifactsDir, 'env-snapshot.json');
fs.writeFileSync(jsonFile, JSON.stringify(envSnapshot, null, 2));

console.log(`JSON snapshot written to: ${jsonFile}`);
