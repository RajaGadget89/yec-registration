#!/bin/bash

echo "🔍 Starting Standalone Authentication Diagnosis"
echo "=============================================="
echo ""

echo "📝 This will start the dev server and run the diagnosis test"
echo ""

# Start the dev server in the background
echo "🚀 Starting dev server..."
npm run dev &
DEV_PID=$!

# Wait for the server to start
echo "⏳ Waiting for dev server to start..."
for i in {1..30}; do
    if curl -s http://localhost:8080 > /dev/null; then
        echo "✅ Dev server is running on localhost:8080"
        break
    fi
    echo "⏳ Waiting... ($i/30)"
    sleep 2
done

if ! curl -s http://localhost:8080 > /dev/null; then
    echo "❌ Dev server failed to start"
    kill $DEV_PID 2>/dev/null
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

# Stop the dev server
echo "🛑 Stopping dev server..."
kill $DEV_PID 2>/dev/null

echo ""
echo "🎯 Next steps:"
echo "1. Review the HTML report for detailed logs"
echo "2. Check the screenshot to see the final UI state"
echo "3. Analyze the network requests and API responses"
echo "4. Look for authentication flow issues"
echo ""
