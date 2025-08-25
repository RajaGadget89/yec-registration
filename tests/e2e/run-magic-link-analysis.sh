#!/bin/bash

# Magic Link Deep Analysis Test Runner
# This script runs the comprehensive magic link authentication analysis

set -e

echo "🚀 Magic Link Deep Analysis Test Runner"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if environment variables are set
echo "🔍 Checking environment configuration..."
if [ -z "$NEXT_PUBLIC_APP_URL" ]; then
    echo "❌ Error: NEXT_PUBLIC_APP_URL is not set"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ Error: NEXT_PUBLIC_SUPABASE_URL is not set"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY is not set"
    exit 1
fi

echo "✅ Environment variables are configured"
echo ""

# Create test artifacts directory
echo "📁 Creating test artifacts directory..."
mkdir -p test-artifacts/magic-link-analysis
echo "✅ Test artifacts directory created"
echo ""

# Check if the application is running
echo "🌐 Checking if application is running..."
if ! curl -s "http://localhost:8080/health" > /dev/null 2>&1; then
    echo "⚠️  Warning: Application may not be running on localhost:8080"
    echo "   Please ensure the application is started before running tests"
    echo ""
fi

# Run the comprehensive analysis
echo "🧪 Running Magic Link Deep Analysis..."
echo ""

# Set test timeout to 5 minutes
export PLAYWRIGHT_TEST_TIMEOUT=300000

# Run the specific test file
npx playwright test tests/e2e/magic-link-deep-analysis.e2e.spec.ts \
    --reporter=list \
    --timeout=300000 \
    --workers=1 \
    --project=chromium

echo ""
echo "📊 Analysis Complete!"
echo "===================="
echo ""

# Check if test artifacts were created
if [ -d "test-artifacts/magic-link-analysis" ]; then
    echo "📄 Test reports generated:"
    ls -la test-artifacts/magic-link-analysis/
    echo ""
    
    # Find the latest analysis report
    LATEST_REPORT=$(ls -t test-artifacts/magic-link-analysis/magic-link-analysis-*.json 2>/dev/null | head -1)
    
    if [ -n "$LATEST_REPORT" ]; then
        echo "📋 Latest Analysis Report: $LATEST_REPORT"
        echo ""
        
        # Show summary from the report
        if command -v jq >/dev/null 2>&1; then
            echo "📈 Summary:"
            jq -r '.summary | "Success: \(.success)\nTotal Errors: \(.totalErrors)\nTotal Warnings: \(.totalWarnings)\nCritical Issues: \(.criticalIssues)"' "$LATEST_REPORT" 2>/dev/null || echo "Could not parse report summary"
            echo ""
            
            # Show recommendations
            echo "💡 Recommendations:"
            jq -r '.recommendations[]' "$LATEST_REPORT" 2>/dev/null || echo "No recommendations found"
            echo ""
        else
            echo "💡 Install 'jq' to view detailed report analysis"
            echo "   brew install jq (macOS) or apt-get install jq (Ubuntu)"
            echo ""
        fi
    fi
fi

echo "🎯 Next Steps:"
echo "1. Review the generated reports in test-artifacts/magic-link-analysis/"
echo "2. Check the console output above for immediate issues"
echo "3. Implement the recommended fixes"
echo "4. Re-run the analysis to verify the fixes"
echo ""

echo "✅ Magic Link Deep Analysis completed!"
echo ""

# Exit with success
exit 0
