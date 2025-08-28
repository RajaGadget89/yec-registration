import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "../../../lib/auth-utils.server";
import { guardTestEndpoint } from "@/app/lib/test-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const guard = guardTestEndpoint(request);
  if (!guard.allowed) {
    return new Response(guard.message, { status: guard.status });
  }

  console.log("[AUTH_TEST] Endpoint called");
  
  try {
    const user = await getCurrentUserFromRequest(request);
    console.log("[AUTH_TEST] User:", user);
    
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        is_active: user.is_active
      }
    });
  } catch (error) {
    console.error("[AUTH_TEST] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
