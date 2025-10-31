import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "../../../../lib/auth-utils.server";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    if (user.role !== "super_admin" && user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Create template data based on your actual CSV structure
    const templateData = [
      {
        ลำดับ: "1",
        คำนำหน้า: "นาย ( Mr. )",
        "ชื่อ-สกุล": "ประมนต์ สุธีวงศ์", // Individual participant
        ตำแหน่ง: "ประธานกิตติมศักดิ์หอการค้าไทย",
        ตำแหน่งผู้เข้าร่วมงาน: "ประธานกิตติมศักดิ์",
        จังหวัด: "",
        ระบุภาค: "",
        ภาค: "",
        เพศ: "ชาย",
        มาจริง: "",
        "รับ Tag": "",
        "รหัส นง.": "1. หอการค้าไทย (สีฟ้า)",
        Code: "1.1 กรรมการหอการค้าไทย (ในสิทธิ์)",
        "โรงแรม/ที่พัก": "โรงแรมบุรีศรีภู Buri Sriphu Hotel | Hat Yai",
        วันที่เข้า: "21/11/2025",
        วันที่ออก: "23/11/2025",
        "ประเภทห้อง/เตียง": "",
        จำนวนห้อง: "1",
        ค่ากิจกรรม: "0",
        ค่าที่พัก: "0",
        ค่างานเลี้ยงภาคค่ำ: "0",
        สถานะชำระเงิน: "ฟรี",
        อีเมล: "pramon22@gmail.com",
        เบอร์มือถือ: "818313388",
        "ขาไป (การเดินทาง)": "เครื่องบิน",
        "ขากลับ (การเดินทาง)": "เครื่องบิน",
      },
      {
        ลำดับ: "2",
        คำนำหน้า: "",
        "ชื่อ-สกุล": "", // BLANK NAME - Reserved Seat
        ตำแหน่ง: "ผู้ติดตามวิทยากร", // Reserved seat position
        ตำแหน่งผู้เข้าร่วมงาน: "",
        จังหวัด: "",
        ระบุภาค: "",
        ภาค: "",
        เพศ: "ชาย",
        มาจริง: "",
        "รับ Tag": "",
        "รหัส นง.": "2. แขกรับเชิญ (สีแดง)",
        Code: "2.2 ผู้ติดตามแขกรับเชิญ (นอกสิทธิ์)",
        "โรงแรม/ที่พัก": "โรงแรมบุรีศรีภู Buri Sriphu Hotel | Hat Yai",
        วันที่เข้า: "21/11/2025",
        วันที่ออก: "23/11/2025",
        "ประเภทห้อง/เตียง": "",
        จำนวนห้อง: "",
        ค่ากิจกรรม: "",
        ค่าที่พัก: "",
        ค่างานเลี้ยงภาคค่ำ: "",
        สถานะชำระเงิน: "",
        อีเมล: "",
        เบอร์มือถือ: "",
        "ขาไป (การเดินทาง)": "เครื่องบิน",
        "ขากลับ (การเดินทาง)": "",
      },
    ];

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Create worksheet with actual column names
    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Add instructions
    const instructions = [
      ["INSTRUCTIONS FOR SEMINAR PARTICIPANTS IMPORT:"],
      [""],
      ["1. REQUIRED COLUMNS:"],
      ["   - ชื่อ-สกุล (Full Name): REQUIRED for individual participants"],
      ["   - ตำแหน่ง (Position): Helps identify participant roles"],
      ["   - โรงแรม/ที่พัก (Hotel): Accommodation details"],
      ["   - วันที่เข้า/ออก (Check-in/out): Event dates"],
      [""],
      ["2. RESERVED SEATS:"],
      ["   - Leave ชื่อ-สกุล BLANK for reserved seats"],
      ['   - Fill ตำแหน่ง with "ผู้ติดตามวิทยากร" or similar'],
      ['   - System will create "Reserved Seat - [Position]" entries'],
      [""],
      ["3. SUPPORTED DATA:"],
      ["   - Email: อีเมล column"],
      ["   - Phone: เบอร์มือถือ column"],
      ["   - Payment: สถานะชำระเงิน column"],
      ["   - Transport: ขาไป/ขากลับ columns"],
      [""],
      ["4. EXAMPLE ROWS:"],
      ["   - Row 1: Individual participant with full name"],
      ["   - Row 2: Reserved seat with blank name"],
      [""],
      ["START YOUR DATA BELOW:"],
    ];

    // Insert instructions at the top
    XLSX.utils.sheet_add_aoa(worksheet, instructions, { origin: "A1" });

    // Add the template data after instructions
    XLSX.utils.sheet_add_json(worksheet, templateData, {
      origin: `A${instructions.length + 2}`,
      skipHeader: false,
    });

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Seminar Participants");

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Return file
    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="seminar-participants-template.xlsx"',
        "Content-Length": excelBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error generating template:", error);
    return NextResponse.json(
      { error: "Failed to generate template" },
      { status: 500 },
    );
  }
}
