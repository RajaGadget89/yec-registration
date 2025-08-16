import { NextResponse } from "next/server";

export async function GET() {
  // Disable in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "disabled in production" },
      { status: 404 },
    );
  }

  // Clear the dev cookie
  const response = NextResponse.json({ ok: true });
  response.cookies.set("dev-user-email", "", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 0, // Expire immediately
  });

  return response;
}

export async function POST() {
  // Disable in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "disabled in production" },
      { status: 404 },
    );
  }

  // Clear the dev cookie
  const response = NextResponse.json({ ok: true });
  response.cookies.set("dev-user-email", "", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 0, // Expire immediately
  });

  return response;
}
