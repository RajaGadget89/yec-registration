#!/bin/bash

# Comprehensive Authentication Test Runner
# This script runs all authentication tests across different browsers and configurations

set -e

echo "🧪 Starting Comprehensive Authentication Tests"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Playwright is installed
if ! command -v npx playwright &> /dev/null; then
    print_error "Playwright not found. Please install it first:"
    echo "npm install -D @playwright/test"
    echo "npx playwright install"
    exit 1
fi

# Check if the app is running
print_status "Checking if the application is running..."
if ! curl -s http://localhost:8080 > /dev/null; then
    print_warning "Application not running on localhost:8080"
    print_status "Please start the application first:"
    echo "npm run dev"
    echo ""
    read -p "Press Enter to continue anyway, or Ctrl+C to stop..."
fi

# Create test results directory
TEST_RESULTS_DIR="test-results/auth-comprehensive-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$TEST_RESULTS_DIR"

print_status "Test results will be saved to: $TEST_RESULTS_DIR"

# Function to run tests for a specific browser
run_browser_tests() {
    local browser=$1
    local test_file=$2
    local output_file="$TEST_RESULTS_DIR/${browser}-results.txt"
    
    print_status "Running tests for $browser..."
    
    npx playwright test "$test_file" \
        --project="$browser" \
        --reporter=list,html \
        --output-dir="$TEST_RESULTS_DIR/$browser" \
        > "$output_file" 2>&1
    
    if [ $? -eq 0 ]; then
        print_success "$browser tests completed successfully"
    else
        print_error "$browser tests failed. Check $output_file for details"
    fi
    
    echo ""
}

# Function to run specific test suites
run_test_suite() {
    local suite_name=$1
    local test_pattern=$2
    
    print_status "Running $suite_name tests..."
    
    npx playwright test "$test_pattern" \
        --reporter=list,html \
        --output-dir="$TEST_RESULTS_DIR/$suite_name" \
        --project=chromium
    
    if [ $? -eq 0 ]; then
        print_success "$suite_name tests completed successfully"
    else
        print_error "$suite_name tests failed"
    fi
    
    echo ""
}

# Main test execution
echo ""
print_status "Starting comprehensive authentication test suite..."

# Run tests for each browser
run_browser_tests "chromium" "tests/e2e/auth-comprehensive.spec.ts"
run_browser_tests "firefox" "tests/e2e/auth-comprehensive.spec.ts"
run_browser_tests "webkit" "tests/e2e/auth-comprehensive.spec.ts"

# Run specific test suites
echo ""
print_status "Running specific test suites..."

# Magic Link Flow Tests
run_test_suite "magic-link-flow" "tests/e2e/auth-comprehensive.spec.ts --grep 'Magic Link Authentication Flow'"

# Cookie Management Tests
run_test_suite "cookie-management" "tests/e2e/auth-comprehensive.spec.ts --grep 'Cookie Management'"

# Access Control Tests
run_test_suite "access-control" "tests/e2e/auth-comprehensive.spec.ts --grep 'Admin Dashboard Access Control'"

# Error Handling Tests
run_test_suite "error-handling" "tests/e2e/auth-comprehensive.spec.ts --grep 'Error Handling'"

# Security Tests
run_test_suite "security" "tests/e2e/auth-comprehensive.spec.ts --grep 'Security Tests'"

# Generate summary report
echo ""
print_status "Generating test summary..."

SUMMARY_FILE="$TEST_RESULTS_DIR/test-summary.md"
cat > "$SUMMARY_FILE" << EOF
# Authentication Test Summary
Generated: $(date)

## Test Configuration
- Application URL: http://localhost:8080
- Test Framework: Playwright
- Browsers Tested: Chromium, Firefox, WebKit

## Test Results

### Cross-Browser Compatibility
- Chromium: $(grep -c "SUCCESS" "$TEST_RESULTS_DIR/chromium-results.txt" 2>/dev/null || echo "N/A") tests passed
- Firefox: $(grep -c "SUCCESS" "$TEST_RESULTS_DIR/firefox-results.txt" 2>/dev/null || echo "N/A") tests passed  
- WebKit: $(grep -c "SUCCESS" "$TEST_RESULTS_DIR/webkit-results.txt" 2>/dev/null || echo "N/A") tests passed

### Test Suites
- Magic Link Flow: $(find "$TEST_RESULTS_DIR/magic-link-flow" -name "*.html" 2>/dev/null | wc -l) reports generated
- Cookie Management: $(find "$TEST_RESULTS_DIR/cookie-management" -name "*.html" 2>/dev/null | wc -l) reports generated
- Access Control: $(find "$TEST_RESULTS_DIR/access-control" -name "*.html" 2>/dev/null | wc -l) reports generated
- Error Handling: $(find "$TEST_RESULTS_DIR/error-handling" -name "*.html" 2>/dev/null | wc -l) reports generated
- Security: $(find "$TEST_RESULTS_DIR/security" -name "*.html" 2>/dev/null | wc -l) reports generated

## Issues Found
$(find "$TEST_RESULTS_DIR" -name "*.txt" -exec grep -l "ERROR\|FAIL" {} \; | head -5 | while read file; do
    echo "- $(basename "$file"): $(grep -c "ERROR\|FAIL" "$file") issues"
done)

## Recommendations
1. Review any failed tests in the detailed reports
2. Check browser-specific issues in individual browser result files
3. Verify cookie settings match expected security requirements
4. Ensure error handling works consistently across all browsers

## Next Steps
1. Fix any identified issues
2. Re-run tests to verify fixes
3. Consider adding more edge case tests
4. Update test documentation as needed
EOF

print_success "Test summary generated: $SUMMARY_FILE"

# Show quick stats
echo ""
print_status "Quick Statistics:"
echo "==================="
echo "Total test result files: $(find "$TEST_RESULTS_DIR" -name "*.txt" | wc -l)"
echo "Total HTML reports: $(find "$TEST_RESULTS_DIR" -name "*.html" | wc -l)"
echo "Total errors found: $(find "$TEST_RESULTS_DIR" -name "*.txt" -exec grep -c "ERROR\|FAIL" {} \; | awk '{sum+=$1} END {print sum}')"

echo ""
print_success "Comprehensive authentication tests completed!"
print_status "Check the test results in: $TEST_RESULTS_DIR"
print_status "Open the HTML reports to see detailed results:"
echo "open $TEST_RESULTS_DIR/chromium/report.html"
echo "open $TEST_RESULTS_DIR/firefox/report.html" 
echo "open $TEST_RESULTS_DIR/webkit/report.html"
