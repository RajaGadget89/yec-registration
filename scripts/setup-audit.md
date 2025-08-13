# Audit Schema Setup Instructions

The audit logging system requires the audit schema and tables to be created in your Supabase database. Follow these steps:

## 1. Access Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Create a new query

## 2. Run the Audit Schema Script

Copy and paste the contents of `scripts/create-audit-schema.sql` into the SQL editor and run it.

This script will create:
- `audit` schema
- `audit.access_log` table for API access logging
- `audit.event_log` table for domain event logging
- RPC functions `audit.log_access()` and `audit.log_event()`
- Proper indexes and permissions

## 3. Verify Setup

After running the script, you can verify the setup by running these queries:

```sql
-- Check if audit schema exists
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'audit';

-- Check if tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'audit';

-- Check if RPC functions exist
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'audit';
```

## 4. Test the Audit System

Once the schema is created, you can test the audit system:

```bash
# Test the audit smoke endpoint
curl -X GET http://localhost:8080/api/diag/audit-smoke -H "X-Request-ID: test-123"

# Test registration with audit logging
curl -X POST http://localhost:8080/api/register \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: test-reg-123" \
  -d '{"title":"Mr.","firstName":"Test","lastName":"User","nickname":"testuser","phone":"0812345678","lineId":"testuser","email":"test@example.com","companyName":"Test Company","businessType":"technology","yecProvince":"bangkok","hotelChoice":"in-quota","roomType":"single","travelType":"private-car"}'

# Run the Playwright tests
npx playwright test -g "@audit @registration"
npx playwright test -g "@audit @login"
```

## 5. Verify Audit Logs

After running tests, you can verify the audit logs in Supabase:

```sql
-- Check recent access logs
SELECT action, resource, result, request_id,
       occurred_at_utc at time zone 'Asia/Bangkok' as th_time
FROM audit.access_log
ORDER BY occurred_at_utc DESC
LIMIT 10;

-- Check recent event logs
SELECT action, resource, actor_role, correlation_id,
       occurred_at_utc at time zone 'Asia/Bangkok' as th_time
FROM audit.event_log
ORDER BY occurred_at_utc DESC
LIMIT 10;
```

## Notes

- The audit schema is separate from the main `public` schema
- All audit logs are immutable and cannot be modified
- The service role has full access to audit logs
- Authenticated users can read audit logs (for admin dashboard)
- RPC functions are security definer and run with elevated privileges

