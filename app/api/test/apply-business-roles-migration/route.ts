import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function e2eOn() {
  return (
    process.env.E2E_TEST_MODE === "true" &&
    process.env.TEST_HELPERS_ENABLED === "1"
  );
}

export async function POST(_req: Request) {
  if (!e2eOn()) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 404 });
  }

  try {
    // Create Supabase client with service role key
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Apply business_roles migration using idempotent approach
    const migrationSQL = `
      -- 1. Add business_roles column to admin_users table (idempotent)
      ALTER TABLE admin_users 
      ADD COLUMN IF NOT EXISTS business_roles TEXT[] DEFAULT '{}';

      -- 2. Add constraint to ensure business_roles contains only valid values (idempotent)
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_constraint 
              WHERE conname = 'admin_users_business_roles_check'
          ) THEN
              ALTER TABLE admin_users 
              ADD CONSTRAINT admin_users_business_roles_check 
              CHECK (
                business_roles <@ ARRAY['user_profile', 'payment_slip', 'tcc_card']::TEXT[]
              );
          END IF;
      END $$;

      -- 3. Create index for better performance on business_roles queries (idempotent)
      CREATE INDEX IF NOT EXISTS idx_admin_users_business_roles 
      ON admin_users USING GIN (business_roles);

      -- 4. Update existing admin users with appropriate business roles (safe backfill)
      UPDATE admin_users 
      SET business_roles = CASE 
          WHEN email = 'dave@yec.dev' THEN ARRAY['tcc_card']::TEXT[]
          WHEN email = 'admin@yec.dev' THEN ARRAY['user_profile', 'payment_slip', 'tcc_card']::TEXT[]
          WHEN email = 'raja.gadgets89@gmail.com' THEN ARRAY['user_profile', 'payment_slip', 'tcc_card']::TEXT[]
          WHEN email = 'yecsongkhla.official@gmail.com' THEN ARRAY['user_profile', 'payment_slip', 'tcc_card']::TEXT[]
          ELSE ARRAY[]::TEXT[]
      END
      WHERE business_roles IS NULL OR business_roles = '{}';
    `;

    // Execute the migration
    const { error } = await supabase.rpc("exec_sql", {
      sql: migrationSQL,
    });

    if (error) {
      console.error("Migration error:", error);
      return NextResponse.json(
        {
          ok: false,
          error: "Migration failed",
          details: error.message,
        },
        { status: 500 },
      );
    }

    // Verify the column was added
    const { data: columnData, error: columnError } = await supabase
      .from("information_schema.columns")
      .select("column_name, data_type, is_nullable, column_default")
      .eq("table_name", "admin_users")
      .eq("column_name", "business_roles");

    if (columnError) {
      console.error("Column verification error:", columnError);
      return NextResponse.json(
        {
          ok: false,
          error: "Column verification failed",
          details: columnError.message,
        },
        { status: 500 },
      );
    }

    // Get current admin users and their business roles
    const { data: adminData, error: adminError } = await supabase
      .from("admin_users")
      .select("email, role, business_roles, is_active, status")
      .order("email");

    if (adminError) {
      console.error("Admin data error:", adminError);
      return NextResponse.json(
        {
          ok: false,
          error: "Admin data retrieval failed",
          details: adminError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Business roles migration applied successfully",
      columnInfo: columnData,
      adminUsers: adminData,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Unexpected error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
