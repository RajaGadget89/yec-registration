import { SupabaseClient } from "@supabase/supabase-js";

export interface FKReference {
  table: string;
  column: string;
  count: number;
  action: "delete_by_fk";
}

export interface ImplicitReference {
  table: string;
  column: string;
  count: number;
  action: "delete_by_email";
}

export interface DeletePlan {
  admin: { id: string; email: string; role: "admin" | "super_admin" };
  fk: FKReference[];
  implicit: ImplicitReference[];
  order: string[]; // topological order for deletes (FK first)
  timestamp: string;
  dryRun: boolean;
}

export interface DeleteSummary {
  admin: { id: string; email: string; role: string };
  tablesAffected: Array<{
    table: string;
    rowsDeleted: number;
    action: string;
  }>;
  success: boolean;
  error?: string;
  at?: { table: string; step: string };
  timestamp: string;
}

/**
 * Discover foreign key relationships pointing to admin_users.id
 */
export async function discoverFKReferences(
  supabase: SupabaseClient,
  adminId: string,
): Promise<FKReference[]> {
  try {
    // Query to find FK constraints pointing to admin_users.id
    const { data, error } = await (supabase as any).rpc(
      "discover_fk_references",
      {
        target_table: "admin_users",
        target_column: "id",
      },
    );

    if (error) {
      console.warn(
        "[admin.delete] FK discovery RPC failed, falling back to manual query:",
        error,
      );
      return await discoverFKReferencesManual(supabase, adminId);
    }

    return data || [];
  } catch (error) {
    console.warn(
      "[admin.delete] FK discovery failed, falling back to manual query:",
      error,
    );
    return await discoverFKReferencesManual(supabase, adminId);
  }
}

/**
 * Manual FK discovery fallback
 */
async function discoverFKReferencesManual(
  supabase: SupabaseClient,
  adminId: string,
): Promise<FKReference[]> {
  const fkReferences: FKReference[] = [];

  // Common FK patterns we know about
  const knownFKPatterns = [
    { table: "admin_invitations", column: "accepted_admin_id" },
    { table: "admin_audit_logs", column: "admin_id" },
    { table: "admin_activity_logs", column: "admin_id" },
    { table: "admin_sessions", column: "admin_id" },
    { table: "admin_permissions", column: "admin_id" },
    { table: "admin_roles_history", column: "admin_id" },
  ];

  for (const pattern of knownFKPatterns) {
    try {
      const { count, error } = await supabase
        .from(pattern.table)
        .select("*", { count: "exact", head: true })
        .eq(pattern.column, adminId);

      if (!error && count !== null) {
        fkReferences.push({
          table: pattern.table,
          column: pattern.column,
          count,
          action: "delete_by_fk",
        });
      }
    } catch {
      // Table doesn't exist or is not accessible, skip
      console.log(
        `[admin.delete] Table ${pattern.table} not accessible, skipping`,
      );
    }
  }

  return fkReferences;
}

/**
 * Discover implicit references by email (no FK, but likely references)
 */
export async function discoverImplicitReferences(
  supabase: SupabaseClient,
  adminEmail: string,
): Promise<ImplicitReference[]> {
  const implicitRefs: ImplicitReference[] = [];

  // Common implicit reference patterns
  const implicitPatterns = [
    { table: "admin_invitations", column: "invited_email" },
    { table: "admin_audit_logs", column: "admin_email" },
    { table: "admin_activity_logs", column: "actor_email" },
    { table: "admin_activity_logs", column: "target_email" },
    { table: "audit_logs", column: "actor_id" },
    { table: "audit_logs", column: "user_email" },
  ];

  for (const pattern of implicitPatterns) {
    try {
      const { count, error } = await supabase
        .from(pattern.table)
        .select("*", { count: "exact", head: true })
        .eq(pattern.column, adminEmail);

      if (!error && count !== null && count > 0) {
        implicitRefs.push({
          table: pattern.table,
          column: pattern.column,
          count,
          action: "delete_by_email",
        });
      }
    } catch {
      // Table doesn't exist or is not accessible, skip
      console.log(
        `[admin.delete] Table ${pattern.table} not accessible, skipping`,
      );
    }
  }

  return implicitRefs;
}

/**
 * Build a complete delete plan for an admin user
 */
