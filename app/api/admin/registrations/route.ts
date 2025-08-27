import { NextRequest, NextResponse } from "next/server";
import { maybeServiceClient } from "../../../lib/supabase/server";
import { getCurrentUserFromRequest } from "../../../lib/auth-utils.server";
import { isAdmin } from "../../../lib/admin-guard";
import { withAuditLogging } from "../../../lib/audit/withAuditAccess";

async function handleGET(request: NextRequest) {
  try {
    // Check admin authentication
    const user = await getCurrentUserFromRequest(request);
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // Get appropriate Supabase client (service client if E2E bypass enabled)
    const supabase = await maybeServiceClient(request);

    // Fetch all registrations from the database
    const { data: registrations, error } = await supabase
      .from("registrations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch registrations:", error);
      return NextResponse.json(
        { error: "Failed to fetch registrations", message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(registrations);
  } catch (error) {
    console.error("Failed to get registrations:", error);
    return NextResponse.json(
      {
        error: "Failed to get registrations",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export const GET = withAuditLogging(handleGET, {
  resource: "admin_registrations_list",
});
