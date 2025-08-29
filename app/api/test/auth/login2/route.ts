import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  console.log("Login2 endpoint reached!");
  
  return NextResponse.json({ message: "Login2 endpoint working" });
}
