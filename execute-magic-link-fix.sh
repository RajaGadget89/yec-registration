#!/bin/bash

# SAFE EXECUTION PLAN: Magic Link Authentication Fix
# This script provides step-by-step execution with safety checks

set -e  # Exit on any error

echo "🛡️  MAGIC LINK AUTHENTICATION FIX - SAFE EXECUTION PLAN"
echo "=================================================="

# Step 1: Pre-execution checks
echo "📋 Step 1: Pre-execution validation"
echo "-----------------------------------"

# Check if database is accessible
if ! psql -h localhost -p 54322 -U postgres -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ ERROR: Cannot connect to database!"
    echo "   Please ensure the database is running and accessible."
    exit 1
fi

echo "✅ Database connection verified"

# Check if admin_users table exists
TABLE_EXISTS=$(psql -h localhost -p 54322 -U postgres -d postgres -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_users' AND table_schema = 'public');" | xargs)
if [ "$TABLE_EXISTS" != "t" ]; then
    echo "❌ ERROR: admin_users table does not exist!"
    exit 1
fi

echo "✅ admin_users table exists"

# Count existing records
RECORD_COUNT=$(psql -h localhost -p 54322 -U postgres -d postgres -t -c "SELECT COUNT(*) FROM admin_users;" | xargs)
echo "📊 Current admin_users records: $RECORD_COUNT"

if [ "$RECORD_COUNT" -eq 0 ]; then
    echo "❌ ERROR: No records found in admin_users table!"
    exit 1
fi

# Step 2: Create backup
echo ""
echo "💾 Step 2: Creating backup"
echo "-------------------------"

echo "Creating backup of admin_users table..."
psql -h localhost -p 54322 -U postgres -d postgres -f backup-admin-users-before-fix.sql

if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully"
else
    echo "❌ ERROR: Backup failed!"
    exit 1
fi

# Step 3: Apply migration
echo ""
echo "🔧 Step 3: Applying migration"
echo "-----------------------------"

echo "Applying safe migration..."
psql -h localhost -p 54322 -U postgres -d postgres -f fix-admin-users-status-safe.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully"
else
    echo "❌ ERROR: Migration failed!"
    echo "🔄 Rolling back..."
    psql -h localhost -p 54322 -U postgres -d postgres -f rollback-admin-users-fix.sql
    echo "✅ Rollback completed"
    exit 1
fi

# Step 4: Post-migration validation
echo ""
echo "✅ Step 4: Post-migration validation"
echo "-----------------------------------"

# Test authentication endpoint
echo "Testing authentication endpoint..."
AUTH_RESPONSE=$(curl -s "http://localhost:8080/api/admin/me" | jq -r '.id // "error"')

if [ "$AUTH_RESPONSE" != "rbac-fallback" ] && [ "$AUTH_RESPONSE" != "error" ]; then
    echo "✅ Authentication working - User ID: $AUTH_RESPONSE"
else
    echo "⚠️  WARNING: Authentication still showing fallback or error"
    echo "   This might indicate the issue persists"
fi

# Step 5: Summary
echo ""
echo "📊 EXECUTION SUMMARY"
echo "==================="
echo "✅ Backup created: admin_users_backup_20250127"
echo "✅ Migration applied: fix-admin-users-status-safe.sql"
echo "✅ Rollback script ready: rollback-admin-users-fix.sql"
echo ""
echo "🔍 Next steps:"
echo "1. Test Magic Link authentication in browser"
echo "2. Verify Admin Dashboard access"
echo "3. If issues persist, run rollback script"
echo ""
echo "🛡️  Safety measures in place:"
echo "- Complete backup before migration"
echo "- Rollback script ready"
echo "- Validation at each step"
echo "- Exit on any error"
