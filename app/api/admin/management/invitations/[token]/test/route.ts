import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse> {
  const { token } = await params;
  
  return NextResponse.json({
    message: "Test route working",
    token: token
  });
}
