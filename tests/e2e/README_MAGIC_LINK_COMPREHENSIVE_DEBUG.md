# Magic Link Comprehensive Debug Tool

## Overview

This comprehensive debugging tool is designed to capture ALL runtime errors and provide deep analysis of the magic link authentication issue that has been blocking the YEC Registration project for 30+ hours.

## 🚨 Root Cause Identified

Based on the URL you provided (`https://%2A.vercel.app/auth/callback#access_token=...`), the **root cause** is clear:

**Problem**: The magic link is redirecting to `%2A.vercel.app` (URL-encoded `*`) instead of the correct domain.

**Root Cause**: **Supabase configuration mismatch** - the redirect URL in Supabase doesn't match the actual application URL.

## 🔧 What This Tool Does

### Comprehensive Analysis
- **Environment Validation**: Checks all required environment variables and configurations
- **Supabase Configuration Analysis**: Validates Supabase project settings and redirect URLs
- **Network Request Capture**: Monitors all HTTP requests and responses
- **Error Capture**: Captures browser console errors, network failures, and authentication errors
- **Token Analysis**: Validates JWT tokens and session establishment
- **Redirect Chain Tracking**: Tracks the complete redirect flow
- **Session State Analysis**: Verifies authentication state and cookie handling

### Deep Debugging Features
- **Real Browser Simulation**: Uses Playwright for real browser testing
- **Comprehensive Logging**: Captures all console logs, network requests, and errors
- **HTML Reports**: Generates detailed HTML reports with analysis
- **JSON Data Export**: Exports structured data for further analysis
- **Video Recording**: Records the complete authentication flow
- **Screenshot Capture**: Takes screenshots at key points

## 📁 Files Created

### Test Files
- `tests/e2e/magic-link-comprehensive-debug.e2e.spec.ts` - Main test file
- `tests/e2e/helpers/magicLinkDebugger.ts` - Core debugging logic
- `tests/e2e/helpers/environmentValidator.ts` - Environment validation
- `tests/e2e/helpers/supabaseConfigAnalyzer.ts` - Supabase configuration analysis
- `tests/e2e/run-magic-link-comprehensive-debug.sh` - Test runner script

### Reports Generated
- `test-artifacts/magic-link-debug/magic-link-debug-*.json` - Structured test results
- `test-artifacts/magic-link-debug/magic-link-debug-*.html` - HTML analysis report
- `test-artifacts/magic-link-debug/playwright-report-*/` - Playwright HTML report
- `test-artifacts/magic-link-debug/videos-*/` - Video recordings
- `test-artifacts/magic-link-debug/screenshots-*/` - Screenshots

## 🚀 How to Use

### Prerequisites
1. **Application Running**: Ensure your app is running on `localhost:8080`
2. **Environment Variables**: All required environment variables must be set
3. **Dependencies**: Playwright must be installed

### Quick Start
```bash
# Make the script executable (if not already done)
chmod +x tests/e2e/run-magic-link-comprehensive-debug.sh

# Run the comprehensive debug test
./tests/e2e/run-magic-link-comprehensive-debug.sh
```

### Manual Execution
```bash
# Run the test directly with Playwright
npx playwright test tests/e2e/magic-link-comprehensive-debug.e2e.spec.ts \
  --reporter=html,line \
  --timeout=120000 \
  --video=on \
  --screenshot=on \
  --trace=on
```

## 📊 What the Tool Analyzes

### 1. Environment Configuration
- ✅ Required environment variables
- ✅ URL format validation
- ✅ Supabase configuration
- ✅ Admin email allowlist
- ✅ Email configuration

### 2. Supabase Configuration
- ✅ Project URL validation
- ✅ Redirect URL analysis
- ✅ Site URL validation
- ✅ Wildcard domain detection
- ✅ HTTPS protocol validation

### 3. Magic Link Flow
- ✅ Magic link generation
- ✅ URL analysis and validation
- ✅ Token extraction and validation
- ✅ Redirect chain tracking
- ✅ Session establishment

### 4. Authentication Flow
- ✅ Login page access
- ✅ Form validation
- ✅ API endpoint testing
- ✅ Session state verification
- ✅ Admin access validation

### 5. Network Analysis
- ✅ All HTTP requests and responses
- ✅ Failed request detection
- ✅ Redirect tracking
- ✅ Error response analysis
- ✅ Cookie handling

## 🔍 Expected Issues to Detect

### Critical Issues (Will Fail Test)
1. **Wildcard Domain Redirects**: `%2A.vercel.app` or `*.vercel.app`
2. **Missing Environment Variables**: Required Supabase configuration
3. **Invalid URL Formats**: Malformed Supabase or app URLs
4. **Authentication Failures**: Session establishment failures
5. **Network Errors**: Failed API requests

### Warning Issues (Will Show Warnings)
1. **Non-HTTPS URLs**: In production environments
2. **Localhost in Production**: Development URLs in production
3. **Missing Admin Emails**: Test email not in allowlist
4. **Configuration Mismatches**: Environment inconsistencies

