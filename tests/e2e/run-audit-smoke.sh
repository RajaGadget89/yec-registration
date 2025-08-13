#!/bin/bash

# Audit Smoke Test Runner
# Runs minimal Playwright E2E tests to validate audit plumbing end-to-end

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Audit Smoke Tests${NC}"
echo "=================================="

# Check required environment variables
REQUIRED_VARS=("BASE_URL" "SUPABASE_URL" "SUPABASE_SERVICE_ROLE_KEY")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING_VARS+=("$var")
  fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
  echo -e "${RED}❌ Missing required environment variables:${NC}"
  for var in "${MISSING_VARS[@]}"; do
    echo "   - $var"
  done
  echo ""
  echo "Please set these variables and try again."
  exit 1
fi

echo -e "${GREEN}✅ Environment variables verified${NC}"
echo "   BASE_URL: $BASE_URL"
echo "   SUPABASE_URL: $SUPABASE_URL"
echo "   SUPABASE_SERVICE_ROLE_KEY: [HIDDEN]"
echo ""

# Check if Playwright is installed
if ! command -v npx &> /dev/null; then
  echo -e "${RED}❌ npx not found. Please install Node.js and npm.${NC}"
  exit 1
fi

# Check if the application is running
echo -e "${YELLOW}🔍 Checking if application is running...${NC}"
if ! curl -s --max-time 5 "$BASE_URL/api/health" > /dev/null; then
  echo -e "${RED}❌ Application not responding at $BASE_URL${NC}"
  echo "   Please start the application and try again."
  exit 1
fi

echo -e "${GREEN}✅ Application is running${NC}"
echo ""

# Run the smoke tests
echo -e "${BLUE}🧪 Running Audit Smoke Tests...${NC}"
echo ""

# Run tests with detailed output
npx playwright test tests/e2e/audit-smoke.spec.ts \
  --grep "@audit-smoke" \
  --reporter=list \
  --timeout=60000 \
  --workers=1

# Capture exit code
EXIT_CODE=$?

echo ""
echo "=================================="

if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}🎉 Audit Smoke Tests PASSED!${NC}"
  echo ""
  echo "✅ All audit plumbing validation passed:"
  echo "   - API responses include x-request-id"
  echo "   - Access logs written to audit.access_log"
  echo "   - Event logs written to audit.event_log"
  echo "   - Correlation chain integrity verified"
  echo ""
  echo "🚀 Audit system is working correctly!"
else
  echo -e "${RED}❌ Audit Smoke Tests FAILED${NC}"
  echo ""
  echo "Please check:"
  echo "   - Application is running and accessible"
  echo "   - Supabase RPC functions exist (log_access, log_event)"
  echo "   - Environment variables are correctly set"
  echo "   - Network connectivity to Supabase"
  echo ""
  echo "For debugging, run:"
  echo "   npx playwright test tests/e2e/audit-smoke.spec.ts --debug"
fi

exit $EXIT_CODE
