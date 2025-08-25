#!/bin/bash

# Magic Link Comprehensive Debug Test Runner
# This script runs the comprehensive magic link authentication debugging tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_FILE="tests/e2e/magic-link-comprehensive-debug.e2e.spec.ts"
REPORTS_DIR="test-artifacts/magic-link-debug"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo -e "${BLUE}🔍 Magic Link Comprehensive Debug Test Runner${NC}"
echo -e "${BLUE}==============================================${NC}"
echo -e "${YELLOW}Timestamp:${NC} $TIMESTAMP"
echo -e "${YELLOW}Test File:${NC} $TEST_FILE"
echo -e "${YELLOW}Reports Dir:${NC} $REPORTS_DIR"
echo ""

# Check if test file exists
if [ ! -f "$TEST_FILE" ]; then
    echo -e "${RED}❌ Test file not found: $TEST_FILE${NC}"
    exit 1
fi

# Create reports directory
mkdir -p "$REPORTS_DIR"

# Check environment variables
echo -e "${BLUE}🔧 Checking environment variables...${NC}"
required_vars=(
    "NEXT_PUBLIC_APP_URL"
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    else
        echo -e "${GREEN}✅${NC} $var is set"
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    for var in "${missing_vars[@]}"; do
        echo -e "${RED}   - $var${NC}"
    done
    echo ""
    echo -e "${YELLOW}Please set the missing environment variables and try again.${NC}"
    exit 1
fi

echo ""

# Check if application is running
echo -e "${BLUE}🏥 Checking application health...${NC}"
if curl -s http://localhost:8080/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Application is running on localhost:8080${NC}"
else
    echo -e "${RED}❌ Application is not running on localhost:8080${NC}"
    echo -e "${YELLOW}Please start the application with: npm run dev${NC}"
    exit 1
fi

echo ""

# Run the comprehensive debug test
echo -e "${BLUE}🚀 Running comprehensive magic link debug test...${NC}"
echo -e "${YELLOW}This may take several minutes to complete...${NC}"
echo ""

# Set Playwright options for comprehensive testing
export PLAYWRIGHT_HTML_REPORT="$REPORTS_DIR/playwright-report-$TIMESTAMP"
export PLAYWRIGHT_VIDEO_DIR="$REPORTS_DIR/videos-$TIMESTAMP"
export PLAYWRIGHT_SCREENSHOTS_DIR="$REPORTS_DIR/screenshots-$TIMESTAMP"

# Run the test with detailed output
npx playwright test "$TEST_FILE" \
    --reporter=html,line \
    --timeout=120000 \
    --retries=1 \
    --workers=1 \
    --video=on \
    --screenshot=on \
    --trace=on \
    --project=chromium

# Check test exit status
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Comprehensive debug test completed successfully!${NC}"
else
    echo ""
    echo -e "${RED}❌ Comprehensive debug test failed!${NC}"
    echo -e "${YELLOW}Check the reports for detailed error information.${NC}"
fi

echo ""

# Generate summary report
echo -e "${BLUE}📊 Generating summary report...${NC}"

# Find the latest test results
LATEST_JSON=$(find "$REPORTS_DIR" -name "magic-link-debug-*.json" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -f2- -d" ")

if [ -n "$LATEST_JSON" ] && [ -f "$LATEST_JSON" ]; then
    echo -e "${GREEN}✅ Found test results: $LATEST_JSON${NC}"
    
    # Extract key information from the JSON report
    TOTAL_ERRORS=$(jq '.errors | length' "$LATEST_JSON" 2>/dev/null || echo "0")
    TOTAL_WARNINGS=$(jq '.warnings | length' "$LATEST_JSON" 2>/dev/null || echo "0")
    SUCCESS=$(jq '.success' "$LATEST_JSON" 2>/dev/null || echo "false")
    FINAL_URL=$(jq -r '.finalUrl' "$LATEST_JSON" 2>/dev/null || echo "unknown")
    
    echo ""
    echo -e "${BLUE}📋 Test Summary:${NC}"
    echo -e "${YELLOW}Success:${NC} $SUCCESS"
    echo -e "${YELLOW}Final URL:${NC} $FINAL_URL"
    echo -e "${YELLOW}Total Errors:${NC} $TOTAL_ERRORS"
    echo -e "${YELLOW}Total Warnings:${NC} $TOTAL_WARNINGS"
    
    # Check for specific issues
    if echo "$FINAL_URL" | grep -q "%2A\|*.vercel.app"; then
        echo ""
        echo -e "${RED}🚨 CRITICAL ISSUE DETECTED:${NC}"
        echo -e "${RED}The magic link is redirecting to a wildcard domain!${NC}"
        echo -e "${YELLOW}This is the root cause of your authentication problem.${NC}"
        echo ""
        echo -e "${BLUE}🔧 RECOMMENDED FIXES:${NC}"
        echo -e "${YELLOW}1.${NC} Update Supabase Site URL in your Supabase dashboard"
        echo -e "${YELLOW}2.${NC} Replace '*.vercel.app' with your actual domain"
        echo -e "${YELLOW}3.${NC} Update Redirect URLs to use your actual domain"
        echo -e "${YELLOW}4.${NC} Remove any wildcard (*) configurations"
    fi
    
    if [ "$TOTAL_ERRORS" -gt 0 ]; then
        echo ""
        echo -e "${RED}❌ Errors found:${NC}"
        jq -r '.errors[] | "  - " + .type + ": " + .message' "$LATEST_JSON" 2>/dev/null || echo "  - Unable to parse errors"
    fi
    
    if [ "$TOTAL_WARNINGS" -gt 0 ]; then
        echo ""
        echo -e "${YELLOW}⚠️  Warnings found:${NC}"
        jq -r '.warnings[] | "  - " + .type + ": " + .message' "$LATEST_JSON" 2>/dev/null || echo "  - Unable to parse warnings"
    fi
    
else
    echo -e "${RED}❌ No test results found${NC}"
fi

echo ""

# List all generated reports
echo -e "${BLUE}📁 Generated Reports:${NC}"
if [ -d "$REPORTS_DIR" ]; then
    find "$REPORTS_DIR" -type f -name "*$TIMESTAMP*" | while read -r file; do
        echo -e "${GREEN}  📄 $file${NC}"
    done
fi

echo ""
echo -e "${BLUE}🎯 Next Steps:${NC}"
echo -e "${YELLOW}1.${NC} Review the generated HTML report for detailed analysis"
echo -e "${YELLOW}2.${NC} Check the JSON report for technical details"
echo -e "${YELLOW}3.${NC} Fix any identified configuration issues"
echo -e "${YELLOW}4.${NC} Re-run the test after making changes"
echo ""

# Check for specific recommendations
if [ -n "$LATEST_JSON" ] && [ -f "$LATEST_JSON" ]; then
    RECOMMENDATIONS=$(jq -r '.analysis.recommendations[]?' "$LATEST_JSON" 2>/dev/null)
    if [ -n "$RECOMMENDATIONS" ]; then
        echo -e "${BLUE}💡 Recommendations:${NC}"
        echo "$RECOMMENDATIONS" | while read -r rec; do
            if [ -n "$rec" ]; then
                echo -e "${YELLOW}  • $rec${NC}"
            fi
        done
        echo ""
    fi
fi

echo -e "${GREEN}✅ Magic Link Comprehensive Debug Test Runner completed!${NC}"
echo -e "${BLUE}📊 Check the reports in: $REPORTS_DIR${NC}"
