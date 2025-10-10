Supabase Migrations – Project Targeting Guide

This project can connect to multiple Supabase projects (dev/staging/preview/prod). When running SQL or applying migrations, always double-check the target project to avoid writing to the wrong database.

How to run migrations safely

1. Verify the project in the Supabase SQL Editor UI
   - Top nav should show the intended project (e.g., yec-registration-dev-staging).
   - Schema should be public unless explicitly stated otherwise.
2. If using Supabase CLI, set and confirm the project reference:
   - supabase link --project-ref <your-project-ref>
   - supabase status (verify URL and ref)
3. Apply migration
   - From repo root: supabase migration up (or your CI pipeline)
4. Confirm objects were created
   - Table appears in Table Editor
   - RLS policies are visible under the table’s RLS policies tab

Quick verification – cms_event_settings

After applying 20250127000000_create_cms_event_settings.sql:

- Table public.cms_event_settings exists
- Indexes present (active, slug, language, display_order)
- Triggers present:
  - update_cms_event_settings_updated_at
  - trg_ensure_single_active_event
- Policies present:
  - Public can view active events
  - CMS admins can manage events
- Optional seed row exists (created by migration) or can be inserted via UI

Common pitfalls

- Could not find table … in PostgREST logs
  - You’re on the wrong project or schema. Re-check project ref and schema.
- Admin endpoints return 401/403/500 after migration
  - Ensure RLS policies were created and your admin_users row has either role = 'super_admin' or contains 'cms_admin' in business_roles, and is_active = true.

Rollback guidance

- If this migration was applied to the wrong project, you can:
  - Drop table: drop table if exists public.cms_event_settings cascade;
  - Re-apply the migration to the correct project following steps above.



