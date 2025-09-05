import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";

export async function POST() {
  try {
    const supabase = getSupabaseServiceClient();

    console.log("[rollback] Starting business roles rollback...");

    // Execute rollback SQL
    const rollbackSQL = `
      -- Rollback Migration: Admin Job Scopes (Granular Permissions)
      -- Date: 2025-01-27
      -- Description: Rollback the admin job scopes feature by removing business_roles column
      -- This migration is idempotent and safe to run multiple times

      -- 1. Drop indexes first
      DROP INDEX IF EXISTS idx_admin_users_business_roles;
      DROP INDEX IF EXISTS idx_admin_users_has_user_profile;
      DROP INDEX IF EXISTS idx_admin_users_has_payment_slip;
      DROP INDEX IF EXISTS idx_admin_users_has_tcc_card;

      -- 2. Drop functions
      DROP FUNCTION IF EXISTS admin_has_business_role(TEXT, TEXT);
      DROP FUNCTION IF EXISTS get_admin_business_roles(TEXT);

      -- 3. Drop constraint
      ALTER TABLE admin_users 
      DROP CONSTRAINT IF EXISTS admin_users_business_roles_check;

      -- 4. Drop the business_roles column
      ALTER TABLE admin_users 
      DROP COLUMN IF EXISTS business_roles;

      -- 5. Add comment to document the rollback
      COMMENT ON TABLE admin_users IS 'Admin users table - business_roles column removed on 2025-01-27';
    `;

    const { error } = await supabase.rpc("exec_sql", { sql: rollbackSQL });

    if (error) {
      console.error("[rollback] Error executing rollback:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: "Failed to execute rollback SQL",
        },
        { status: 500 },
      );
    }

    console.log("[rollback] Business roles rollback completed successfully");

    return NextResponse.json({
      success: true,
      message: "Business roles rollback completed successfully",
      details:
        "Removed business_roles column and related functions/constraints",
    });
  } catch (error) {
    console.error("[rollback] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        details: "Unexpected error during rollback",
      },
      { status: 500 },
    );
  }
}