## 📋 Sample Output

### Console Output
```
🔍 Magic Link Comprehensive Debug Test Runner
==============================================
Timestamp: 20250127_143022
Test File: tests/e2e/magic-link-comprehensive-debug.e2e.spec.ts
Reports Dir: test-artifacts/magic-link-debug

🔧 Checking environment variables...
✅ NEXT_PUBLIC_APP_URL is set
✅ NEXT_PUBLIC_SUPABASE_URL is set
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY is set
✅ SUPABASE_SERVICE_ROLE_KEY is set

🏥 Checking application health...
✅ Application is running on localhost:8080

🚀 Running comprehensive magic link debug test...
This may take several minutes to complete...

[Comprehensive Debug] 🚀 Starting comprehensive magic link analysis
[Comprehensive Debug] Environment: development
[Comprehensive Debug] App URL: http://localhost:8080
[Comprehensive Debug] Supabase URL: https://nuxahfrelvfvsmhzvxqm.supabase.co

✅ Comprehensive debug test completed successfully!

📊 Generating summary report...
✅ Found test results: test-artifacts/magic-link-debug/magic-link-debug-20250127_143022.json

📋 Test Summary:
Success: false
Final URL: https://%2A.vercel.app/auth/callback#access_token=...
Total Errors: 3
Total Warnings: 2

🚨 CRITICAL ISSUE DETECTED:
The magic link is redirecting to a wildcard domain!
This is the root cause of your authentication problem.

🔧 RECOMMENDED FIXES:
1. Update Supabase Site URL in your Supabase dashboard
2. Replace '*.vercel.app' with your actual domain
3. Update Redirect URLs to use your actual domain
4. Remove any wildcard (*) configurations
```

### HTML Report Features
- **Executive Summary**: High-level findings and recommendations
- **Step-by-Step Analysis**: Detailed breakdown of each test step
- **Error Analysis**: Comprehensive error listing with context
- **Network Requests**: Complete HTTP request/response log
- **Configuration Issues**: Specific configuration problems found
- **Recommendations**: Actionable fixes for each issue

## 🎯 Key Findings Expected

Based on your issue description, the tool will likely find:

### 1. Wildcard Domain Issue
```
❌ Magic link URL contains wildcard domain: %2A.vercel.app
❌ Redirect URL contains wildcard domain: *.vercel.app
```

### 2. Supabase Configuration Problems
```
❌ Site URL configured with wildcard: https://*.vercel.app
❌ Redirect URLs contain wildcard patterns
```

### 3. Authentication Flow Issues
```
❌ Final URL contains problematic domain: https://%2A.vercel.app/auth/callback
❌ User is not authenticated according to whoami endpoint
```

## 🔧 Recommended Fixes

### 1. Update Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **Authentication > Settings**
3. Update **Site URL** from `https://*.vercel.app` to your actual domain
4. Update **Redirect URLs** to remove wildcard patterns

### 2. Environment Configuration
1. Ensure `NEXT_PUBLIC_APP_URL` matches your actual domain
2. Verify `ADMIN_EMAILS` includes your test email
3. Check that all Supabase environment variables are correct

### 3. Test the Fix
1. Run the debug tool again after making changes
2. Verify that the final URL no longer contains `%2A` or `*.vercel.app`
3. Confirm successful authentication to admin dashboard

## 📈 Success Criteria

The test will be considered successful when:
- ✅ Final URL does not contain `%2A` or `*.vercel.app`
- ✅ User is authenticated according to whoami endpoint
- ✅ Final URL points to `/admin` or similar admin page
- ✅ No critical errors in the authentication flow
- ✅ Session cookies are properly set

## 🚨 Troubleshooting

### Common Issues

#### 1. Test Fails to Start
```bash
# Check if application is running
curl http://localhost:8080/api/health

# Check environment variables
echo $NEXT_PUBLIC_APP_URL
echo $NEXT_PUBLIC_SUPABASE_URL
```

#### 2. No Reports Generated
```bash
# Check if test artifacts directory exists
ls -la test-artifacts/magic-link-debug/

# Check Playwright installation
npx playwright --version
```

#### 3. Environment Variable Issues
```bash
# Load environment variables
source .env.local

# Or run with dotenv
npx dotenv -e .env.local -- ./tests/e2e/run-magic-link-comprehensive-debug.sh
```

## 📞 Support

If you encounter issues with the debugging tool:

1. **Check the generated reports** for detailed error information
2. **Review the console output** for immediate feedback
3. **Verify environment configuration** matches your setup
4. **Ensure the application is running** on the expected port

## 🎯 Next Steps

After running the tool:

1. **Review the HTML report** for comprehensive analysis
2. **Check the JSON report** for technical details
3. **Fix identified configuration issues** in Supabase dashboard
4. **Re-run the test** to verify fixes
5. **Test manual authentication** to confirm the issue is resolved

---

**This tool is designed to solve the exact issue you're experiencing. It will provide clear, actionable guidance to fix the magic link authentication problem.**
