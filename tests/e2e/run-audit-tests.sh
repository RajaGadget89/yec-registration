#!/bin/bash

# Audit E2E Test Runner
# Runs comprehensive audit logging tests with proper environment setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[AUDIT TESTS]${NC} $1"
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

# Function to check if required environment variables are set
check_environment() {
    print_status "Checking environment configuration..."
    
    local missing_vars=()
    
    # Check required environment variables
    if [ -z "$SUPABASE_URL" ] && [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        missing_vars+=("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL")
    fi
    
    if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        missing_vars+=("SUPABASE_SERVICE_ROLE_KEY")
    fi
    
    if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
        missing_vars+=("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    fi
    
    if [ -z "$NEXT_PUBLIC_APP_URL" ]; then
        missing_vars+=("NEXT_PUBLIC_APP_URL")
    fi
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        echo ""
        echo "Please set these variables in your environment or .env.local file"
        echo "See env.template for reference"
        exit 1
    fi
    
    print_success "Environment configuration validated"
}

# Function to check if the application is running
check_app_running() {
    print_status "Checking if application is running..."
    
    local app_url="${NEXT_PUBLIC_APP_URL:-http://localhost:8080}"
    local health_url="$app_url/api/health"
    
    if curl -s "$health_url" > /dev/null 2>&1; then
        print_success "Application is running at $app_url"
    else
        print_warning "Application does not appear to be running at $app_url"
        print_warning "Make sure to start the development server with: npm run dev"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Function to run audit tests
run_audit_tests() {
    local test_filter="${1:-@audit}"
    local browser="${2:-chromium}"
    
    print_status "Running audit tests with filter: $test_filter"
    print_status "Browser: $browser"
    
    # Set test-specific environment variables
    export TEST_DATA_PREFIX="audit-test-$(date +%s)"
    export TEST_TIMEOUT_MS="60000"
    
    # Run Playwright tests
    npx playwright test \
        --project="$browser" \
        --grep="$test_filter" \
        --reporter=html \
        --timeout=60000 \
        --retries=1
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        print_success "Audit tests completed successfully"
    else
        print_error "Audit tests failed with exit code $exit_code"
    fi
    
    return $exit_code
}

# Function to run specific test scenarios
run_specific_tests() {
    local scenario="$1"
    local browser="${2:-chromium}"
    
    case "$scenario" in
        "smoke")
            print_status "Running smoke tests..."
            run_audit_tests "@audit smoke" "$browser"
            ;;
        "registration")
            print_status "Running registration tests..."
            run_audit_tests "@audit registration" "$browser"
            ;;
        "sendback")
            print_status "Running send-back tests..."
            run_audit_tests "@audit sendback" "$browser"
            ;;
        "approve")
            print_status "Running approval tests..."
            run_audit_tests "@audit approve" "$browser"
            ;;
        "comprehensive")
            print_status "Running comprehensive tests..."
            run_audit_tests "@audit comprehensive" "$browser"
            ;;
        "all")
            print_status "Running all audit tests..."
            run_audit_tests "@audit" "$browser"
            ;;
        *)
            print_error "Unknown test scenario: $scenario"
            echo "Available scenarios: smoke, registration, sendback, approve, comprehensive, all"
            exit 1
            ;;
    esac
}

# Function to show test results
show_results() {
    print_status "Test results available at:"
    echo "  - HTML Report: playwright-report/index.html"
    echo "  - Test Results: test-results/"
    echo ""
    print_status "To view the HTML report:"
    echo "  npx playwright show-report"
}

# Function to clean up test data
cleanup_test_data() {
    print_status "Cleaning up test data..."
    
    # This would typically involve calling a cleanup script
    # For now, we'll just log that cleanup should be done manually
    print_warning "Test data cleanup should be done manually in Supabase"
    print_warning "Look for records with prefix: $TEST_DATA_PREFIX"
}

# Main execution
main() {
    echo "=========================================="
    echo "  YEC Registration - Audit E2E Test Runner"
    echo "=========================================="
    echo ""
    
    # Parse command line arguments
    local scenario="all"
    local browser="chromium"
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -s|--scenario)
                scenario="$2"
                shift 2
                ;;
            -b|--browser)
                browser="$2"
                shift 2
                ;;
            -h|--help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  -s, --scenario SCENARIO  Test scenario to run"
                echo "                           (smoke, registration, sendback, approve, comprehensive, all)"
                echo "  -b, --browser BROWSER    Browser to use (chromium, firefox, webkit)"
                echo "  -h, --help              Show this help message"
                echo ""
                echo "Examples:"
                echo "  $0                                    # Run all audit tests"
                echo "  $0 -s smoke                          # Run smoke tests only"
                echo "  $0 -s registration -b firefox        # Run registration tests in Firefox"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Check environment and application
    check_environment
    check_app_running
    
    # Run tests
    run_specific_tests "$scenario" "$browser"
    local test_exit_code=$?
    
    # Show results
    show_results
    
    # Cleanup
    cleanup_test_data
    
    echo ""
    if [ $test_exit_code -eq 0 ]; then
        print_success "All audit tests completed successfully!"
    else
        print_error "Some audit tests failed. Check the reports for details."
    fi
    
    exit $test_exit_code
}

# Run main function with all arguments
main "$@"