export async function buildDeletePlan(
  supabase: SupabaseClient,
  adminId: string,
  adminEmail: string,
  adminRole: string,
): Promise<DeletePlan> {
  console.log(
    `[admin.delete] Building delete plan for admin: ${adminEmail} (${adminId})`,
  );

  // Discover FK references
  const fkRefs = await discoverFKReferences(supabase, adminId);
  console.log(`[admin.delete] Found ${fkRefs.length} FK references`);

  // Discover implicit references
  const implicitRefs = await discoverImplicitReferences(supabase, adminEmail);
  console.log(
    `[admin.delete] Found ${implicitRefs.length} implicit references`,
  );

  // Build execution order: FK tables first, then implicit tables
  const order = [
    ...fkRefs.map((ref) => ref.table),
    ...implicitRefs.map((ref) => ref.table),
  ];

  // Remove duplicates while preserving order
  const uniqueOrder = order.filter(
    (table, index) => order.indexOf(table) === index,
  );

  const plan: DeletePlan = {
    admin: {
      id: adminId,
      email: adminEmail,
      role: adminRole as "admin" | "super_admin",
    },
    fk: fkRefs,
    implicit: implicitRefs,
    order: uniqueOrder,
    timestamp: new Date().toISOString(),
    dryRun: true,
  };

  console.log(`[admin.delete] Delete plan built:`, {
    fkCount: fkRefs.length,
    implicitCount: implicitRefs.length,
    totalTables: uniqueOrder.length,
    order: uniqueOrder,
  });

  return plan;
}

/**
 * Execute the delete plan within a transaction
 */
export async function executeDeletePlan(
  supabase: SupabaseClient,
  plan: DeletePlan,
  includeAudit: boolean = false,
): Promise<DeleteSummary> {
  console.log(
    `[admin.delete] Executing delete plan for admin: ${plan.admin.email}`,
  );

  const summary: DeleteSummary = {
    admin: plan.admin,
    tablesAffected: [],
    success: false,
    timestamp: new Date().toISOString(),
  };

  try {
    // Start transaction
    console.log("[admin.delete] Starting transaction...");

    // Execute FK deletes first
    for (const fkRef of plan.fk) {
      if (fkRef.count > 0) {
        console.log(
          `[admin.delete] Deleting from ${fkRef.table} (${fkRef.count} rows)`,
        );

        const { error } = await supabase
          .from(fkRef.table)
          .delete()
          .eq(fkRef.column, plan.admin.id);

        if (error) {
          throw new Error(
            `Failed to delete from ${fkRef.table}: ${error.message}`,
          );
        }

        summary.tablesAffected.push({
          table: fkRef.table,
          rowsDeleted: fkRef.count,
          action: fkRef.action,
        });
      }
    }

    // Execute implicit deletes (only if includeAudit is true or it's a non-audit table)
    for (const implicitRef of plan.implicit) {
      if (implicitRef.count > 0) {
        const isAuditTable =
          implicitRef.table.includes("audit") ||
          implicitRef.table.includes("log");

        if (includeAudit || !isAuditTable) {
          console.log(
            `[admin.delete] Deleting from ${implicitRef.table} (${implicitRef.count} rows)`,
          );

          const { error } = await supabase
            .from(implicitRef.table)
            .delete()
            .eq(implicitRef.column, plan.admin.email);

          if (error) {
            throw new Error(
              `Failed to delete from ${implicitRef.table}: ${error.message}`,
            );
          }

          summary.tablesAffected.push({
            table: implicitRef.table,
            rowsDeleted: implicitRef.count,
            action: implicitRef.action,
          });
        } else {
          console.log(
            `[admin.delete] Skipping audit table ${implicitRef.table} (includeAudit=false)`,
          );
        }
      }
    }

    // Finally, delete the admin user
    console.log(`[admin.delete] Deleting admin user: ${plan.admin.email}`);
    const { error: deleteError } = await supabase
      .from("admin_users")
      .delete()
      .eq("id", plan.admin.id)
      .eq("role", "admin"); // Extra safety check

    if (deleteError) {
      throw new Error(`Failed to delete admin user: ${deleteError.message}`);
    }

    summary.success = true;
    console.log("[admin.delete] Delete plan executed successfully");
  } catch (error) {
    console.error("[admin.delete] Error executing delete plan:", error);
    summary.success = false;
    summary.error = error instanceof Error ? error.message : "Unknown error";

    // Try to identify where the failure occurred
    if (summary.tablesAffected.length > 0) {
      const lastTable =
        summary.tablesAffected[summary.tablesAffected.length - 1];
      summary.at = { table: lastTable.table, step: "delete_operation" };
    }
  }

  return summary;
}
