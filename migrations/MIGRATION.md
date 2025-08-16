# Database Migration Guide - Phase 1

## Overview
This document describes the database migrations required for Phase 1 implementation of the YEC Day Registration system.

## Migration Files

### 001_phase1_status_model_migration.sql
**Purpose**: Implements the new authoritative status model with explicit statuses, 3-track checklist, pricing fields, and event settings.

**Changes**:
- Creates `event_settings` table (singleton) for admin-configurable settings
- Adds new columns to `registrations` table:
  - Status model: `status`, `update_reason`, `rejected_reason`
  - 3-track checklist: `payment_review_status`, `profile_review_status`, `tcc_review_status`
  - Pricing: `price_applied`, `currency`, `selected_package_code`
- Adds constraint checks for data integrity
- Creates indices for performance
- Migrates existing data to new status model
- Creates trigger function for automatic status updates
- Creates auto-reject sweep function
- Inserts default event settings

### 002_supabase_post_migration_setup.sql
**Purpose**: Configures Supabase-specific settings including security policies, performance optimizations, and scheduled jobs.

**Changes**:
- Enables Row Level Security (RLS) on all tables
- Creates RLS policies for admin and user access
- Adds performance indexes for better query performance
- Creates helper functions for admin dashboard and pricing
- Sets up proper permissions for authenticated and service roles
- Creates admin dashboard view for simplified data access
- Enables pg_cron extension and schedules nightly registration sweep

### 003_email_outbox_migration.sql
**Purpose**: Implements email outbox pattern for reliable email delivery, especially for auto-reject notifications.

**Changes**:
- Creates `email_outbox` table for queued email management
- Adds indexes for performance on status, template, and email fields
- Creates helper functions:
  - `fn_enqueue_email()` - Enqueue emails with idempotency support
  - `fn_get_pending_emails()` - Get pending emails for dispatch
  - `fn_mark_email_sent()` - Mark emails as successfully sent
  - `fn_mark_email_error()` - Mark emails as failed with error details
  - `fn_get_outbox_stats()` - Get outbox statistics
- Updates `registration_sweep()` function to enqueue rejection emails instead of sending directly
- Enables RLS on email_outbox table with appropriate policies

## Run Order
1. **001_phase1_status_model_migration.sql** - Run this first as it contains all Phase 1 database changes
2. **002_supabase_post_migration_setup.sql** - Run this second for Supabase configuration
3. **003_email_outbox_migration.sql** - Run this third for email outbox system

## Rollback Procedures

### Rollback 003_email_outbox_migration.sql
```sql
-- 1. Drop email outbox functions
DROP FUNCTION IF EXISTS fn_enqueue_email(text, text, jsonb, text);
DROP FUNCTION IF EXISTS fn_get_pending_emails(int);
DROP FUNCTION IF EXISTS fn_mark_email_sent(uuid);
DROP FUNCTION IF EXISTS fn_mark_email_error(uuid, text);
DROP FUNCTION IF EXISTS fn_get_outbox_stats();

-- 2. Drop email outbox indexes
DROP INDEX IF EXISTS idx_email_outbox_status_scheduled;
DROP INDEX IF EXISTS idx_email_outbox_template;
DROP INDEX IF EXISTS idx_email_outbox_to_email;
DROP INDEX IF EXISTS idx_email_outbox_created_at;

-- 3. Drop email_outbox table
DROP TABLE IF EXISTS email_outbox;

-- 4. Restore original registration_sweep function (remove email enqueue calls)
-- Note: This requires manual restoration of the original function
```

### Rollback 002_supabase_post_migration_setup.sql
```sql
-- 1. Drop scheduled jobs
SELECT cron.unschedule('registration-sweep');

-- 2. Drop helper functions
DROP FUNCTION IF EXISTS get_registration_statistics();
DROP FUNCTION IF EXISTS get_price_packages();
DROP FUNCTION IF EXISTS is_registration_open();
DROP FUNCTION IF EXISTS update_registration_review_status(text, text, text, text);

-- 3. Drop admin dashboard view
DROP VIEW IF EXISTS admin_registrations_view;

-- 4. Drop RLS policies
DROP POLICY IF EXISTS "Service role can manage registrations" ON registrations;
DROP POLICY IF EXISTS "Admin can read registrations" ON registrations;
DROP POLICY IF EXISTS "Service role can manage event settings" ON event_settings;
DROP POLICY IF EXISTS "Admin can read event settings" ON event_settings;

-- 5. Disable RLS
ALTER TABLE registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_settings DISABLE ROW LEVEL SECURITY;

-- 6. Drop performance indexes
DROP INDEX IF EXISTS idx_registrations_status_created_at;
DROP INDEX IF EXISTS idx_registrations_email;
DROP INDEX IF EXISTS idx_registrations_company_name;
```

### Rollback 001_phase1_status_model_migration.sql
```sql
-- 1. Drop trigger and function
DROP TRIGGER IF EXISTS trigger_update_registration_status ON registrations;
DROP FUNCTION IF EXISTS update_registration_status();
DROP FUNCTION IF EXISTS registration_sweep();

-- 2. Drop indices
DROP INDEX IF EXISTS idx_registrations_status;
DROP INDEX IF EXISTS idx_registrations_created_at;
DROP INDEX IF EXISTS idx_registrations_update_reason;

-- 3. Drop constraints
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS chk_status;
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS chk_update_reason;
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS chk_review_statuses;

-- 4. Remove new columns from registrations
ALTER TABLE registrations 
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS update_reason,
  DROP COLUMN IF EXISTS rejected_reason,
  DROP COLUMN IF EXISTS payment_review_status,
  DROP COLUMN IF EXISTS profile_review_status,
  DROP COLUMN IF EXISTS tcc_review_status,
  DROP COLUMN IF EXISTS price_applied,
  DROP COLUMN IF EXISTS currency,
  DROP COLUMN IF EXISTS selected_package_code;

-- 5. Drop event_settings table
DROP TABLE IF EXISTS event_settings;

-- 6. Restore original status column (if it existed)
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
```

## Pre-Migration Checklist
- [ ] Backup database
- [ ] Verify no active registrations are being processed
- [ ] Ensure all application instances are stopped
- [ ] Test migration on staging environment first

## Post-Migration Verification
- [ ] Verify `event_settings` table has one row with default values
- [ ] Check that existing registrations have been migrated correctly
- [ ] Verify trigger function is working by updating a test registration
- [ ] Test auto-reject sweep function manually
- [ ] Verify all constraints are in place

## Data Migration Notes
- Existing `pending` status → `waiting_for_review`
- Existing `awaiting_user_update` with `update_reason` → explicit waiting statuses
- Review statuses are initialized based on current global status
- Default event settings are inserted with 30-day registration deadline and 7-day early bird

## Troubleshooting

### Common Issues
1. **Constraint violation**: Check that existing data conforms to new constraints
2. **Trigger not working**: Verify function exists and trigger is created
3. **Performance issues**: Check that indices are created properly

### Recovery Steps
1. Check migration logs for specific error messages
2. Verify database user has sufficient privileges
3. Test individual components of the migration separately
4. Restore from backup if necessary

## Environment-Specific Notes
- **Development**: Run directly in Supabase SQL editor
- **Staging**: Test thoroughly before production
- **Production**: Schedule during maintenance window
