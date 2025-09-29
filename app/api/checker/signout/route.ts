import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/checker/signout
 * Sign out checker user and clear all authentication cookies
 */
export async function POST(_request: NextRequest) {
  try {
    // Create response object for cookie management
    const response = NextResponse.json(
      { success: true, message: "Signed out successfully" },
      { status: 200 },
    );

    // Clear key authentication cookies
    const cookiesToClear = [
      "checker-email",
      "admin-email",
      "sb-lojocjxgznpmeprsirwr-auth-token",
    ];

    // Clear each cookie
    cookiesToClear.forEach((cookieName) => {
      response.cookies.set({
        name: cookieName,
        value: "",
        expires: new Date(0),
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    });

    console.log("[checker/signout] Authentication cookies cleared");

    return response;
  } catch (error) {
    console.error("Error in /api/checker/signout:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
