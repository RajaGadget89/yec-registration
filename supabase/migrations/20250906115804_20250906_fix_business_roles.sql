-- Fix job scopes on admin_users (idempotent & safe to re-run)

-- 1) Add column if missing
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS business_roles TEXT[] DEFAULT '{}'::text[];

-- 2) Check constraint (only valid values)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'admin_users_business_roles_check'
      AND conrelid = 'public.admin_users'::regclass
  ) THEN
    ALTER TABLE public.admin_users
      ADD CONSTRAINT admin_users_business_roles_check
        CHECK (business_roles <@ ARRAY['user_profile','payment_slip','tcc_card']::TEXT[]);
  END IF;
END $$;

-- 3) Indexes for roles & common queries
CREATE INDEX IF NOT EXISTS idx_admin_users_business_roles
  ON public.admin_users USING GIN (business_roles);

CREATE INDEX IF NOT EXISTS idx_admin_users_has_user_profile
  ON public.admin_users ((business_roles @> ARRAY['user_profile']::TEXT[]));

CREATE INDEX IF NOT EXISTS idx_admin_users_has_payment_slip
  ON public.admin_users ((business_roles @> ARRAY['payment_slip']::TEXT[]));

CREATE INDEX IF NOT EXISTS idx_admin_users_has_tcc_card
  ON public.admin_users ((business_roles @> ARRAY['tcc_card']::TEXT[]));

-- 4) Backfill for existing super_admin (only when empty)
UPDATE public.admin_users
SET business_roles = ARRAY['user_profile','payment_slip','tcc_card']::TEXT[]
WHERE role = 'super_admin'
  AND (business_roles IS NULL OR business_roles = '{}'::TEXT[]);

-- MIGRATION-GUARD: noop marker
SELECT 1;

