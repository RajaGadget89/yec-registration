import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const cookies = request.cookies;

    // Check for the three auth cookies
    const adminEmail = cookies.get("admin-email")?.value;
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    // Get all cookie names for debugging
    const allCookieNames = Array.from(cookies.getAll()).map((c) => c.name);

    const result = {
      timestamp: new Date().toISOString(),
      authCookies: {
        "admin-email": adminEmail ? "present" : "missing",
        "sb-access-token": accessToken ? "present" : "missing",
        "sb-refresh-token": refreshToken ? "present" : "missing",
      },
      allCookies: allCookieNames,
      totalCookies: allCookieNames.length,
      maskedTokens: {
        accessToken: accessToken
          ? `${accessToken.substring(0, 4)}...${accessToken.substring(accessToken.length - 4)}`
          : null,
        refreshToken: refreshToken
          ? `${refreshToken.substring(0, 4)}...${refreshToken.substring(refreshToken.length - 4)}`
          : null,
      },
    };

    console.log("[auth-debug] _diag/cookies: checking cookies");
    console.log(
      "[auth-debug] _diag/cookies: auth cookies present:",
      Object.values(result.authCookies).filter((v) => v === "present").length,
      "/ 3",
    );
    console.log(
      "[auth-debug] _diag/cookies: total cookies:",
      result.totalCookies,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[auth-debug] _diag/cookies error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { error: "Method not allowed. Use GET to check cookies." },
    { status: 405 },
  );
}
