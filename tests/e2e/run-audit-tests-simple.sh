#!/bin/bash

# Simple Audit E2E Test Runner
# Runs audit tests with @audit tag as specified in requirements

set -e

echo "=========================================="
echo "  Running Audit E2E Tests (@audit tag)"
echo "=========================================="
echo ""

# Check if required environment variables are set
if [ -z "$SUPABASE_URL" ] && [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ Error: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY is required"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "❌ Error: NEXT_PUBLIC_SUPABASE_ANON_KEY is required"
    exit 1
fi

echo "✅ Environment variables validated"
echo ""

# Run the audit tests with @audit tag
echo "🚀 Running audit tests..."
echo "Command: npx playwright test -g '@audit'"
echo ""

npx playwright test -g "@audit" --reporter=html --timeout=60000

echo ""
echo "✅ Audit tests completed!"
echo ""
echo "📊 Test results available at: playwright-report/index.html"
echo "To view results: npx playwright show-report"
echo ""
echo "🔍 Manual verification queries:"
echo "SELECT action, resource, result, request_id,"
echo "       occurred_at_utc at time zone 'Asia/Bangkok' as th_time"
echo "FROM audit.access_log"
echo "ORDER BY occurred_at_utc DESC LIMIT 20;"
echo ""
echo "SELECT action, resource, resource_id, correlation_id,"
echo "       occurred_at_utc at time zone 'Asia/Bangkok' as th_time"
echo "FROM audit.event_log"
echo "ORDER BY occurred_at_utc DESC LIMIT 20;"
