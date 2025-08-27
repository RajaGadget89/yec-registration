import { NextRequest, NextResponse } from "next/server";
import {
  withAdminApiGuard,
  validateAdminAccess,
} from "@/app/lib/admin-guard-server";
import { generateSignedUrl } from "@/app/lib/uploadFileToSupabase";
import { getServiceRoleClient } from "@/app/lib/supabase-server";

// GET /api/admin/files/signed-url?registrationId=...&path=...
export const GET = withAdminApiGuard(async (req: NextRequest) => {
  const url = new URL(req.url);
  const registrationId = url.searchParams.get("registrationId");
  const path = url.searchParams.get("path");

  console.log(
    `[SIGNED_URL_API] Request: registrationId=${registrationId}, path=${path}`,
  );

  if (!registrationId || !path) {
    console.log(
      `[SIGNED_URL_API] Missing parameters: registrationId=${registrationId}, path=${path}`,
    );
    return NextResponse.json(
      { error: "Missing parameters", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  // Basic auth check (any admin role) via validateAdminAccess
  const access = validateAdminAccess(req);
  console.log(`[SIGNED_URL_API] Admin access check:`, access);

  if (!access.valid) {
    console.log(`[SIGNED_URL_API] Admin access denied:`, access.error);
    return NextResponse.json(
      { error: "Forbidden", code: "ADMIN_FORBIDDEN" },
      { status: 403 },
    );
  }

  // Validate the requested path belongs to this registration
  const supabase = getServiceRoleClient();
  console.log(`[SIGNED_URL_API] Looking up registration ${registrationId}`);

  const { data, error } = await supabase
    .from("registrations")
    .select(
      "id, profile_image_url, chamber_card_url, payment_slip_url, badge_url",
    )
    .eq("id", registrationId)
    .maybeSingle();

  if (error) {
    console.error(`[SIGNED_URL_API] Database lookup error:`, error);
    return NextResponse.json(
      { error: "Lookup failed", code: "DB_ERROR" },
      { status: 500 },
    );
  }

  if (!data) {
    console.log(`[SIGNED_URL_API] Registration not found: ${registrationId}`);
    return NextResponse.json(
      { error: "Registration not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  console.log(`[SIGNED_URL_API] Registration found:`, {
    id: data.id,
    profile_image_url: data.profile_image_url,
    chamber_card_url: data.chamber_card_url,
    payment_slip_url: data.payment_slip_url,
    badge_url: data.badge_url,
  });

  const allowedPaths = [
    data.profile_image_url,
    data.chamber_card_url,
    data.payment_slip_url,
    data.badge_url,
  ].filter(Boolean) as string[];

  console.log(`[SIGNED_URL_API] Allowed paths:`, allowedPaths);
  console.log(`[SIGNED_URL_API] Requested path: ${path}`);

  if (!allowedPaths.some((p) => p === path)) {
    console.log(
      `[SIGNED_URL_API] Path mismatch: requested=${path}, allowed=${allowedPaths}`,
    );
    return NextResponse.json(
      { error: "Path not owned by registration", code: "PATH_MISMATCH" },
      { status: 403 },
    );
  }

  try {
    console.log(`[SIGNED_URL_API] Generating signed URL for path: ${path}`);

    // Check if the path is already a full URL (from public bucket)
    if (path.startsWith("http")) {
      console.log(
        `[SIGNED_URL_API] Path is already a full URL, returning as-is`,
      );
      return NextResponse.json({ url: path });
    }

    // Short-lived URL, 10 minutes
    const signed = await generateSignedUrl(path, 600);
    console.log(`[SIGNED_URL_API] Successfully generated signed URL`);
    return NextResponse.json({ url: signed });
  } catch (error) {
    console.error("[SIGNED_URL_API] Failed to generate signed URL:", error);
    return NextResponse.json(
      { error: "Failed to sign", code: "SIGN_ERROR" },
      { status: 500 },
    );
  }
});
