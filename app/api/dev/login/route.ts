import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Disable in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "disabled in production" },
      { status: 404 },
    );
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email || email.trim() === "") {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const trimmedEmail = email.trim();

  // Set httpOnly cookie
  const response = NextResponse.json({ ok: true, email: trimmedEmail });
  response.cookies.set("dev-user-email", trimmedEmail, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 86400, // 24 hours
  });

  return response;
}

export async function POST(request: Request) {
  // Disable in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "disabled in production" },
      { status: 404 },
    );
  }

  try {
    const body = await request.json();
    const { email } = body;

    if (!email || email.trim() === "") {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const trimmedEmail = email.trim();

    // Set httpOnly cookie
    const response = NextResponse.json({ ok: true, email: trimmedEmail });
    response.cookies.set("dev-user-email", trimmedEmail, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 86400, // 24 hours
    });

    return response;
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }
}
