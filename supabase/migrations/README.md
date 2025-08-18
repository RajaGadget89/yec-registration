# YEC Registration Database Migrations

This directory contains comprehensive Supabase database migration files for the YEC Registration system. These migrations establish the complete database schema, including tables, indexes, RLS policies, functions, and triggers.

## Migration Files Overview

### Execution Order

The migrations must be executed in the following order to ensure proper database setup:

1. **`20250127130000_001_initial_schema.sql`** - Core database schema
2. **`20250127130100_002_comprehensive_review_workflow.sql`** - Review workflow system
3. **`20250127130200_003_enhanced_deep_link_tokens.sql`** - Secure deep link tokens
4. **`20250127130300_004_email_outbox_system.sql`** - Email outbox pattern
5. **`20250127130400_005_security_and_rls_policies.sql`** - Security and RLS policies

## Migration Details

### 1. Initial Schema Migration (`001_initial_schema.sql`)

**Purpose**: Creates the foundational database structure

**Components**:
- `event_settings` table (singleton) for admin-configurable settings
- `registrations` table with all required columns and constraints
- `admin_users` table for admin authentication
- `admin_audit_logs` table for audit trail
- Performance indexes for optimal query performance
- Default event settings with sample pricing packages

**Key Features**:
- Comprehensive registration data model
- 3-track review system fields
- Pricing and package management
- Audit logging capabilities
- Data integrity constraints

### 2. Comprehensive Review Workflow (`002_comprehensive_review_workflow.sql`)

**Purpose**: Implements the complete 3-track review system

**Components**:
- Domain functions for requesting updates (`fn_request_update`)
- User resubmission handling (`fn_user_resubmit`)
- Auto-approval logic (`fn_try_approve`)
- Automatic status updates via triggers
- Registration sweep function for deadline enforcement
- Helper functions for admin dashboard
- Admin dashboard view

**Key Features**:
- 3-track review system (payment, profile, TCC)
- Automatic status transitions
- Comprehensive review checklist
- Deadline enforcement
- Admin dashboard statistics

### 3. Enhanced Deep Link Tokens (`003_enhanced_deep_link_tokens.sql`)

**Purpose**: Implements secure deep link token system for user updates

**Components**:
- `deep_link_tokens` table for token management
- `deep_link_token_audit` table for audit logging
- Secure token generation and validation functions
- Token cleanup and statistics functions
- Comprehensive audit logging with triggers

**Key Features**:
- Single-use tokens with TTL
- Secure HMAC-based token generation
- Comprehensive audit trail
- Token statistics and monitoring
- Automatic cleanup of expired tokens

### 4. Email Outbox System (`004_email_outbox_system.sql`)

**Purpose**: Implements reliable email delivery system

**Components**:
- `email_outbox` table with status tracking
- Email status enum type
- Email enqueue and dispatch functions
- Retry logic with exponential backoff
- Email statistics and cleanup functions

**Key Features**:
- Reliable email delivery with retry logic
- Idempotency support via dedupe keys
- Email status tracking and monitoring
- Automatic cleanup of old emails
- Integration with registration sweep

### 5. Security and RLS Policies (`005_security_and_rls_policies.sql`)

**Purpose**: Establishes comprehensive security model

**Components**:
- Row Level Security (RLS) on all tables
- Admin and service role policies
- Security helper functions
- Admin action logging
- Permission management

**Key Features**:
- Comprehensive RLS policies
- Admin authentication and authorization
- Audit logging for admin actions
- Security helper functions
- Proper permission grants

## Database Schema

### Core Tables

#### `registrations`
Main registration table with comprehensive data model:
- Personal information (name, email, phone, etc.)
- Business information (company, province, etc.)
- Accommodation preferences
- Status tracking (3-track review system)
- Pricing and package information
- Audit fields (created_at, updated_at, etc.)

#### `event_settings`
Singleton table for admin-configurable settings:
- Registration and early bird deadlines
- Price packages configuration
- Eligibility rules
- Timezone settings

#### `admin_users`
Admin user management:
- Email-based authentication
- Role-based access (admin, super_admin)
- Login tracking
- Active/inactive status

#### `admin_audit_logs`
Audit trail for admin actions:
- Action tracking
- Before/after data snapshots
- Admin identification
- Timestamp tracking

