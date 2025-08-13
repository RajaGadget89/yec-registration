#!/bin/bash

# Setup Audit Schema for YEC Registration System
# This script helps set up the audit logging system

echo "🔍 Setting up Audit Schema for YEC Registration System..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "⚠️  Warning: Supabase CLI not found. You may need to install it or run the SQL manually."
    echo "   Visit: https://supabase.com/docs/guides/cli"
    echo ""
fi

echo "📋 Available audit schema scripts:"
echo "   1. create-audit-schema-corrected.sql (Recommended)"
echo "   2. create-audit-schema-fixed.sql"
echo "   3. fix-audit-schema-step-by-step.sql"
echo ""

# Check if scripts directory exists
if [ ! -d "scripts" ]; then
    echo "❌ Error: scripts directory not found"
    exit 1
fi

# List available scripts
echo "📁 Found audit schema scripts:"
ls -la scripts/create-audit-schema*.sql 2>/dev/null || echo "   No audit schema scripts found"
ls -la scripts/fix-audit-schema*.sql 2>/dev/null || echo "   No fix scripts found"
echo ""

echo "🚀 To set up the audit schema:"
echo ""
echo "   1. Connect to your Supabase database"
echo "   2. Run one of the SQL scripts from the scripts/ folder"
echo "   3. Recommended: scripts/create-audit-schema-corrected.sql"
echo ""
echo "   Example with Supabase CLI:"
echo "   supabase db reset --linked"
echo "   supabase db push"
echo ""
echo "   Or manually in Supabase Dashboard:"
echo "   1. Go to SQL Editor"
echo "   2. Copy and paste the contents of create-audit-schema-corrected.sql"
echo "   3. Run the script"
echo ""
echo "✅ After running the schema script, the audit dashboard should work properly."
echo ""
echo "🔧 To test the audit system:"
echo "   curl -X GET http://localhost:8080/api/diag/audit-smoke -H 'X-Request-ID: test-123'"
echo ""
