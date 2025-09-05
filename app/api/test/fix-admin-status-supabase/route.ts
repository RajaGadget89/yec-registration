import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";

/**
 * Supabase-compatible endpoint to fix admin user status
 * This endpoint safely updates existing admin users to have status = 'active'
 * Only available in development environment
 */
export async function POST(_request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "This endpoint is only available in development" },
      { status: 403 },
    );
  }

  try {
    const supabase = getSupabaseServiceClient();

    // Step 1: Pre-migration validation
    console.log("🔍 Pre-migration validation...");

    // Check if admin_users table exists and get current state
    const { data: currentUsers, error: fetchError } = await supabase
      .from("admin_users")
      .select("id, email, is_active, status, created_at, updated_at");

    if (fetchError) {
      console.error("❌ Error fetching admin_users:", fetchError);
      return NextResponse.json(
        {
          error: "Failed to fetch admin_users table",
          details: fetchError.message,
        },
        { status: 500 },
      );
    }

    if (!currentUsers || currentUsers.length === 0) {
      return NextResponse.json(
        { error: "No records found in admin_users table" },
        { status: 400 },
      );
    }

    console.log(`✅ Found ${currentUsers.length} admin users`);

    // Step 2: Create backup (store in memory for this session)
    const backup = currentUsers.map((user) => ({
      ...user,
      backup_created_at: new Date().toISOString(),
    }));

    console.log("💾 Backup created in memory");

    // Step 3: Check if status column exists and add if needed
    const usersWithStatus = currentUsers.filter(
      (user) => user.status !== null && user.status !== undefined,
    );
    const usersWithoutStatus = currentUsers.filter(
      (user) => user.status === null || user.status === undefined,
    );

    console.log(
      `📊 Users with status: ${usersWithStatus.length}, Users without status: ${usersWithoutStatus.length}`,
    );

    // Step 4: Update users without proper status
    const usersToUpdate = currentUsers.filter(
      (user) =>
        user.is_active === true &&
        (user.status === null ||
          user.status === undefined ||
          user.status !== "active"),
    );

    if (usersToUpdate.length === 0) {
      return NextResponse.json({
        success: true,
        message:
          "No users need updating - all active users already have status = 'active'",
        stats: {
          total_users: currentUsers.length,
          active_users: currentUsers.filter((u) => u.is_active).length,
          users_with_proper_status: currentUsers.filter(
            (u) => u.is_active && u.status === "active",
          ).length,
        },
        backup: backup,
      });
    }

    console.log(`🔧 Updating ${usersToUpdate.length} users...`);

    // Update users in batches
    const updatePromises = usersToUpdate.map(async (user) => {
      const { error: updateError } = await supabase
        .from("admin_users")
        .update({
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        console.error(`❌ Error updating user ${user.email}:`, updateError);
        throw updateError;
      }

      return { id: user.id, email: user.email, updated: true };
    });

    const updateResults = await Promise.all(updatePromises);

    // Step 5: Post-migration validation
    const { data: updatedUsers, error: validationError } = await supabase
      .from("admin_users")
      .select("id, email, is_active, status, created_at, updated_at");

    if (validationError) {
      console.error("❌ Error validating updates:", validationError);
      return NextResponse.json(
        {
          error: "Failed to validate updates",
          details: validationError.message,
        },
        { status: 500 },
      );
    }

    const activeUsersWithProperStatus =
      updatedUsers?.filter((u) => u.is_active && u.status === "active") || [];

    console.log("✅ Migration completed successfully");

    return NextResponse.json({
      success: true,
      message: "Admin users status updated successfully",
      stats: {
        total_users: updatedUsers?.length || 0,
        active_users: updatedUsers?.filter((u) => u.is_active).length || 0,
        active_users_with_proper_status: activeUsersWithProperStatus.length,
        users_updated: updateResults.length,
      },
      updated_users: updateResults,
      backup: backup,
      final_state: updatedUsers,
    });
  } catch (error) {
    console.error("❌ Migration failed:", error);
    return NextResponse.json(
      {
        error: "Migration failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * GET endpoint to check current admin users status
 */
export async function GET() {
  try {
    const supabase = getSupabaseServiceClient();

    const { data: users, error } = await supabase
      .from("admin_users")
      .select("id, email, is_active, status, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch admin users", details: error.message },
        { status: 500 },
      );
    }

    const stats = {
      total_users: users?.length || 0,
      active_users: users?.filter((u) => u.is_active).length || 0,
      active_users_with_proper_status:
        users?.filter((u) => u.is_active && u.status === "active").length || 0,
      users_without_status:
        users?.filter((u) => u.status === null || u.status === undefined)
          .length || 0,
    };

    return NextResponse.json({
      success: true,
      stats,
      users: users || [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to check admin users",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
