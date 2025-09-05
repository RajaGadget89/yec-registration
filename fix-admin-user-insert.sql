-- Corrected SQL to insert admin user with proper PostgreSQL array syntax
INSERT INTO admin_users (id, email, role, is_active, business_roles, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'raja.gadgets89@gmail.com',
  'super_admin',
  true,
  ARRAY['user_profile', 'payment_slip', 'tcc_card'],
  NOW(),
  NOW()
);
