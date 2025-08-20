# Migration Conflict Resolution

## Problem Analysis

The YEC Registration project experienced migration failures during the "Test Migrations (Shadow DB)" and "E2E Tests (After Migration)" jobs due to schema conflicts between local migrations and the auto-generated remote schema file.

### Root Causes

#### 1. Primary Key Constraint Conflicts

**Error**: `ERROR: multiple primary keys for table "admin_audit_logs" are not allowed`

**Root Cause**: The auto-generated `20250818165159_remote_schema.sql` file contains `ALTER TABLE` statements that add primary key constraints to tables that already have primary keys defined in the local migrations.

**Conflicting Tables**:
- `admin_audit_logs` - Primary key added by both local and remote migrations
- `admin_users` - Primary key added by both local and remote migrations  
- `registrations` - Primary key added by both local and remote migrations

#### 2. Missing Column in email_outbox

**Error**: `ERROR: column email_outbox.idempotency_key does not exist`

**Root Cause**: The `idempotency_key` column that should be added by `20250127130500_006_add_idempotency_key.sql` was not applied because the primary key conflicts prevented the migration from completing successfully.

## Solution Implemented

### Migration Files Created/Modified

#### 1. Updated `20250127130600_007_handle_remote_schema_conflicts.sql`

**Changes Made**:
- Added function to safely add columns without conflicts
- Added critical fix to remove conflicting primary key constraints from `admin_audit_logs`
- Added comprehensive handling of `idempotency_key` column in `email_outbox`
- Updated `fn_enqueue_email` function to handle idempotency
- Added proper error handling and logging

#### 2. Created `20250127130700_008_fix_remote_schema_conflicts.sql`

**Purpose**: Dedicated migration to handle all remote schema conflicts comprehensively.

**Key Features**:
- **Primary Key Conflict Resolution**: Removes all conflicting primary key constraints from:
  - `admin_audit_logs`
  - `admin_users` 
  - `registrations`
- **Column Management**: Ensures all required columns exist in `email_outbox`:
  - `idempotency_key` (for idempotent email processing)
  - `dedupe_key` (for backward compatibility)
  - `subject` (for email subject lines)
- **Index Management**: Creates necessary indexes for performance:
  - `idx_email_outbox_idempotency_key`
  - `email_outbox_idempotency_key_uidx` (unique constraint)
  - `idx_email_outbox_dedupe_key`
- **Function Updates**: Updates `fn_enqueue_email` function to handle idempotency keys

### Technical Approach

#### Safe Constraint Management

The solution uses PostgreSQL's `IF EXISTS` and `IF NOT EXISTS` checks to safely handle constraints:

```sql
-- Remove conflicting constraints
IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'admin_audit_logs_pkey' 
    AND conrelid = 'admin_audit_logs'::regclass
) THEN
    ALTER TABLE admin_audit_logs DROP CONSTRAINT IF EXISTS admin_audit_logs_pkey;
END IF;

-- Re-add constraints safely
IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'admin_audit_logs_pkey' 
    AND conrelid = 'admin_audit_logs'::regclass
) THEN
    ALTER TABLE admin_audit_logs ADD CONSTRAINT admin_audit_logs_pkey PRIMARY KEY (id);
END IF;
```

#### Idempotent Column Management

Columns are added only if they don't exist:

```sql
IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_outbox' 
    AND column_name = 'idempotency_key'
) THEN
    ALTER TABLE email_outbox ADD COLUMN idempotency_key TEXT;
END IF;
```

#### Comprehensive Logging

Each operation includes detailed logging to track what was applied:

```sql
RAISE NOTICE 'Added idempotency_key column to email_outbox';
RAISE NOTICE 'Primary key conflicts resolved for admin_audit_logs, admin_users, and registrations';
```

## Expected Results

After applying these migrations:

1. **Primary Key Conflicts Resolved**: All tables will have exactly one primary key constraint
2. **email_outbox Schema Complete**: The table will have all required columns including `idempotency_key`
3. **Migration Success**: All subsequent migrations should run without conflicts
4. **E2E Tests Pass**: The `idempotency_key` column will be available for tests

## Migration Order

The migrations should be applied in this order:

1. `20250127130000_001_initial_schema.sql` - Creates base schema
2. `20250127130100_002_comprehensive_review_workflow.sql` - Adds review workflow
3. `20250127130200_003_enhanced_deep_link_tokens.sql` - Enhances deep links
4. `20250127130300_004_email_outbox_system.sql` - Creates email outbox
5. `20250127130400_005_security_and_rls_policies.sql` - Adds security policies
6. `20250127130500_006_add_idempotency_key.sql` - Adds idempotency support
7. `20250127130600_007_handle_remote_schema_conflicts.sql` - Handles conflicts (updated)
8. `20250127130700_008_fix_remote_schema_conflicts.sql` - Comprehensive conflict resolution (new)

## Testing Recommendations

1. **Shadow DB Test**: Run migrations against a clean shadow database
2. **E2E Tests**: Verify that `idempotency_key` column is accessible
3. **Constraint Verification**: Confirm no duplicate primary keys exist
4. **Function Testing**: Test `fn_enqueue_email` with idempotency keys

## Rollback Plan

If issues arise, the migrations can be rolled back by:

1. Dropping the `idempotency_key` column from `email_outbox`
2. Re-adding the original primary key constraints
3. Restoring the original `fn_enqueue_email` function

However, the safe nature of these migrations (using `IF EXISTS` checks) should prevent any destructive operations.
