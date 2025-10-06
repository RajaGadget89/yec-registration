import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { validateSuperAdminAccess } from "@/lib/auth/admin-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    // Validate super admin access
    const adminValidation = await validateSuperAdminAccess(request);
    if (!adminValidation.valid) {
      return NextResponse.json(
        { error: "Unauthorized", message: adminValidation.error },
        { status: 401 },
      );
    }

    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Bad Request", message: "Session ID is required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from("import_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("admin_user_id", adminValidation.user?.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Not Found", message: "Import session not found" },
        { status: 404 },
      );
    }

    // Get parsed data from session metadata
    const parsedData = session.metadata?.parsed_data;
    if (!parsedData) {
      // Fallback: return a known header set so user can still proceed to mapping
      const fallbackHeaders = [
        "Timestamp",
        "ชื่อ",
        "นามสกุล",
        "เพศ",
        "ชื่อเล่น",
        "เบอร์โทรศัพท์",
        "Line ID",
        "สมาชิกหอการค้า / YEC จังหวัด?",
        "ประเภทธุรกิจ",
        "ชื่อ ผู้พักร่วม",
        "นามสกุล ผู้พักร่วม",
        "ประเภทการเดินทาง",
        "บัตรสมาชิก TCC Connect",
        "Check TCC",
        "รูป Profile",
        "Check Profile Pic",
        "ชื่อกิจการ หรือ บริษัท",
        "ต้องการซื้อบัตรแบบไหน",
        "โรงแรมที่พัก",
        "สลิปโอนเงิน",
        "Check Slip",
        "time",
        "หมายเหตุ",
        "ภาค",
        "ผู้ลงทะเบียน (TRIM)",
        "ผู้พักร่วม (TRIM)",
        "Column 27",
      ];
      return NextResponse.json({
        success: true,
        columns: fallbackHeaders,
        totalRecords: session.total_records || 0,
        filename: session.csv_filename,
        warning: "parsed_data_missing",
      });
    }

    // Extract columns from the first sheet
    const firstSheet = parsedData[0];
    if (!firstSheet || !firstSheet.headers) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "No valid data found in the uploaded file.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      columns: firstSheet.headers,
      totalRecords: session.total_records,
      filename: session.csv_filename,
    });
  } catch (error) {
    console.error("Error in get columns:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to get CSV columns" },
      { status: 500 },
    );
  }
}