### Supporting Tables

#### `deep_link_tokens`
Secure token management for user updates:
- Token hashing and storage
- Expiration tracking
- Usage tracking
- Admin creation tracking

#### `deep_link_token_audit`
Audit trail for token operations:
- Token creation/usage events
- User and admin tracking
- IP address and user agent logging

#### `email_outbox`
Reliable email delivery system:
- Email queuing and status tracking
- Retry logic with exponential backoff
- Idempotency support
- Error tracking and monitoring

## Key Functions

### Review Workflow Functions
- `fn_request_update()` - Request updates from users
- `fn_user_resubmit()` - Handle user resubmissions
- `fn_try_approve()` - Auto-approve when all checks pass
- `registration_sweep()` - Enforce deadlines and rules

### Deep Link Token Functions
- `generate_secure_deep_link_token()` - Create secure tokens
- `validate_and_consume_deep_link_token()` - Validate and use tokens
- `cleanup_expired_deep_link_tokens()` - Clean up old tokens
- `get_deep_link_token_stats()` - Get token statistics

### Email Functions
- `fn_enqueue_email()` - Queue emails for delivery
- `fn_get_pending_emails()` - Get emails ready for dispatch
- `fn_mark_email_sent()` - Mark emails as successfully sent
- `fn_mark_email_failed()` - Handle email failures with retry logic

### Security Functions
- `is_admin_user()` - Check if user is admin
- `is_super_admin()` - Check if user is super admin
- `log_admin_action()` - Log admin actions
- `get_current_admin_user()` - Get current admin user info

## Security Model

### Row Level Security (RLS)
All tables have RLS enabled with appropriate policies:
- **Admin users**: Can view and manage data based on their role
- **Service role**: Full access for API operations
- **Authenticated users**: Limited access for registration form

### Admin Roles
- **Admin**: Can manage registrations and view audit logs
- **Super Admin**: Can manage admin users and all system settings

### Audit Trail
Comprehensive audit logging for:
- Admin actions on registrations
- Deep link token operations
- Email delivery attempts
- System configuration changes

## Performance Optimizations

### Indexes
Comprehensive indexing strategy for optimal performance:
- Status-based queries
- Email lookups
- Date range queries
- Composite indexes for common patterns
- GIN indexes for JSONB fields

### Views
- `admin_registrations_view`: Simplified view for admin dashboard

## Usage Instructions

### Running Migrations

1. **Ensure proper order**: Execute migrations in timestamp order
2. **Backup database**: Always backup before running migrations
3. **Test environment**: Test migrations in staging first
4. **Monitor execution**: Watch for any errors during migration

### Post-Migration Setup

1. **Verify tables**: Check that all tables are created correctly
2. **Test functions**: Verify that all functions work as expected
3. **Check permissions**: Ensure RLS policies are working correctly
4. **Insert admin users**: Add initial admin users to the system

### Maintenance

1. **Regular cleanup**: Run cleanup functions periodically
2. **Monitor performance**: Watch query performance and adjust indexes
3. **Audit review**: Regularly review audit logs
4. **Backup strategy**: Maintain regular database backups

## Troubleshooting

### Common Issues

1. **Permission errors**: Check RLS policies and user roles
2. **Function errors**: Verify function dependencies and permissions
3. **Performance issues**: Check index usage and query plans
4. **Data integrity**: Verify constraints and triggers

### Recovery Procedures

1. **Rollback plan**: Keep backup of pre-migration state
2. **Function restoration**: Document original function signatures
3. **Data recovery**: Have procedures for data restoration
4. **Permission reset**: Know how to reset permissions if needed

## Environment Considerations

### Development
- Run migrations directly in Supabase SQL editor
- Test all functions and triggers
- Verify RLS policies work correctly

### Staging
- Test complete migration sequence
- Verify application integration
- Test performance under load

### Production
- Schedule during maintenance window
- Have rollback plan ready
- Monitor system during migration
- Verify all functionality after migration

## Support

For issues with migrations:
1. Check the migration logs for specific errors
2. Verify database user has sufficient privileges
3. Test individual components separately
4. Consult the application documentation for integration details

---

**Note**: These migrations are designed to work with the YEC Registration application. Ensure compatibility with your specific application version and requirements.
