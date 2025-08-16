# Audit Schema Setup Guide

## Overview

The Admin Audit Dashboard requires the audit schema to be set up in your Supabase database. This guide will walk you through the process step by step.

## Prerequisites

- Access to your Supabase project dashboard
- Admin privileges on your Supabase database

## Step-by-Step Setup

### Method 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Audit Schema Script**
   - Copy the entire contents of `scripts/create-audit-schema-corrected.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute the script

4. **Verify Setup**
   - Go to "Table Editor" in the left sidebar
   - You should see an "audit" schema with two tables:
     - `audit.access_log`
     - `audit.event_log`

### Method 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Run the schema script
supabase db push
```

## Verification

After setting up the audit schema, you can verify it's working:

1. **Test the Audit Dashboard**
   - Navigate to `/admin/audit` in your application
   - You should see the dashboard without the "Audit System Status" warning

2. **Test Audit Logging**
   ```bash
   curl -X GET http://localhost:8080/api/diag/audit-smoke -H "X-Request-ID: test-123"
   ```

3. **Check for Audit Logs**
   - After running the test, refresh the audit dashboard
   - You should see audit logs in both Access and Event tabs

## Troubleshooting

### Common Issues

1. **"Permission denied" errors**
   - Ensure you're using the service role key for database operations
   - Check that your environment variables are set correctly

2. **Tables not created**
   - Verify the SQL script ran successfully
   - Check the Supabase logs for any errors

3. **Dashboard still shows "No audit logs found"**
   - Generate some audit logs by using the application
   - Run the test command: `curl -X GET http://localhost:8080/api/diag/audit-smoke -H "X-Request-ID: test-123"`

### Environment Variables

Ensure these environment variables are set in your `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Schema Details

The audit schema creates:

- **`audit.access_log`**: HTTP requests and API access logs
- **`audit.event_log`**: Business events and system activities
- **RPC Functions**: `audit.log_access()` and `audit.log_event()`
- **Indexes**: For optimal query performance
- **Policies**: Row-level security for data protection

## Next Steps

Once the audit schema is set up:

1. The Admin Audit Dashboard will display real audit logs
2. CSV export functionality will work properly
3. All filtering and search features will be functional
4. Copy buttons and time ago labels will work with real data

## Support

If you encounter any issues:

1. Check the browser console for error messages
2. Verify the audit schema exists in your Supabase database
3. Ensure your environment variables are correctly configured
4. Test the audit logging with the provided curl command
