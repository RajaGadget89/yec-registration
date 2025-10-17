// app/api/admin/registrations/request-tcc-fix/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase";
import { createHash, randomUUID } from "crypto";

export const runtime = "nodejs";

type Json = Record<string, any>;
const nowISO = () => new Date().toISOString();

function getAdminClient() {
  return getSupabaseServerClient();
}

function appBaseUrl() {
  const v =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_BASE_URL ||
    "http://localhost:8080";
  return v.replace(/\/$/, "");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // (optional) protect endpoint
    const requiredSecret = process.env.CRON_SECRET || process.env.X_CRON_SECRET;
    if (requiredSecret) {
      const got = req.headers.get("x-cron-secret");
      if (got !== requiredSecret)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      email?: string;
      registrationId?: string;
      reason?: string;
    };
    if (!body.email && !body.registrationId) {
      return NextResponse.json(
        { error: "email or registrationId is required" },
        { status: 400 },
      );
    }
    const reason = body.reason || "Please re-upload your TCC card image.";

    const supabase = getAdminClient();

    // 1) find registration
    let reg: { id: string; email: string } | null = null;
    if (body.email) {
      const { data } = await supabase
        .from("registrations")
        .select("id,email")
        .eq("email", body.email)
        .limit(1)
        .maybeSingle();
      reg = data ?? null;
    }
    if (!reg && body.registrationId) {
      const { data } = await supabase
        .from("registrations")
        .select("id,email")
        .eq("id", body.registrationId)
        .limit(1)
        .maybeSingle();
      reg = data ?? null;
    }
    if (!reg)
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 },
      );

    // 2) create token row using the same approach as the working test endpoint
    const tokenUUID = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Hash the token for storage (same as test endpoint)
    const tokenHash = createHash("sha256").update(tokenUUID).digest("hex");

    const { data: ins, error: insErr } = await (supabase as any)
      .from("deep_link_tokens")
      .insert({
        token_hash: tokenHash,
        token_id: tokenUUID,
        registration_id: (reg as any).id,
        dimension: "tcc",
        expires_at: expiresAt,
        created_at: nowISO(),
        created_by: "api",
      })
      .select("token_id")
      .single();

    if (insErr || !ins?.token_id) {
      console.warn("[tcc-fix] insert deep_link_tokens warn:", insErr?.message);
      return NextResponse.json(
        { error: "cannot create token row" },
        { status: 500 },
      );
    }

    const publicTokenUUID: string = ins.token_id; // public token
    const deepLink = `${appBaseUrl()}/update?token=${publicTokenUUID}`;

    // 3) enqueue email (เติม html_content ให้ผ่าน not-null)
    const payload = { deepLink, reason, registrationId: (reg as any).id };
    const { error: outErr } = await (supabase as any)
      .from("email_outbox")
      .insert({
        template: "tcc_fix_request",
        to_email: (reg as any).email,
        subject: "[Action Required] Please re-upload your TCC card",
        html_content: `<p>Please re-upload your TCC card: <a href="${deepLink}">${deepLink}</a></p>`,
        payload,
        status: "pending",
        attempts: 0,
        max_attempts: 5,
        created_at: nowISO(),
      } as Json);
    if (outErr) console.warn("[tcc-fix] email_outbox warn:", outErr.message);

    // (ไม่อัปเดตตาราง registrations ตอนนี้ เพื่อเลี่ยง check constraint)
    return NextResponse.json(
      {
        ok: true,
        deepLink,
        registration: { id: (reg as any).id, email: (reg as any).email },
      },
      { status: 200 },
    );
  } catch (e: any) {
    console.error("[tcc-fix] fatal:", e?.message || e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
