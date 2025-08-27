import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  getRolesForEmail,
  getEnvBuildId,
  logRBACInfo,
  normalizeEmail,
} from "../../../lib/rbac";
import type { Role } from "../../../lib/rbac";

export const dynamic = "force-dynamic";

function getProjectRef() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return new URL(url).hostname.split(".")[0];
}

function readModernCookie(req: NextRequest) {
  try {
    const name = `sb-${getProjectRef()}-auth-token`;
    const raw = req.cookies.get(name)?.value;
    if (!raw) return null;

    // value often looks like "base64-<b64>"
    const b64 = raw.startsWith("base64-") ? raw.slice(7) : raw;
    const jsonStr = Buffer.from(b64, "base64").toString("utf8");

    // Clean up any trailing characters that might cause JSON parsing issues
    const cleanJsonStr = jsonStr
      .replace(/[^\x20-\x7E]*$/, "")
      .replace(/[%]+$/, "");

    // Try to find the last complete JSON object
    const lastBrace = cleanJsonStr.lastIndexOf("}");
    if (lastBrace === -1) return null;

    const truncatedJson = cleanJsonStr.substring(0, lastBrace + 1);
    const json = JSON.parse(truncatedJson);

    const access_token = json?.access_token;
    const refresh_token = json?.refresh_token;
    if (access_token && refresh_token) {
      return { access_token, refresh_token, source: "modern" as const };
    }
  } catch {
    // ignore; will fallback to legacy
  }
  return null;
}

function readLegacyCookies(req: NextRequest) {
  const access_token = req.cookies.get("sb-access-token")?.value;
  const refresh_token = req.cookies.get("sb-refresh-token")?.value;
  if (access_token && refresh_token) {
    return { access_token, refresh_token, source: "legacy" };
  }
  return null;
}

function pickTokens(req: NextRequest) {
  return readModernCookie(req) ?? readLegacyCookies(req) ?? { source: null };
}

interface AuthTokens {
  access_token?: string;
  refresh_token?: string;
  source?: string;
}

interface AdminMeResponse {
  email: string;
  roles: Role[];
  envBuildId: string;
}

export async function GET(req: NextRequest) {
  try {
    const tokens = pickTokens(req);

    // Create a response object for cookie handling
    const res = new NextResponse();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (key: string) => req.cookies.get(key)?.value,
          set: (key, value, options) => {
            // Forward any cookie mutations to the response
            res.cookies.set({ name: key, value, ...options });
          },
          remove: (key, options) => {
            res.cookies.set({
              name: key,
              value: "",
              ...options,
              expires: new Date(0),
            });
          },
        },
      },
    );

    // If we found tokens (modern or legacy), set them on the server client.
    if (
      (tokens as AuthTokens).access_token &&
      (tokens as AuthTokens).refresh_token
    ) {
      await supabase.auth.setSession({
        access_token: (tokens as AuthTokens).access_token ?? "",
        refresh_token: (tokens as AuthTokens).refresh_token ?? "",
      });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    let email = user?.email ?? null;

    // Fallback for E2E testing: check for admin-email or dev-user-email cookie
    if (!email && process.env.NODE_ENV !== "production") {
      const adminEmail = req.cookies.get("admin-email")?.value;
      const devEmail = req.cookies.get("dev-user-email")?.value;
      if (adminEmail) {
        email = adminEmail;
        console.log("[admin/me] using admin-email fallback:", email);
      } else if (devEmail) {
        email = devEmail;
        console.log("[admin/me] using dev-user-email fallback:", email);
      }
    }

    if (!email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user roles from RBAC system
    const roles = getRolesForEmail(email);

    // Log RBAC info for debugging
    logRBACInfo(email, roles);

    // Check if user has any admin roles
    if (roles.size === 0) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const response: AdminMeResponse = {
      email: normalizeEmail(email),
      roles: Array.from(roles),
      envBuildId: getEnvBuildId(),
    };

    return NextResponse.json(response, { status: 200, headers: res.headers });
  } catch (error) {
    console.error("[admin/me] unexpected error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
