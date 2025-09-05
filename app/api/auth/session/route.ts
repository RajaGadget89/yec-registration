import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
// import { createSupabaseCookieHandler } from "../../../lib/cookie-utils";

function must(v?: string) {
  if (!v) throw new Error("Missing env");
  return v;
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const res = NextResponse.json({ ok: true });

  const supabase = createServerClient(
    must(process.env.NEXT_PUBLIC_SUPABASE_URL),
    must(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          res.cookies.set(name, value, options);
        },
        remove(name, options) {
          res.cookies.set(name, "", { ...options, expires: new Date(0) });
        },
      },
    },
  );

  const body = await req.json().catch(() => ({}) as any);

  try {
    if (body.access_token && body.refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token: body.access_token,
        refresh_token: body.refresh_token,
      });
      if (error)
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 401 },
        );
      return res; // cookie written
    }

    if (body.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(body.code);
      if (error)
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 401 },
        );
      return res; // cookie written
    }

    return NextResponse.json(
      { ok: false, error: "missing credentials" },
      { status: 400 },
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 },
    );
  }
}
