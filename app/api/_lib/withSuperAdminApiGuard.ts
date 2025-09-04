import { NextResponse } from "next/server";
import { ApiHandler, ApiCtx } from "./types";

// Robust cookie parsing function
function parseCookieValue(
  cookieHeader: string | null,
  cookieName: string,
): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(`${cookieName}=`)) {
      const value = cookie.substring(cookieName.length + 1);
      // URL decode the value
      try {
        return decodeURIComponent(value);
      } catch {
        return value; // Return as-is if decoding fails
      }
    }
  }
  return null;
}

export function withSuperAdminApiGuard(h: ApiHandler): ApiHandler {
  return async (req, ctx) => {
    try {
      // Enhanced debug logging
      console.log(`[SUPER_ADMIN_GUARD] Processing request to ${req.url}`);
      console.log(`[SUPER_ADMIN_GUARD] Environment variables:`, {
        DEV_ADMIN_DELETE_ENABLED: process.env.DEV_ADMIN_DELETE_ENABLED,
        NODE_ENV: process.env.NODE_ENV,
        APP_ENV: process.env.APP_ENV,
      });

      let adminEmail: string | null = null;
      let authMethod: "cookie" | "supabase-session" | "none" = "none";

      // Method 1: Try robust cookie parsing first
      const cookieHeader = req.headers.get("cookie");
      adminEmail = parseCookieValue(cookieHeader, "admin-email");

      if (adminEmail) {
        authMethod = "cookie";
        console.log(
          `[SUPER_ADMIN_GUARD] Found admin-email cookie: ${adminEmail}`,
        );
      }

      // Method 2: Fallback to Supabase session authentication
      if (!adminEmail) {
        console.log(
          `[SUPER_ADMIN_GUARD] No admin-email cookie, trying Supabase session fallback`,
        );

        try {
          const { createServerClient } = await import("@supabase/ssr");
          const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
              cookies: {
                get: (name: string) =>
                  req.headers
                    .get("cookie")
                    ?.split(`${name}=`)[1]
                    ?.split(";")[0],
                set: () => {},
                remove: () => {},
              },
            },
          );

          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (!sessionError && session?.user?.email) {
            // Check if this user is an admin
            const { isAdmin } = await import("../../lib/admin-guard");
            if (isAdmin(session.user.email)) {
              adminEmail = session.user.email;
              authMethod = "supabase-session";
              console.log(
                `[SUPER_ADMIN_GUARD] Supabase session authentication successful: ${adminEmail}`,
              );
            }
          }
        } catch (error) {
          console.log(
            `[SUPER_ADMIN_GUARD] Supabase session fallback failed:`,
            error,
          );
        }
      }

      console.log("[SUPER_ADMIN_GUARD] Final admin email:", adminEmail);

      if (!adminEmail) {
        console.log(
          `[SUPER_ADMIN_GUARD] Access denied - no valid authentication found`,
        );
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
          `[SUPER_ADMIN_GUARD] Access denied - not in admin allowlist: ${adminEmail}`,
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
        .eq("email", adminEmail.toLowerCase())
        .single();

      if (error || !adminUser) {
        console.log(
          `[SUPER_ADMIN_GUARD] Access denied - user not found in database: ${adminEmail}`,
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
        console.log(
          `[SUPER_ADMIN_GUARD] Access denied - not super_admin role: ${adminUser.role}`,
        );
        return NextResponse.json(
          {
            error: "Forbidden: Super admin access required",
            code: "SUPER_ADMIN_REQUIRED",
          },
          { status: 403 },
        );
      }

      if (!adminUser.is_active) {
        console.log(
          `[SUPER_ADMIN_GUARD] Access denied - user not active: ${adminEmail}`,
        );
        return NextResponse.json(
          {
            error: "Forbidden: Admin account is not active",
            code: "ADMIN_INACTIVE",
          },
          { status: 403 },
        );
      }

      // Log successful authentication
      console.log(
        `[SUPER_ADMIN_API_ACCESS] ${adminEmail} accessed ${req.url} via ${authMethod}`,
      );

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
