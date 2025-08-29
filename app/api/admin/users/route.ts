import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUserFromRequest,
  hasRole,
} from "../../../lib/auth-utils.server";
import { getSupabaseAuth } from "../../../lib/auth-client";
import { getRolesForEmail } from "../../../lib/rbac";

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is super_admin
    const currentUser = await getCurrentUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is super_admin (either from database or RBAC)
    let isSuperAdmin = false;
    if (currentUser?.email && currentUser.is_active) {
      // Check database role first
      isSuperAdmin = currentUser.role === "super_admin";
      
      // If not super_admin in database, check RBAC system
      if (!isSuperAdmin) {
        const rbacRoles = getRolesForEmail(currentUser.email);
        isSuperAdmin = rbacRoles.has("super_admin");
      }
    }
    
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "forbidden" },
        { status: 403 },
      );
    }

    const supabase = getSupabaseAuth();

    // Get all admin users
    const { data: users, error } = await supabase
      .from("admin_users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching admin users:", error);
      return NextResponse.json(
        { error: "Failed to fetch admin users" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login_at: user.last_login_at,
        is_active: user.is_active,
      })),
    });
  } catch (error) {
    console.error("Fetch admin users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
