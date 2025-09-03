-- Migration: Add FK discovery function for admin delete operations
-- This function helps discover foreign key relationships pointing to admin_users.id

CREATE OR REPLACE FUNCTION discover_fk_references(
  target_table text,
  target_column text
)
RETURNS TABLE(
  table_name text,
  column_name text,
  constraint_name text
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    tc.table_name::text,
    kcu.column_name::text,
    tc.constraint_name::text
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_schema = 'public'
    AND ccu.table_name = target_table
    AND ccu.column_name = target_column
  ORDER BY tc.table_name, kcu.column_name;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION discover_fk_references(text, text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION discover_fk_references(text, text) IS 
  'Discovers foreign key relationships pointing to a specific table and column. Used for safe admin deletion operations.';
