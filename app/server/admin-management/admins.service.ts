import { getSupabaseServiceClient } from "../../lib/supabase-server";
import { EventFactory } from "../../lib/events/eventFactory";
import { EventService } from "../../lib/events/eventService";
import { BusinessRole } from "../../types/database";

export interface ListAdminsParams {
  search?: string;
  status?: "active" | "suspended";
  role?: "admin" | "super_admin";
  page?: number;
  pageSize?: number;
}

export interface ListAdminsResult {
  admins: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UpdateAdminParams {
  adminId: string;
  addRoles?: string[];
  removeRoles?: string[];
  businessRoles?: BusinessRole[];
  status?: "active" | "suspended";
  updatedBy: string;
  correlationId: string;
}

export interface RemoveAdminParams {
  adminId: string;
  removedBy: string;
  correlationId: string;
}

export class AdminsService {
  /**
   * List admin users with pagination and filtering
   */
  static async listAdmins(params: ListAdminsParams): Promise<ListAdminsResult> {
    const supabase = getSupabaseServiceClient();

    // Build query
    let query = supabase.from("admin_users").select("*", { count: "exact" });

    // Apply filters
    if (params.search) {
      query = query.ilike("email", `%${params.search}%`);
    }

    if (params.status && ["active", "suspended"].includes(params.status)) {
      query = query.eq("status", params.status);
    }

    if (params.role && ["admin", "super_admin"].includes(params.role)) {
      query = query.eq("role", params.role);
    }

    // Apply pagination
    const page = params.page || 1;
    const pageSize = Math.min(params.pageSize || 20, 50);
    const offset = (page - 1) * pageSize;

    query = query
      .order("email", { ascending: true })
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    // Execute query
    const { data: admins, error, count } = await query;

    if (error) {
      throw new Error("Failed to fetch admin users");
    }

    return {
      admins: (admins || []).map((admin) => ({
        ...(admin as any),
        business_roles: (admin as any).business_roles || [],
      })),
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  }

  /**
   * Update admin user roles and status
   */
  static async updateAdmin(params: UpdateAdminParams): Promise<void> {
    const supabase = getSupabaseServiceClient();

    // Get current admin user
    const { data: admin, error: fetchError } = await supabase
      .from("admin_users")
      .select("*")
      .eq("id", params.adminId)
      .single();

    if (fetchError || !admin) {
      throw new Error("Admin user not found");
    }

    // Check if trying to update self
    if ((admin as any).email === params.updatedBy) {
      throw new Error("Cannot update your own account");
    }

    // Check if trying to demote the last super_admin
    if (
      params.removeRoles?.includes("super_admin") ||
      params.status === "suspended"
    ) {
      const { data: superAdmins, error: countError } = await supabase
        .from("admin_users")
        .select("id")
        .eq("role", "super_admin")
        .eq("status", "active");

      if (countError) {
        throw new Error("Failed to check super admin count");
      }

      if (
        superAdmins.length === 1 &&
        (superAdmins[0] as any).id === params.adminId
      ) {
        throw new Error("Cannot demote the last super admin");
      }
    }

    // Prepare update data
    const updateData: any = {};

    // Handle role updates
    if (params.addRoles?.length || params.removeRoles?.length) {
      // For now, we'll use a simple role field (can be enhanced for multiple roles)
      if (params.addRoles?.includes("super_admin")) {
        updateData.role = "super_admin";
      } else if (params.removeRoles?.includes("super_admin")) {
        updateData.role = "admin";
      }
    }

    // Handle business roles updates
    if (params.businessRoles !== undefined) {
      updateData.business_roles = params.businessRoles;
    }

    // Handle status updates
    if (params.status) {
      updateData.status = params.status;
    }

    // Update admin user
    const { error: updateError } = await (supabase as any)
      .from("admin_users")
      .update(updateData)
      .eq("id", params.adminId);

    if (updateError) {
      throw new Error("Failed to update admin user");
    }

    // Emit appropriate events
    if (params.addRoles?.includes("super_admin")) {
      const event = EventFactory.createAdminRoleAssigned(
        params.adminId,
        "super_admin",
      );
      await EventService.emit(event);
    } else if (params.removeRoles?.includes("super_admin")) {
      const event = EventFactory.createAdminRoleRevoked(
        params.adminId,
        "super_admin",
      );
      await EventService.emit(event);
    }

    if (params.status === "suspended") {
      const event = EventFactory.createAdminSuspended(params.adminId);
      await EventService.emit(event);
    } else if (params.status === "active") {
      const event = EventFactory.createAdminActivated(params.adminId);
      await EventService.emit(event);
    }
  }

  /**
   * Remove admin user (soft delete)
   */
  static async removeAdmin(params: RemoveAdminParams): Promise<void> {
    const supabase = getSupabaseServiceClient();

    // Get current admin user
    const { data: admin, error: fetchError } = await supabase
      .from("admin_users")
      .select("*")
      .eq("id", params.adminId)
      .single();

    if (fetchError || !admin) {
      throw new Error("Admin user not found");
    }

    // Check if trying to remove self
    if ((admin as any).email === params.removedBy) {
      throw new Error("Cannot remove your own account");
    }

    // Check if trying to remove the last super_admin
    if ((admin as any).role === "super_admin") {
      const { data: superAdmins, error: countError } = await supabase
        .from("admin_users")
        .select("id")
        .eq("role", "super_admin")
        .eq("status", "active");

      if (countError) {
        throw new Error("Failed to check super admin count");
      }

      if (
        superAdmins.length === 1 &&
        (superAdmins[0] as any).id === params.adminId
      ) {
        throw new Error("Cannot remove the last super admin");
      }
    }

    // Soft delete by setting status to suspended
    const { error: updateError } = await (supabase as any)
      .from("admin_users")
      .update({
        status: "suspended",
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.adminId);

    if (updateError) {
      throw new Error("Failed to remove admin user");
    }

    // Emit admin suspended event
    const event = EventFactory.createAdminSuspended(params.adminId);
    await EventService.emit(event);
  }

  /**
   * Get admin user by ID
   */
  static async getAdminById(adminId: string): Promise<any> {
    const supabase = getSupabaseServiceClient();

    const { data: admin, error } = await supabase
      .from("admin_users")
      .select("*")
      .eq("id", adminId)
      .single();

    if (error || !admin) {
      throw new Error("Admin user not found");
    }

    return admin;
  }

  /**
   * Count super admins
   */
  static async countSuperAdmins(): Promise<number> {
    const supabase = getSupabaseServiceClient();

    const { data: superAdmins, error } = await supabase
      .from("admin_users")
      .select("id")
      .eq("role", "super_admin")
      .eq("status", "active");

    if (error) {
      throw new Error("Failed to count super admins");
    }

    return superAdmins.length;
  }
}
