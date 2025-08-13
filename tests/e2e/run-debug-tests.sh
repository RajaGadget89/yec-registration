#!/bin/bash

# Authentication Callback Debug Test Runner
# Based on Ishikawa Diagram Analysis
# 
# This script runs comprehensive tests to identify the exact failure point
# in the authentication callback flow that's causing:
# - [callback] server error: {}
# - [callback] could not parse error response as JSON

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_FILE="tests/e2e/auth-callback-debug.spec.ts"
BROWSERS=("chromium" "firefox" "webkit")
TIMEOUT=30000

echo -e "${BLUE}🔍 Authentication Callback Debug Test Suite${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Function to print section headers
print_section() {
    echo -e "${YELLOW}$1${NC}"
    echo "----------------------------------------"
}

# Function to check if application is running
check_app_running() {
    print_section "Checking Application Status"
    
    if curl -s http://localhost:8080/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Application is running on localhost:8080${NC}"
    else
        echo -e "${RED}❌ Application is not running on localhost:8080${NC}"
        echo -e "${YELLOW}Please start the application first:${NC}"
        echo "  npm run dev"
        echo "  or"
        echo "  docker-compose -f docker-compose.dev.yml up"
        exit 1
    fi
    echo ""
}

# Function to run tests for a specific browser
run_browser_tests() {
    local browser=$1
    local test_suite=$2
    
    print_section "Running $test_suite tests in $browser"
    
    echo -e "${BLUE}Running: npx playwright test $TEST_FILE --project=$browser --grep="$test_suite"${NC}"
    
    if npx playwright test "$TEST_FILE" --project="$browser" --grep="$test_suite" --timeout="$TIMEOUT"; then
        echo -e "${GREEN}✅ $test_suite tests passed in $browser${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_suite tests failed in $browser${NC}"
        return 1
    fi
}

# Function to run all tests for a browser
run_all_browser_tests() {
    local browser=$1
    local failed=0
    
    print_section "Running all debug tests in $browser"
    
    echo -e "${BLUE}Running: npx playwright test $TEST_FILE --project=$browser${NC}"
    
    if npx playwright test "$TEST_FILE" --project="$browser" --timeout="$TIMEOUT"; then
        echo -e "${GREEN}✅ All tests passed in $browser${NC}"
    else
        echo -e "${RED}❌ Some tests failed in $browser${NC}"
        failed=1
    fi
    
    return $failed
}

# Function to run specific test suites
run_test_suites() {
    local browser=$1
    local total_failed=0
    
    # Test Suite 1: URL Hash Token Extraction
    if ! run_browser_tests "$browser" "URL Hash Token Extraction"; then
        total_failed=$((total_failed + 1))
    fi
    
    # Test Suite 2: API Response Handling
    if ! run_browser_tests "$browser" "API Response Handling"; then
        total_failed=$((total_failed + 1))
    fi
    
    # Test Suite 3: Supabase Token Verification
    if ! run_browser_tests "$browser" "Supabase Token Verification"; then
        total_failed=$((total_failed + 1))
    fi
    
    # Test Suite 4: Cookie Management
    if ! run_browser_tests "$browser" "Cookie Management"; then
        total_failed=$((total_failed + 1))
    fi
    
    # Test Suite 5: End-to-End Flow
    if ! run_browser_tests "$browser" "End-to-End Flow"; then
        total_failed=$((total_failed + 1))
    fi
    
    # Test Suite 6: Debug Specific Issues
    if ! run_browser_tests "$browser" "Debug Specific Issues"; then
        total_failed=$((total_failed + 1))
    fi
    
    return $total_failed
}

