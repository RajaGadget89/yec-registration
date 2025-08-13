#!/bin/bash

# Audit Schema Debug Script
# This script runs comprehensive tests to diagnose audit schema issues

echo "🔍 AUDIT SCHEMA DEBUG SCRIPT"
echo "=============================="
echo ""

# Check if the application is running
echo "1. Checking application connectivity..."
if curl -s http://localhost:8080 > /dev/null; then
    echo "✅ Application is running on localhost:8080"
else
    echo "❌ Application is not running on localhost:8080"
    echo "   Please start the application with: npm run dev"
    exit 1
fi

echo ""
echo "2. Testing audit schema diagnostic endpoint..."
DIAG_RESPONSE=$(curl -s http://localhost:8080/api/diag/audit-schema-test)
echo "Response: $DIAG_RESPONSE"

# Parse the JSON response
TABLES_ACCESS=$(echo $DIAG_RESPONSE | grep -o '"access_log":[^,]*' | cut -d':' -f2)
TABLES_EVENT=$(echo $DIAG_RESPONSE | grep -o '"event_log":[^,]*' | cut -d':' -f2)
INSERT_TEST=$(echo $DIAG_RESPONSE | grep -o '"insert_test":[^,}]*' | cut -d':' -f2)

echo "   Access Log Table Accessible: $TABLES_ACCESS"
echo "   Event Log Table Accessible: $TABLES_EVENT"
echo "   Insert Test Successful: $INSERT_TEST"

echo ""
echo "3. Testing audit smoke endpoint..."
SMOKE_RESPONSE=$(curl -s -H "X-Request-ID: debug-script-$(date +%s)" http://localhost:8080/api/diag/audit-smoke)
echo "Response: $SMOKE_RESPONSE"

echo ""
echo "4. Running Playwright debug tests..."
echo "   This will run comprehensive E2E tests to diagnose the issue..."
echo ""

# Run the Playwright tests
npx playwright test tests/e2e/audit-schema-debug.e2e.spec.ts --reporter=list

echo ""
echo "5. SUMMARY AND RECOMMENDATIONS"
echo "=============================="

if [[ "$TABLES_ACCESS" == "false" ]] || [[ "$TABLES_EVENT" == "false" ]]; then
    echo "❌ ISSUE IDENTIFIED: Audit tables are not accessible"
    echo ""
    echo "🔧 RECOMMENDED FIXES:"
    echo "   1. Run the complete setup script in Supabase SQL Editor:"
    echo "      - Copy the script from docs/AUDIT_TROUBLESHOOTING.md"
    echo "      - Execute it in Supabase SQL Editor"
    echo ""
    echo "   2. Check environment variables:"
    echo "      - Ensure SUPABASE_SERVICE_ROLE_KEY is set correctly"
    echo "      - Verify NEXT_PUBLIC_SUPABASE_URL is correct"
    echo ""
    echo "   3. Restart the development server:"
    echo "      - Stop the current server (Ctrl+C)"
    echo "      - Run: npm run dev"
    echo ""
    echo "   4. Test again:"
    echo "      - Run: ./scripts/run-audit-debug.sh"
else
    echo "✅ Audit tables appear to be accessible"
    echo "   If you're still seeing issues, check the Playwright test output above"
fi

echo ""
echo "📚 ADDITIONAL RESOURCES:"
echo "   - docs/AUDIT_TROUBLESHOOTING.md - Complete troubleshooting guide"
echo "   - docs/AUDIT_SETUP_GUIDE.md - Setup instructions"
echo "   - scripts/test-audit-schema-access.sql - SQL verification script"
echo ""
echo "🔍 For detailed debugging, check the Playwright test output above."
