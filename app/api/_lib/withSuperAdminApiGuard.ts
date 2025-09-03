import { NextResponse } from "next/server";
import { ApiHandler, ApiCtx } from "./types";

export function withSuperAdminApiGuard(h: ApiHandler): ApiHandler {
  return async (req, ctx) => {
    try {
      // Check admin authentication - prefer header only in E2E mode; otherwise cookie
      let adminEmail: string | null = null;
      const isE2E = process.env.E2E_TESTS === "true";

      if (isE2E) {
        adminEmail = req.headers.get("admin-email");
        if (!adminEmail) {
          adminEmail =
            req.headers
              .get("cookie")
              ?.split("admin-email=")[1]
              ?.split(";")[0] || null;
        }
      } else {
        adminEmail =
          req.headers.get("cookie")?.split("admin-email=")[1]?.split(";")[0] ||
          null;
      }

      console.log("[SUPER_ADMIN_GUARD] Final admin email:", adminEmail);

      if (!adminEmail) {
        console.log("[SUPER_ADMIN_GUARD] Access denied - no admin email");
        return NextResponse.json(
          {
            error: "Unauthorized. Admin access required.",
            code: "ADMIN_ACCESS_REQUIRED",
          },
          { status: 401 },
        );
      }

      // Check if user is in admin allowlist
      const { isAdmin } = await import("../../lib/admin-guard");
      if (!isAdmin(adminEmail)) {
        console.log(
          "[SUPER_ADMIN_GUARD] Access denied - not in admin allowlist",
        );
        return NextResponse.json(
          {
            error: "Unauthorized. Admin access required.",
            code: "ADMIN_ACCESS_REQUIRED",
          },
          { status: 401 },
        );
      }

      // Check if user has super_admin role in database
      const { getSupabaseServiceClient } = await import(
        "../../lib/supabase-server"
      );
      const supabase = getSupabaseServiceClient();

      const { data: adminUser, error } = await supabase
        .from("admin_users")
        .select("id, role, is_active")
        .eq("email", adminEmail || "")
        .single();

      if (error || !adminUser) {
        console.log(
          "[SUPER_ADMIN_GUARD] Access denied - user not found in database",
        );
        return NextResponse.json(
          {
            error: "Unauthorized. Admin access required.",
            code: "ADMIN_ACCESS_REQUIRED",
          },
          { status: 401 },
        );
      }

      if (adminUser.role !== "super_admin") {
        console.log("[SUPER_ADMIN_GUARD] Access denied - not super_admin role");
        return NextResponse.json(
          {
            error: "Forbidden: Super admin access required",
            code: "SUPER_ADMIN_REQUIRED",
          },
          { status: 403 },
        );
      }

      if (!adminUser.is_active) {
        console.log("[SUPER_ADMIN_GUARD] Access denied - user not active");
        return NextResponse.json(
          {
            error: "Forbidden: Admin account is not active",
            code: "ADMIN_INACTIVE",
          },
          { status: 403 },
        );
      }

      // Log admin access for audit
      console.log(`[SUPER_ADMIN_API_ACCESS] ${adminEmail} accessed ${req.url}`);

      // Create user context and call handler
      const userCtx: ApiCtx = {
        ...ctx,
        me: {
          id: adminUser.id || adminEmail,
          email: adminEmail,
          role: adminUser.role as "admin" | "super_admin",
        },
      };

      return await h(req, userCtx); // ✅ propagate me and return handler result
    } catch (error) {
      console.error("[SUPER_ADMIN_API_GUARD] Error:", error);

      if (error instanceof Error && error.message.includes("Unauthorized")) {
        return NextResponse.json(
          {
            error: "Unauthorized. Admin access required.",
            code: "ADMIN_ACCESS_REQUIRED",
          },
          { status: 401 },
        );
      }

      return NextResponse.json(
        {
          error: "Internal server error",
          code: "INTERNAL_ERROR",
        },
        { status: 500 },
      );
    }
  };
}
