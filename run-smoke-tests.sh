#!/bin/bash

# API Smoke Test Runner
# Runs the smoke suite with auto-login, auto-REG_ID discovery, and one-click execution

set -e

echo "🚀 Starting API Smoke Tests..."

# Check required environment variables
if [ -z "$NEXT_PUBLIC_APP_URL" ]; then
  echo "❌ NEXT_PUBLIC_APP_URL is required"
  exit 1
fi

if [ -z "$E2E_TEST_MODE" ]; then
  echo "❌ E2E_TEST_MODE must be set to 'true'"
  exit 1
fi

if [ -z "$TEST_HELPERS_ENABLED" ]; then
  echo "❌ TEST_HELPERS_ENABLED must be set to '1'"
  exit 1
fi

if [ -z "$E2E_AUTH_SECRET" ]; then
  echo "❌ E2E_AUTH_SECRET is required"
  exit 1
fi

# Check for required test actor emails
if [ -z "$SUPER_ADMIN_EMAIL" ]; then
  echo "❌ SUPER_ADMIN_EMAIL is required"
  exit 1
fi

if [ -z "$PAYMENT_ONLY_EMAIL" ]; then
  echo "❌ PAYMENT_ONLY_EMAIL is required"
  exit 1
fi

if [ -z "$TCC_ONLY_EMAIL" ]; then
  echo "❌ TCC_ONLY_EMAIL is required"
  exit 1
fi

echo "✅ Environment variables validated"

# Create artifacts directory
ARTIFACTS_DIR="artifacts/api-smoke-auth/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$ARTIFACTS_DIR"

echo "📁 Artifacts will be saved to: $ARTIFACTS_DIR"

# Run the smoke tests
echo "🧪 Running smoke tests..."
npx playwright test e2e/smoke.api.enforcement.spec.ts \
  --config=playwright.smoke.config.ts \
  --reporter=line \
  --output-dir="$ARTIFACTS_DIR" \
  --reporter=html \
  --reporter=json

# Generate summary
echo "📊 Generating test summary..."
cat > "$ARTIFACTS_DIR/summary.md" << EOF
# API Smoke Test Results

**Date**: $(date)
**Environment**: $NEXT_PUBLIC_APP_URL
**Test Mode**: $E2E_TEST_MODE
**Helpers Enabled**: $TEST_HELPERS_ENABLED

## Test Actors
- **Super Admin**: $SUPER_ADMIN_EMAIL
- **Payment Only**: $PAYMENT_ONLY_EMAIL  
- **TCC Only**: $TCC_ONLY_EMAIL

## Test Coverage
- ✅ Auto-login for all 3 actors
- ✅ Auto-REG_ID discovery/seeding
- ✅ RBAC enforcement checks
- ✅ In-scope vs out-of-scope validation

## Results
See HTML report: \`$ARTIFACTS_DIR/playwright-report/index.html\`
See JSON results: \`$ARTIFACTS_DIR/results.json\`

## Environment Requirements
- \`FEATURES_ADMIN_MANAGEMENT=true\`
- \`FEATURES_ADMIN_JOB_ASSIGNMENT=true\`
- \`E2E_TEST_MODE=true\`
- \`TEST_HELPERS_ENABLED=1\`
- \`E2E_AUTH_SECRET=<same as server>\`
EOF

echo "✅ Smoke tests completed!"
echo "📁 Results saved to: $ARTIFACTS_DIR"
echo "🌐 Open HTML report: $ARTIFACTS_DIR/playwright-report/index.html"