# Function to generate test report
generate_report() {
    print_section "Generating Test Report"
    
    local report_file="test-results/debug-test-report-$(date +%Y%m%d-%H%M%S).md"
    mkdir -p test-results
    
    cat > "$report_file" << EOF
# Authentication Callback Debug Test Report
Generated: $(date)

## Test Summary
- **Test File**: $TEST_FILE
- **Browsers Tested**: ${BROWSERS[*]}
- **Total Test Suites**: 6
- **Test Categories**: URL Hash, API Response, Supabase, Cookies, E2E, Debug

## Ishikawa Analysis Categories Tested

### 1. Client-Side Issues
- ✅ URL Hash Token Extraction
- ✅ Browser/JavaScript Response Handling
- ✅ Token Processing and Validation

### 2. Server-Side Issues
- ✅ API Route Response Format
- ✅ Supabase Token Verification
- ✅ Cookie Management and Settings

### 3. Network/Infrastructure Issues
- ✅ CORS and Headers
- ✅ Redirect Handling (303)
- ✅ Content-Type Validation

## Test Results
EOF
    
    echo -e "${GREEN}📊 Test report generated: $report_file${NC}"
    echo ""
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -b, --browser BROWSER    Run tests in specific browser (chromium, firefox, webkit)"
    echo "  -s, --suite SUITE        Run specific test suite"
    echo "  -a, --all                Run all tests in all browsers"
    echo "  -d, --debug              Run with debug output"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Test Suites:"
    echo "  - URL Hash Token Extraction"
    echo "  - API Response Handling"
    echo "  - Supabase Token Verification"
    echo "  - Cookie Management"
    echo "  - End-to-End Flow"
    echo "  - Debug Specific Issues"
    echo ""
    echo "Examples:"
    echo "  $0 -b chromium -s 'URL Hash Token Extraction'"
    echo "  $0 -a"
    echo "  $0 -b firefox"
}

# Main execution
main() {
    local browser=""
    local suite=""
    local run_all=false
    local debug_mode=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -b|--browser)
                browser="$2"
                shift 2
                ;;
            -s|--suite)
                suite="$2"
                shift 2
                ;;
            -a|--all)
                run_all=true
                shift
                ;;
            -d|--debug)
                debug_mode=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                echo -e "${RED}Unknown option: $1${NC}"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Check if application is running
    check_app_running
    
    # Set debug mode if requested
    if [ "$debug_mode" = true ]; then
        export DEBUG=pw:api
        echo -e "${YELLOW}🔧 Debug mode enabled${NC}"
        echo ""
    fi
    
    # Run tests based on options
    if [ "$run_all" = true ]; then
        print_section "Running All Debug Tests"
        local total_failed=0
        
        for browser in "${BROWSERS[@]}"; do
            echo -e "${BLUE}Testing in $browser...${NC}"
            if ! run_all_browser_tests "$browser"; then
                total_failed=$((total_failed + 1))
            fi
            echo ""
        done
        
        if [ $total_failed -eq 0 ]; then
            echo -e "${GREEN}🎉 All tests passed across all browsers!${NC}"
        else
            echo -e "${RED}❌ $total_failed browser(s) had test failures${NC}"
        fi
        
    elif [ -n "$browser" ] && [ -n "$suite" ]; then
        # Run specific suite in specific browser
        run_browser_tests "$browser" "$suite"
        
    elif [ -n "$browser" ]; then
        # Run all suites in specific browser
        run_test_suites "$browser"
        
    elif [ -n "$suite" ]; then
        # Run specific suite in all browsers
        print_section "Running '$suite' in all browsers"
        local total_failed=0
        
        for browser in "${BROWSERS[@]}"; do
            if ! run_browser_tests "$browser" "$suite"; then
                total_failed=$((total_failed + 1))
            fi
        done
        
        if [ $total_failed -eq 0 ]; then
            echo -e "${GREEN}🎉 '$suite' tests passed in all browsers!${NC}"
        else
            echo -e "${RED}❌ '$suite' tests failed in $total_failed browser(s)${NC}"
        fi
        
    else
        # Default: run all tests in chromium
        echo -e "${YELLOW}No specific options provided. Running all tests in chromium...${NC}"
        echo ""
        run_all_browser_tests "chromium"
    fi
    
    # Generate test report
    generate_report
    
    print_section "Test Execution Complete"
    echo -e "${BLUE}📋 Check the test results above for any failures${NC}"
    echo -e "${BLUE}📊 Review the generated test report for detailed analysis${NC}"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Review any failed tests to identify the root cause"
    echo "2. Check the console output for specific error messages"
    echo "3. Use the Ishikawa analysis to focus on the failing component"
    echo "4. Implement fixes based on test results"
    echo ""
}

# Run main function with all arguments
main "$@"
