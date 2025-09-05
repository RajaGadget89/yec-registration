#!/bin/bash

echo "🔍 Starting Deep Authentication Diagnosis"
echo "========================================="
echo ""

# Check if the dev server is running
echo "📝 Checking if dev server is running..."
if curl -s http://localhost:8080 > /dev/null; then
    echo "✅ Dev server is running on localhost:8080"
else
    echo "❌ Dev server is not running. Please start it with 'npm run dev'"
    exit 1
fi

echo ""
echo "🧪 Running Playwright authentication diagnosis test..."
echo "This will capture detailed logs, network requests, and DOM state"
echo ""

# Run the diagnosis test
npx playwright test --config=playwright.auth-diagnosis.config.ts --headed

echo ""
echo "📊 Diagnosis complete!"
echo "Check the following for results:"
echo "- playwright-report-auth-diagnosis/index.html (HTML report)"
echo "- playwright-report-auth-diagnosis/results.json (JSON results)"
echo "- playwright-report-auth-diagnosis/auth-diagnosis-final.png (Screenshot)"
echo ""

echo "🎯 Next steps:"
echo "1. Review the HTML report for detailed logs"
echo "2. Check the screenshot to see the final UI state"
echo "3. Analyze the network requests and API responses"
echo "4. Look for authentication flow issues"
echo ""
