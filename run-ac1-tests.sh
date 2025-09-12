#!/bin/bash

# AC1 Test Runner - Two-Track Approach
# Supports both default testing and optional real email verification

set -e

echo "=== AC1 Registration Test Runner ==="
echo ""

# Check if real email verification is requested
if [ -n "$TEST_REAL_EMAIL" ]; then
    echo "🔍 Real Email Verification Mode"
    echo "   Email: $TEST_REAL_EMAIL"
    echo "   ⚠️  Ensure environment is configured for LIVE email sending"
    echo "   ⚠️  Check spam folder if email doesn't arrive"
    echo ""
else
    echo "🧪 Standard Test Mode (no real emails)"
    echo "   Set TEST_REAL_EMAIL=your@email.com for real email verification"
    echo ""
fi

# Run AC1 tests with appropriate configuration
echo "Running AC1 tests..."
echo ""

if [ -n "$TEST_REAL_EMAIL" ]; then
    # Real email mode - run with single worker for stability
    TEST_REAL_EMAIL="$TEST_REAL_EMAIL" \
    npx playwright test tests/e2e/ac1_registration.spec.ts \
        --config=playwright.e2e.config.ts \
        --reporter=line \
        --workers=1
else
    # Standard mode
    npx playwright test tests/e2e/ac1_registration.spec.ts \
        --config=playwright.e2e.config.ts \
        --reporter=line \
        --workers=1
fi

echo ""
echo "✅ AC1 tests completed!"
echo ""
echo "📁 Check artifacts/AC1/ directory for evidence:"
echo "   - Screenshots of form interactions"
echo "   - JSON payloads and verification results"
echo "   - System truth validation data"
echo ""

if [ -n "$TEST_REAL_EMAIL" ]; then
    echo "📧 Real email verification:"
    echo "   - Check inbox for: $TEST_REAL_EMAIL"
    echo "   - Look for registration confirmation email"
    echo "   - Check spam folder if not found"
    echo ""
fi
