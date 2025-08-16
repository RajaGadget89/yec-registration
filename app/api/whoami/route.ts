import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getServiceRoleClient } from "../../lib/supabase-server";
import { WhoAmIResponse } from "../../types";

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
    // Remove any non-printable characters and URL encoding artifacts
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
      error: userError,
    } = await supabase.auth.getUser();
    let email = user?.email ?? null;

    // Fallback for E2E testing: check for admin-email or dev-user-email cookie
    if (!email && process.env.NODE_ENV !== "production") {
      const adminEmail = req.cookies.get("admin-email")?.value;
      const devEmail = req.cookies.get("dev-user-email")?.value;
      if (adminEmail) {
        email = adminEmail;
        console.log("[whoami] using admin-email fallback:", email);
      } else if (devEmail) {
        email = devEmail;
        console.log("[whoami] using dev-user-email fallback:", email);
      }
    }

    let isAdmin = false;
    if (email) {
      try {
        const svc = getServiceRoleClient();
        const { data, error } = await svc
          .from("admin_users")
          .select("email,is_active")
          .ilike("email", email)
          .eq("is_active", true)
          .maybeSingle();

        if (error) {
          console.error("[whoami] database error:", error);
          // Fallback: check if email is in ADMIN_EMAILS environment variable
          const adminEmails =
            process.env.ADMIN_EMAILS?.split(",").map((e) =>
              e.trim().toLowerCase(),
            ) || [];
          isAdmin = adminEmails.includes(email.toLowerCase());
        } else {
          isAdmin = !!data;
        }
      } catch (e) {
        console.error("[whoami] unexpected error:", e);
        // Fallback: check if email is in ADMIN_EMAILS environment variable
        const adminEmails =
          process.env.ADMIN_EMAILS?.split(",").map((e) =>
            e.trim().toLowerCase(),
          ) || [];
        isAdmin = adminEmails.includes(email.toLowerCase());
      }
    }

    const body: WhoAmIResponse = {
      user: email
        ? {
            id: user?.id || "unknown",
            email,
            role: isAdmin ? "admin" : "user",
            firstName: user?.user_metadata?.first_name,
            lastName: user?.user_metadata?.last_name,
          }
        : undefined,
      session: user
        ? {
            id: user.id,
            expiresAt: new Date().toISOString(), // This would need to be extracted from the actual session
          }
        : undefined,
      isAuthenticated: Boolean(email),
    };

    if (process.env.NODE_ENV !== "production") {
      (body as WhoAmIResponse & { debug?: unknown }).debug = {
        hasTokens: Boolean(
          (tokens as AuthTokens).access_token &&
            (tokens as AuthTokens).refresh_token,
        ),
        userError: userError?.message,
        devEmail: req.cookies.get("dev-user-email")?.value || null,
      };
    }

    return NextResponse.json(body, { status: 200, headers: res.headers });
  } catch (error) {
    console.error("[whoami] unexpected error:", error);
    return NextResponse.json(
      {
        email: null,
        isAdmin: false,
        source: null,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
