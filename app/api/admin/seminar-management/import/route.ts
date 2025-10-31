import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "../../../../lib/auth-utils.server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { audit } from "../../../../lib/audit";
import * as XLSX from "xlsx";

// Helper to hard-limit text length to column constraints
function truncateText(value: string | null, maxLength: number): string | null {
  if (!value) return value;
  const text = String(value);
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength);
}

// Helper function to parse Thai date format (DD/MM/YYYY) to ISO date
function parseThaiDate(dateStr: string): string | null {
  if (!dateStr || dateStr === "--" || dateStr === "") return null;

  try {
    // Handle DD/MM/YYYY format
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    return null;
  } catch {
    return null;
  }
}

// Helper function to clean and validate text
function cleanText(text: any): string | null {
  if (!text) return null;
  const cleaned = String(text).trim();
  return cleaned === "" || cleaned === "--" ? null : cleaned;
}

// Helper function to parse numeric value
function parseNumeric(value: any): number | null {
  if (!value) return null;
  const num = parseFloat(String(value));
  return isNaN(num) ? null : num;
}

// Normalize Thai phone numbers: keep digits only, ensure leading 0 for 9-10 digit Thai numbers
function normalizeThaiPhone(value: any): string | null {
  if (!value) return null;
  let digits = String(value).replace(/[^0-9]/g, "");
  // If 9 digits and does not start with 0, prefix 0
  if (digits.length === 9 && digits[0] !== "0") {
    digits = "0" + digits;
  }
  // Cap to 10 digits typical mobile length
  if (digits.length > 10) digits = digits.slice(0, 10);
  return digits || null;
}

export async function POST(request: NextRequest) {
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

    // Parse query parameters for dry-run mode
    const url = new URL(request.url);
    const dryRun = url.searchParams.get("dryRun") === "true";
    const rowLimit = parseInt(url.searchParams.get("rowLimit") || "0");

    const supabase = getSupabaseServiceClient();
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (
      !file.name.endsWith(".xlsx") &&
      !file.name.endsWith(".xls") &&
      !file.name.endsWith(".csv")
    ) {
      return NextResponse.json(
        {
          error:
            "Only Excel files (.xlsx, .xls) or CSV files (.csv) are allowed",
        },
        { status: 400 },
      );
    }

    // Read file and parse based on type
    const buffer = await file.arrayBuffer();
    let headers: string[] = [];
    let dataRows: any[][] = [];
    let workbook: any = null; // ensure workbook is defined for Excel-only logic

    if (file.name.endsWith(".csv")) {
      // Parse CSV file with column realignment to handle unquoted commas in free-text fields
      console.log("Parsing CSV file...");
      const csvText = new TextDecoder("utf-8")
        .decode(buffer)
        .replace(/\r\n?/g, "\n");
      const rawLines = csvText.split("\n").filter((line) => line.trim());

      if (rawLines.length < 2) {
        return NextResponse.json(
          {
            error: "CSV file must have at least a header row and one data row",
          },
          { status: 400 },
        );
      }

      // Find header row (look for 'ชื่อ-สกุล')
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(10, rawLines.length); i++) {
        const row = rawLines[i].split(",");
        if (row.some((h) => h && h.includes("ชื่อ-สกุล"))) {
          headerRowIndex = i;
          break;
        }
      }

      if (headerRowIndex === -1) {
        return NextResponse.json(
          { error: "Could not find header row with 'ชื่อ-สกุล' in CSV file" },
          { status: 400 },
        );
      }

      headers = rawLines[headerRowIndex].split(",").map((h) => h.trim());
      const headerCount = headers.length;

      const detailsColIndex = headers.findIndex(
        (h) => h && h.includes("รายละเอียดค่าใช้จ่าย"),
      );

      const parsedRows: string[][] = [];
      for (let li = headerRowIndex + 1; li < rawLines.length; li++) {
        const line = rawLines[li];
        if (!line) continue;
        let cols = line.split(",").map((c) => c.trim());
        // Skip empty rows
        if (cols.every((c) => !c)) continue;

        if (cols.length > headerCount) {
          // Merge overflow into the long-text field to restore alignment
          const targetIdx =
            detailsColIndex !== -1 ? detailsColIndex : headerCount - 1;
          const before = cols.slice(0, targetIdx);
          const after = cols.slice(targetIdx);
          const neededTailCount = Math.max(0, headerCount - targetIdx - 1);
          const tail = neededTailCount > 0 ? after.slice(-neededTailCount) : [];
          const detailsMerged = after
            .slice(0, Math.max(0, after.length - neededTailCount))
            .join(",")
            .trim();
          cols = before.concat([detailsMerged]).concat(tail);
        } else if (cols.length < headerCount) {
          // Right-pad missing columns
          cols = cols.concat(Array(headerCount - cols.length).fill(""));
        }

        parsedRows.push(cols);
      }

      dataRows = parsedRows;
      console.log(
        `CSV parsed and realigned: ${headers.length} columns, ${dataRows.length} data rows`,
      );
    } else {
      // Parse Excel file
      workbook = XLSX.read(buffer, { type: "array" });
      console.log("Available sheets:", workbook.SheetNames);

      // Process main participant data sheet
      let mainWorksheet = null;

      // Try to find the main worksheet with participant data
      // Prioritize "Detail" sheet as it contains all necessary data
      const preferredSheets = ["Detail", "Orig"];
      let foundSheet = false;

      for (const preferredSheet of preferredSheets) {
        if (workbook.SheetNames.includes(preferredSheet)) {
          const sheet = workbook.Sheets[preferredSheet];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

          if (jsonData.length >= 2) {
            // Look for the row with the actual headers (skip title rows)
            let headerRowIndex = -1;
            for (let i = 0; i < Math.min(10, jsonData.length); i++) {
              const row = jsonData[i] as string[];
              if (row && row.some((h) => h && h.includes("ชื่อ-สกุล"))) {
                headerRowIndex = i;
                break;
              }
            }

            if (headerRowIndex !== -1) {
              mainWorksheet = sheet;
              headers = jsonData[headerRowIndex] as string[];
              dataRows = jsonData.slice(headerRowIndex + 1) as any[][];
              console.log(
                `Using preferred sheet: ${preferredSheet}, header row: ${headerRowIndex}`,
              );
              foundSheet = true;
              break;
            }
          }
        }
      }

      // Fallback to any sheet with 'ชื่อ-สกุล' if preferred sheets not found
      if (!foundSheet) {
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

          if (jsonData.length < 2) continue;

          // Look for the row with the actual headers (skip title rows)
          let headerRowIndex = -1;
          for (let i = 0; i < Math.min(10, jsonData.length); i++) {
            const row = jsonData[i] as string[];
            if (row && row.some((h) => h && h.includes("ชื่อ-สกุล"))) {
              headerRowIndex = i;
              break;
            }
          }

          if (headerRowIndex !== -1) {
            mainWorksheet = sheet;
            headers = jsonData[headerRowIndex] as string[];
            dataRows = jsonData.slice(headerRowIndex + 1) as any[][];
            console.log(
              `Using fallback sheet: ${sheetName}, header row: ${headerRowIndex}`,
            );
            break;
          }
        }
      }

      if (!mainWorksheet) {
        return NextResponse.json(
          {
            error:
              "Could not find a worksheet with the expected headers (ชื่อ-สกุล). Available sheets: " +
              workbook.SheetNames.join(", "),
          },
          { status: 400 },
        );
      }
    }

    if (dataRows.length === 0) {
      return NextResponse.json(
        { error: "No data rows found in the file" },
        { status: 400 },
      );
    }

    // Process transportation data from main sheet (Detail)
    const transportationData = {
      outbound: [] as any[],
      return: [] as any[],
    };

    // Extract transportation data from main sheet columns
    console.log("Processing transportation data from main sheet...");

    // Find transportation column indices in main sheet
    const outboundTransportCol = headers.findIndex(
      (h) => h && h.includes("ขาไป (การเดินทาง)"),
    );
    const outboundDetailsCol = headers.findIndex(
      (h) =>
        h &&
        h.includes("รายละเอียด") &&
        outboundTransportCol !== -1 &&
        headers.indexOf(h) > outboundTransportCol,
    );
    const returnTransportCol = headers.findIndex(
      (h) => h && h.includes("ขากลับ (การเดินทาง)"),
    );
    const returnDetailsCol = headers.findIndex(
      (h) =>
        h &&
        h.includes("รายละเอียด") &&
        returnTransportCol !== -1 &&
        headers.indexOf(h) > returnTransportCol,
    );

    console.log("Transportation column indices:", {
      outboundTransport: outboundTransportCol,
      outboundDetails: outboundDetailsCol,
      returnTransport: returnTransportCol,
      returnDetails: returnDetailsCol,
    });

    if (outboundTransportCol !== -1 && outboundDetailsCol !== -1) {
      console.log("Processing outbound transportation from main sheet...");
      console.log("Outbound transportation rows:", dataRows.length);

      transportationData.outbound = dataRows
        .map((row) => {
          const obj: any = {};
          obj["ชื่อ-สกุล"] =
            row[headers.findIndex((h) => h && h.includes("ชื่อ-สกุล"))];
          obj["รายละเอียด"] = row[outboundDetailsCol];
          return obj;
        })
        .filter(
          (row) =>
            row["ชื่อ-สกุล"] &&
            row["ชื่อ-สกุล"].toString().trim() &&
            row["รายละเอียด"] &&
            row["รายละเอียด"].toString().trim(),
        );

      console.log(
        `Processed ${transportationData.outbound.length} outbound transportation records`,
      );
      if (transportationData.outbound.length > 0) {
        console.log("First outbound record:", transportationData.outbound[0]);
      }
    } else {
      console.log("Outbound transportation columns not found in main sheet");
    }

    // Process return transportation from main sheet
    if (returnTransportCol !== -1 && returnDetailsCol !== -1) {
      console.log("Processing return transportation from main sheet...");
      console.log("Return transportation rows:", dataRows.length);

      transportationData.return = dataRows
        .map((row) => {
          const obj: any = {};
          obj["ชื่อ-สกุล"] =
            row[headers.findIndex((h) => h && h.includes("ชื่อ-สกุล"))];
          obj["รายละเอียด"] = row[returnDetailsCol];
          return obj;
        })
        .filter(
          (row) =>
            row["ชื่อ-สกุล"] &&
            row["ชื่อ-สกุล"].toString().trim() &&
            row["รายละเอียด"] &&
            row["รายละเอียด"].toString().trim(),
        );

      console.log(
        `Processed ${transportationData.return.length} return transportation records`,
      );
      if (transportationData.return.length > 0) {
        console.log("First return record:", transportationData.return[0]);
      }
    } else {
      console.log("Return transportation columns not found in main sheet");
    }

    // Process accommodation sheet "เดินทาง+ที่พัก" (Excel only)
    const accommodationData: any[] = [];
    const accommodationSheet = workbook
      ? workbook.Sheets["เดินทาง+ที่พัก"]
      : null;
    if (accommodationSheet) {
      const accommodationJson = XLSX.utils.sheet_to_json(accommodationSheet, {
        header: 1,
      });
      console.log("Processing accommodation sheet...");

      // Find header row - look for 'ชื่อ-สกุล' in any cell
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(10, accommodationJson.length); i++) {
        const row = accommodationJson[i] as string[];
        if (row && row.some((h) => h && h.toString().includes("ชื่อ-สกุล"))) {
          headerRowIndex = i;
          break;
        }
      }

      if (headerRowIndex !== -1) {
        const accommodationHeaders = accommodationJson[
          headerRowIndex
        ] as string[];
        const accommodationRows = accommodationJson.slice(
          headerRowIndex + 1,
        ) as any[][];

        accommodationData.push(
          ...accommodationRows
            .map((row) => {
              const obj: any = {};
              accommodationHeaders.forEach((header, index) => {
                if (header && row[index] !== undefined) {
                  obj[header] = row[index];
                }
              });
              return obj;
            })
            .filter(
              (row) => row["ชื่อ-สกุล"] && row["ชื่อ-สกุล"].toString().trim(),
            ),
        );

        console.log(
          `Processed ${accommodationData.length} accommodation records`,
        );
      }
    }

    // Find column indices - Updated to handle your actual Excel format
    if (workbook) {
      console.log("Available sheets:", workbook.SheetNames);
    }
    console.log("Selected headers:", headers);
    console.log("Total data rows:", dataRows.length);

    const columnMap = {
      // Basic participant info (columns 1-13)
      sequence: headers.findIndex((h) => h?.includes("ลำดับ")),
      prefix: headers.findIndex((h) => h?.includes("คำนำหน้า")),
      fullName: headers.findIndex((h) => h?.includes("ชื่อ-สกุล")),
      position: headers.findIndex(
        (h) => h?.includes("ตำแหน่ง") && !h?.includes("ผู้เข้าร่วม"),
      ),
      participantPosition: headers.findIndex((h) =>
        h?.includes("ตำแหน่งผู้เข้าร่วมงาน"),
      ),
      province: headers.findIndex((h) => h?.includes("จังหวัด")),
      region: headers.findIndex((h) => h?.includes("ระบุภาค")),
      region2: headers.findIndex((h) => h?.includes("ภาค")),
      gender: headers.findIndex((h) => h?.includes("เพศ")),
      attended: headers.findIndex((h) => h?.includes("มาจริง")),
      receivedTag: headers.findIndex((h) => h?.includes("รับ Tag")),
      participantNumber: headers.findIndex((h) => h?.includes("รหัส นง")),
      code: headers.findIndex((h) => h?.includes("Code")),

      // Accommodation info (columns 13-18)
      hotel: headers.findIndex((h) => h?.includes("โรงแรม/ที่พัก")),
      checkInDate: headers.findIndex((h) => h?.includes("วันที่เข้า")),
      checkOutDate: headers.findIndex((h) => h?.includes("วันที่ออก")),
      roomType: headers.findIndex((h) => h?.includes("ประเภทห้อง/เตียง")),
      numberOfRooms: headers.findIndex((h) => h?.includes("จำนวนห้อง")),

      // Daily stays (columns 19-22)
      stay_20_11: headers.findIndex((h) => h?.includes("20/11/2025")),
      stay_21_11: headers.findIndex((h) => h?.includes("21/11/2025")),
      stay_22_11: headers.findIndex((h) => h?.includes("22/11/2025")),
      stay_23_11: headers.findIndex((h) => h?.includes("23/11/2025")),

      // Event columns (23-31) - exact header text matching
      event_1: headers.findIndex((h) =>
        h?.includes("วันที่ 21 พ.ย. 68 (ภาคบ่าย) : งานสัมมนาหอการค้า 5 ภาค"),
      ),
      event_2: headers.findIndex((h) =>
        h?.includes(
          "วันที่ 21 พ.ย. 68 (ภาคบ่าย) : ดูงานสำหรับที่ปรึกษาและกรรมการหอการค้าไทย",
        ),
      ),
      event_3: headers.findIndex((h) =>
        h?.includes(
          "วันที่ 21 พ.ย. 68 (ภาคบ่าย) : ดูงานคณะกรรมการ ณ Sea Wealth",
        ),
      ),
      event_4: headers.findIndex((h) =>
        h?.includes(
          "วันที่ 21 พ.ย. 68 (ภาคบ่าย) : ดูงานคณะกรรมการ ณ บริษัท พาเนล พลัส",
        ),
      ),
      event_5: headers.findIndex((h) =>
        h?.includes(
          "วันที่ 21 พ.ย. 68 (ภาคค่ำ) : งานเลี้ยงต้อนรับ โดยหอจังหวัดสงขลา",
        ),
      ),
      event_6: headers.findIndex((h) =>
        h?.includes(
          "วันที่ 22 พ.ย.68 (ภาคเช้า) : งานสัมนา Unlocking New Growth: ศักยภาพใหม่แห่งการเติบโต",
        ),
      ),
      event_7: headers.findIndex((h) =>
        h?.includes(
          "วันที่ 22 พ.ย.68 (ภาคบ่าย) : งานสัมนา Unlocking Thailand's Digital & AI Success",
        ),
      ),
      event_8: headers.findIndex((h) =>
        h?.includes(
          "วันที่ 22 พ.ย. 68 (ภาคค่ำ) : งานเลี้ยงภาคค่ำ+พิธีมอบรางวัลประจำปี 2568",
        ),
      ),
      event_9: headers.findIndex((h) =>
        h?.includes(
          'วันที่ 23 พ.ย. 68 (ภาคเช้า) : มอบรางวัลผู้ว่าราชการจังหวัด "สำเภาทอง" + สรุปผลการสัมมนาฯ',
        ),
      ),

      // Finance columns (32-38)
      activityFee: headers.findIndex((h) => h?.includes("ค่ากิจกรรม")),
      accommodationFee: headers.findIndex((h) => h?.includes("ค่าที่พัก")),
      dinnerFee: headers.findIndex((h) => h?.includes("ค่างานเลี้ยงภาคค่ำ")),
      totalFee: headers.findIndex((h) => h?.includes("ค่าใช้จ่ายทั้งหมด")),
      paymentDetails: headers.findIndex((h) =>
        h?.includes("รายละเอียดค่าใช้จ่าย"),
      ),
      paymentStatus: headers.findIndex((h) => h?.includes("สถานะชำระเงิน")),
      paymentDocument: headers.findIndex((h) =>
        h?.includes("เอกสารค่าใช้จ่าย"),
      ),

      // Contact info (39-41)
      email: headers.findIndex((h) => h?.includes("อีเมล")),
      mobilePhone: headers.findIndex((h) => h?.includes("เบอร์มือถือ")),
      telephone: headers.findIndex((h) => h?.includes("เบอร์โทรศัพท์")),
      fax: headers.findIndex((h) => h?.includes("โทรสาร")),

      // Transportation outbound (42-45)
      outboundTransportType: headers.findIndex((h) =>
        h?.includes("ขาไป (การเดินทาง)"),
      ),
      outboundTransportMode: headers.findIndex((h) => h === "เดินทาง"),
      outboundDateTime: headers.findIndex((h) => h === "วันที่-เวลา"),
      outboundDetails: headers.findIndex((h) => {
        const idx = headers.indexOf(h);
        return h === "รายละเอียด" && idx > 42 && idx < 46;
      }),

      // Transportation return (46-48)
      returnTransportType: headers.findIndex((h) =>
        h?.includes("ขากลับ (การเดินทาง)"),
      ),
      returnTransportMode: headers.findIndex((h) => h === "เดินทาง3"),
      returnDateTime: headers.findIndex((h) => h === "วันที่-เวลา4"),
      returnDetails: headers.findIndex((_h) => {
        const idx = headers.lastIndexOf("รายละเอียด");
        return idx > 46 ? idx : -1;
      }),

      // Attendance status (49)
      attendanceStatus: headers.findIndex((h) => h?.includes("สถานะเข้างาน")),

      // Additional columns for reserved seats
      organization: headers.findIndex(
        (h) =>
          h?.includes("Affiliation") ||
          h?.includes("Organization") ||
          h?.includes("หน่วยงาน"),
      ),
      category: headers.findIndex(
        (h) => h?.includes("Category") || h?.includes("หมวดหมู่"),
      ),
      status: headers.findIndex(
        (h) => h?.includes("Status") || h?.includes("สถานะ"),
      ),
    };

    // Debug column mapping
    console.log("Column Mapping Results:", {
      basicInfo: {
        prefix: columnMap.prefix,
        fullName: columnMap.fullName,
        province: columnMap.province,
        participantNumber: columnMap.participantNumber,
      },
      accommodation: {
        hotel: columnMap.hotel,
        checkIn: columnMap.checkInDate,
        checkOut: columnMap.checkOutDate,
        roomType: columnMap.roomType,
      },
      dailyStays: {
        stay_20: columnMap.stay_20_11,
        stay_21: columnMap.stay_21_11,
        stay_22: columnMap.stay_22_11,
        stay_23: columnMap.stay_23_11,
      },
      events: {
        event_1: columnMap.event_1,
        event_2: columnMap.event_2,
        event_3: columnMap.event_3,
        event_4: columnMap.event_4,
        event_5: columnMap.event_5,
        event_6: columnMap.event_6,
        event_7: columnMap.event_7,
        event_8: columnMap.event_8,
        event_9: columnMap.event_9,
      },
      transportation: {
        outbound: columnMap.outboundTransportType,
        return: columnMap.returnTransportType,
        outboundDetails: columnMap.outboundDetails,
        returnDetails: columnMap.returnDetails,
      },
      finance: {
        activity: columnMap.activityFee,
        accommodation: columnMap.accommodationFee,
        dinner: columnMap.dinnerFee,
        total: columnMap.totalFee,
        paymentStatus: columnMap.paymentStatus,
      },
    });

    // Validate required columns - More flexible validation
    if (columnMap.fullName === -1) {
      // Try to find any column that might contain names
      const possibleNameColumns = headers
        .map((h, i) => ({ name: h, index: i }))
        .filter(
          (col) =>
            col.name &&
            (col.name.includes("ชื่อ") ||
              col.name.includes("Name") ||
              col.name.includes("Full") ||
              col.name.includes("สกุล")),
        );

      if (possibleNameColumns.length > 0) {
        // Use the first possible name column
        columnMap.fullName = possibleNameColumns[0].index;
        console.log(
          `Using column '${possibleNameColumns[0].name}' as full name column`,
        );
      } else {
        return NextResponse.json(
          {
            error: `No name column found. Available columns: ${headers.filter((h) => h).join(", ")}`,
          },
          { status: 400 },
        );
      }
    }

    // Start transaction
    const { data: participants, error: participantsError } = await supabase
      .from("seminar_participants")
      .select(
        "id, participant_number, full_name, province, checker_reference_id",
      )
      .order("checker_reference_id", { ascending: false })
      .limit(1);

    if (participantsError) {
      console.error("Error fetching existing participants:", participantsError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // Get next checker reference ID
    let nextId = 1;
    if (participants && participants.length > 0) {
      const lastId = participants[0].checker_reference_id;
      if (lastId && lastId.startsWith("TCC-SEM68-")) {
        const idPart = lastId.split("-")[2];
        nextId = parseInt(idPart) + 1;
      }
    }

    const results = {
      inserted: 0,
      updated: 0,
      unchanged: 0,
      errors: [] as string[],
      errorRows: [] as Array<{ row: number; data: any; error: string }>,
      perTable: {
        participants: 0,
        accommodations: 0,
        accommodationDaily: 0,
        transportation: 0,
        finances: 0,
        events: 0,
      } as Record<string, number>,
    };

    // Process each row (with progress updates)
    const maxRows =
      rowLimit > 0 ? Math.min(dataRows.length, rowLimit) : dataRows.length;
    console.log(`Processing ${maxRows} rows${dryRun ? " (DRY RUN)" : ""}`);

    for (let i = 0; i < maxRows; i++) {
      const row = dataRows[i];

      // Progress update every 50 rows for better visibility
      if (i % 50 === 0) {
        console.log(
          `Processing row ${i + 1}/${maxRows} (${Math.round((i / maxRows) * 100)}%) - Inserted: ${results.inserted}, Updated: ${results.updated}, Errors: ${results.errors.length}`,
        );
      }

      try {
        // Debug first 10 rows and every 200th row
        if (i < 10 || i % 200 === 0) {
          console.log(`Row ${i} data:`, {
            rawRow: row.slice(0, 10), // First 10 columns
            fullNameIndex: columnMap.fullName,
            fullNameValue: row[columnMap.fullName],
            prefixIndex: columnMap.prefix,
            prefixValue: row[columnMap.prefix],
            positionIndex: columnMap.position,
            positionValue: row[columnMap.position],
            provinceIndex: columnMap.province,
            provinceValue: row[columnMap.province],
            participantNumberIndex: columnMap.participantNumber,
            participantNumberValue: row[columnMap.participantNumber],
          });
        }

        // Skip completely empty rows
        if (
          !row ||
          row.length === 0 ||
          row.every((cell) => !cell || cell.toString().trim() === "")
        ) {
          continue;
        }

        // Check for meaningful data - be more lenient
        const nameText =
          columnMap.fullName !== -1 ? cleanText(row[columnMap.fullName]) : null;
        const hasName =
          columnMap.fullName !== -1 &&
          row[columnMap.fullName] &&
          nameText &&
          !nameText.match(/^\d+$/);
        const hasPosition =
          columnMap.position !== -1 &&
          row[columnMap.position] &&
          cleanText(row[columnMap.position]);
        const hasProvince =
          columnMap.province !== -1 &&
          row[columnMap.province] &&
          cleanText(row[columnMap.province]);
        const hasParticipantNumber =
          columnMap.participantNumber !== -1 &&
          row[columnMap.participantNumber] &&
          cleanText(row[columnMap.participantNumber]);

        // Skip rows that have no meaningful data at all
        // But be more lenient - if we have ANY meaningful data, process it
        if (!hasName && !hasPosition && !hasProvince && !hasParticipantNumber) {
          if (i < 10) {
            console.log(`Skipping row ${i} - no meaningful data found`);
          }
          continue;
        }

        // Extract participant data
        const rawFullName = cleanText(row[columnMap.fullName]);
        const rawPosition = cleanText(row[columnMap.position]);
        const rawOrganization = cleanText(row[columnMap.organization]);
        const rawCategory = cleanText(row[columnMap.category]);
        const rawParticipantNumber = cleanText(
          row[columnMap.participantNumber],
        );
        const rawSequence =
          columnMap.sequence !== -1 ? cleanText(row[columnMap.sequence]) : null;

        // Handle names more robustly
        let fullName = rawFullName;
        let isReservedSeat = false;

        if (!fullName || fullName.trim() === "") {
          // Create a meaningful name from available data
          isReservedSeat = true;
          const positionName = rawPosition ? ` - ${rawPosition}` : "";
          const orgName = rawOrganization ? ` (${rawOrganization})` : "";
          const categoryName = rawCategory ? ` [${rawCategory}]` : "";
          const participantNum = rawParticipantNumber
            ? ` #${rawParticipantNumber}`
            : "";
          fullName = `Participant${participantNum}${positionName}${orgName}${categoryName}`;
        }

        // Normalize participant number: fall back to unique sequence when value is missing or a group header
        const normalizedParticipantNumber = (() => {
          const pn = rawParticipantNumber || "";
          // If clearly non-unique or a group label (contains Thai words like 'หอการค้า' or spaces/parentheses without decimals),
          // or too short, use SEQ fallback.
          const looksLikeGroup =
            /หอการค้า|\(|\)|\s/.test(pn) && !/^\d+(?:[.\-]\d+)?$/.test(pn);
          const tooShort = pn.length < 2;
          if (pn && !looksLikeGroup && !tooShort) return pn;
          // Use sheet sequence number if available, else the current loop index for stability
          const seq = rawSequence || String(i + 1);
          return `SEQ-${seq}`;
        })();

        const participantData = {
          checker_reference_id: `TCC-SEM68-${nextId.toString().padStart(4, "0")}`,
          participant_number: truncateText(normalizedParticipantNumber, 50),
          code: truncateText(cleanText(row[columnMap.code]), 50),
          prefix: truncateText(cleanText(row[columnMap.prefix]), 20),
          full_name: truncateText(fullName, 255),
          position: truncateText(cleanText(row[columnMap.position]), 255),
          participant_position: truncateText(
            cleanText(row[columnMap.participantPosition]),
            255,
          ),
          province: truncateText(cleanText(row[columnMap.province]), 100),
          region: truncateText(cleanText(row[columnMap.region]), 50),
          gender: truncateText(cleanText(row[columnMap.gender]), 20),
          email: truncateText(cleanText(row[columnMap.email]), 255) || null,
          mobile_phone: normalizeThaiPhone(row[columnMap.mobilePhone]),
          attendance_status: isReservedSeat ? "reserved" : "confirmed",
          custom_fields: {
            is_reserved_seat: isReservedSeat,
            original_organization: rawOrganization,
            original_category: rawCategory,
            original_status: cleanText(row[columnMap.status]),
            original_position: rawPosition,
          },
        };

        // Skip rows that have no meaningful data at all
        if (!participantData.full_name && !rawOrganization && !rawCategory) {
          results.errors.push(
            `Row ${i + 2}: No meaningful data found - skipping empty row`,
          );
          continue;
        }

        // Skip database operations in dry-run mode
        if (dryRun) {
          results.inserted++;
          results.perTable.participants++;
          continue;
        }

        // Check if participant already exists
        // Strategy: try participant_number, else fallback to name+province match
        let existingParticipant = await supabase
          .from("seminar_participants")
          .select("id")
          .eq("participant_number", participantData.participant_number as any)
          .maybeSingle();

        if (!existingParticipant.data && participantData.full_name) {
          const nameMatch = await supabase
            .from("seminar_participants")
            .select("id")
            .eq("full_name", participantData.full_name as any)
            .maybeSingle();
          if (nameMatch.data) {
            existingParticipant = nameMatch;
          }
        }

        let participantId: number;
        let isUpdate = false;

        if (existingParticipant.data) {
          // Update existing participant
          const { data: updatedParticipant, error: updateError } =
            await supabase
              .from("seminar_participants")
              .update({
                ...participantData,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingParticipant.data.id)
              .select("id")
              .single();

          if (updateError) {
            console.error(`Row ${i + 2}: Update error:`, updateError);
            const errorMsg = `Failed to update participant - ${updateError.message}`;
            results.errors.push(`Row ${i + 2}: ${errorMsg}`);
            results.errorRows.push({
              row: i + 2,
              data: participantData,
              error: errorMsg,
            });
            continue;
          }

          participantId = updatedParticipant.id;
          isUpdate = true;
          results.updated++;
        } else {
          // Insert new participant
          const { data: newParticipant, error: insertError } = await supabase
            .from("seminar_participants")
            .insert(participantData)
            .select("id")
            .single();

          if (insertError) {
            console.error(`Row ${i + 2}: Insert error:`, insertError);
            const errorMsg = `Failed to insert participant - ${insertError.message}`;
            results.errors.push(`Row ${i + 2}: ${errorMsg}`);
            results.errorRows.push({
              row: i + 2,
              data: participantData,
              error: errorMsg,
            });
            continue;
          }

          participantId = newParticipant.id;
          results.inserted++;
          results.perTable.participants++;
        }

        nextId++;

        // Handle accommodation data
        const hotelName = cleanText(row[columnMap.hotel]);
        if (hotelName) {
          // Find or create hotel
          let hotelId: number | null = null;

          if (hotelName !== "จองที่พักเอง") {
            const { data: existingHotel } = await supabase
              .from("seminar_hotels")
              .select("id")
              .eq("name", hotelName)
              .single();

            if (existingHotel) {
              hotelId = existingHotel.id;
            } else {
              // Create new hotel
              const { data: newHotel, error: hotelError } = await supabase
                .from("seminar_hotels")
                .insert({ name: hotelName })
                .select("id")
                .single();

              if (!hotelError && newHotel) {
                hotelId = newHotel.id;
              }
            }
          }

          // Upsert accommodation
          const accommodationData = {
            participant_id: participantId,
            hotel_id: hotelId,
            check_in_date: parseThaiDate(row[columnMap.checkInDate]),
            check_out_date: parseThaiDate(row[columnMap.checkOutDate]),
            room_type: truncateText(cleanText(row[columnMap.roomType]), 100),
            number_of_rooms: parseNumeric(row[columnMap.numberOfRooms]),
            notes: null,
          };

          if (isUpdate) {
            // Update existing accommodation
            await supabase
              .from("seminar_accommodations")
              .update(accommodationData)
              .eq("participant_id", participantId);
          } else {
            // Insert new accommodation
            await supabase
              .from("seminar_accommodations")
              .insert(accommodationData);
            results.perTable.accommodations++;
          }
        }

        // Handle daily stays with explicit date column mapping
        const dailyStays = [
          { colIndex: columnMap.stay_20_11, date: "2025-11-20" },
          { colIndex: columnMap.stay_21_11, date: "2025-11-21" },
          { colIndex: columnMap.stay_22_11, date: "2025-11-22" },
          { colIndex: columnMap.stay_23_11, date: "2025-11-23" },
        ];

        // Get accommodation ID
        const { data: accommodation } = await supabase
          .from("seminar_accommodations")
          .select("id")
          .eq("participant_id", participantId)
          .maybeSingle();

        if (accommodation) {
          for (const dailyStay of dailyStays) {
            if (dailyStay.colIndex !== -1) {
              const status = cleanText(row[dailyStay.colIndex]);
              if (status) {
                await supabase.from("seminar_accommodation_daily").upsert(
                  {
                    accommodation_id: accommodation.id,
                    stay_date: dailyStay.date,
                    status: status === "1" ? "1" : status === "--" ? "--" : "0",
                  },
                  {
                    onConflict: "accommodation_id,stay_date",
                  },
                );
                results.perTable.accommodationDaily++;
              }
            }
          }
        }

        // Handle event participation with explicit event mapping
        const eventMapping = [
          { colIndex: columnMap.event_1, eventName: "งานสัมมนาหอการค้า 5 ภาค" },
          {
            colIndex: columnMap.event_2,
            eventName: "ดูงานสำหรับที่ปรึกษาและกรรมการหอการค้าไทย",
          },
          {
            colIndex: columnMap.event_3,
            eventName: "ดูงานคณะกรรมการ ณ Sea Wealth",
          },
          {
            colIndex: columnMap.event_4,
            eventName: "ดูงานคณะกรรมการ ณ บริษัท พาเนล พลัส",
          },
          {
            colIndex: columnMap.event_5,
            eventName: "งานเลี้ยงต้อนรับ โดยหอจังหวัดสงขลา",
          },
          {
            colIndex: columnMap.event_6,
            eventName:
              "งานสัมมนา Unlocking New Growth: ศักยภาพใหม่แห่งการเติบโต",
          },
          {
            colIndex: columnMap.event_7,
            eventName: "งานสัมมนา Unlocking Thailand's Digital & AI Success",
          },
          {
            colIndex: columnMap.event_8,
            eventName: "งานเลี้ยงภาคค่ำ+พิธีมอบรางวัลประจำปี 2568",
          },
          {
            colIndex: columnMap.event_9,
            eventName:
              'มอบรางวัลผู้ว่าราชการจังหวัด "สำเภาทอง" + สรุปผลการสัมมนาฯ',
          },
        ];

        for (const eventMap of eventMapping) {
          if (eventMap.colIndex !== -1) {
            const participationValue = cleanText(row[eventMap.colIndex]);
            if (participationValue === "1") {
              const { data: event } = await supabase
                .from("seminar_events")
                .select("id")
                .ilike("name", `%${eventMap.eventName}%`)
                .maybeSingle();

              if (event) {
                await supabase.from("seminar_event_participants").upsert(
                  {
                    participant_id: participantId,
                    event_id: event.id,
                    registration_status: "ลงทะเบียน",
                  },
                  {
                    onConflict: "participant_id,event_id",
                  },
                );
                results.perTable.events++;
              }
            }
          }
        }

        // Handle transportation from main sheet columns
        // Process outbound transportation from main sheet
        if (columnMap.outboundTransportType !== -1) {
          const transportType = cleanText(row[columnMap.outboundTransportType]);
          const transportMode =
            columnMap.outboundTransportMode !== -1
              ? cleanText(row[columnMap.outboundTransportMode])
              : null;
          const dateTime =
            columnMap.outboundDateTime !== -1
              ? cleanText(row[columnMap.outboundDateTime])
              : null;
          const details =
            columnMap.outboundDetails !== -1
              ? cleanText(row[columnMap.outboundDetails])
              : null;

          if (transportType) {
            const combinedDetails = [transportMode, dateTime, details]
              .filter((d) => d && d !== "")
              .join(" | ");

            await supabase.from("seminar_transportation").upsert(
              {
                participant_id: participantId,
                direction: "outbound",
                transport_type: transportType,
                details: combinedDetails || null,
              },
              {
                onConflict: "participant_id,direction",
              },
            );
            results.perTable.transportation++;
          }
        }

        // Process return transportation from main sheet
        if (columnMap.returnTransportType !== -1) {
          const transportType = cleanText(row[columnMap.returnTransportType]);
          const transportMode =
            columnMap.returnTransportMode !== -1
              ? cleanText(row[columnMap.returnTransportMode])
              : null;
          const dateTime =
            columnMap.returnDateTime !== -1
              ? cleanText(row[columnMap.returnDateTime])
              : null;
          const details =
            columnMap.returnDetails !== -1
              ? cleanText(row[columnMap.returnDetails])
              : null;

          if (transportType) {
            const combinedDetails = [transportMode, dateTime, details]
              .filter((d) => d && d !== "")
              .join(" | ");

            await supabase.from("seminar_transportation").upsert(
              {
                participant_id: participantId,
                direction: "return",
                transport_type: transportType,
                details: combinedDetails || null,
              },
              {
                onConflict: "participant_id,direction",
              },
            );
            results.perTable.transportation++;
          }
        }

        // Handle finances with all CSV columns
        const financeData = {
          participant_id: participantId,
          activity_fee: parseNumeric(row[columnMap.activityFee]) || null,
          accommodation_fee:
            parseNumeric(row[columnMap.accommodationFee]) || null,
          dinner_fee: parseNumeric(row[columnMap.dinnerFee]) || null,
          total_fee: parseNumeric(row[columnMap.totalFee]) || null,
          payment_status: truncateText(
            cleanText(row[columnMap.paymentStatus]),
            100,
          ),
          payment_details: truncateText(
            cleanText(row[columnMap.paymentDetails]),
            1000,
          ),
          payment_document: truncateText(
            cleanText(row[columnMap.paymentDocument]),
            500,
          ),
        };

        // If total_fee not in CSV, calculate it
        if (!financeData.total_fee) {
          const total =
            (financeData.activity_fee || 0) +
            (financeData.accommodation_fee || 0) +
            (financeData.dinner_fee || 0);
          financeData.total_fee = total > 0 ? total : null;
        }

        await supabase.from("seminar_finances").upsert(financeData, {
          onConflict: "participant_id",
        });
        results.perTable.finances++;
      } catch (error) {
        const errorMsg = `Processing error - ${error instanceof Error ? error.message : "Unknown error"}`;
        results.errors.push(`Row ${i + 2}: ${errorMsg}`);
        results.errorRows.push({ row: i + 2, data: row, error: errorMsg });
      }
    }

    // Process transportation data
    console.log("Transportation data parsed:");
    console.log(`Outbound records: ${transportationData.outbound.length}`);
    console.log(`Return records: ${transportationData.return.length}`);
    console.log(`Accommodation records: ${accommodationData.length}`);

    // Update perTable counts for transportation data (even in dry run)
    results.perTable.transportation =
      transportationData.outbound.length + transportationData.return.length;
    results.perTable.accommodations = accommodationData.length;

    if (!dryRun) {
      console.log(
        "Merging additional transportation data from separate sheet...",
      );

      // Process outbound transportation from separate sheet
      for (const transportRecord of transportationData.outbound) {
        try {
          const participantName = transportRecord["ชื่อ-สกุล"];
          const { data: participant } = await supabase
            .from("seminar_participants")
            .select("id")
            .eq("full_name", participantName)
            .maybeSingle();

          if (participant) {
            // Check if transportation already exists
            const { data: existing } = await supabase
              .from("seminar_transportation")
              .select("id, details")
              .eq("participant_id", participant.id)
              .eq("direction", "outbound")
              .maybeSingle();

            const transportDetails = cleanText(transportRecord["รายละเอียด"]);

            // Only update if we have MORE details in separate sheet
            if (
              transportDetails &&
              (!existing ||
                !existing.details ||
                existing.details.length < transportDetails.length)
            ) {
              const transportType = transportDetails.includes("เครื่องบิน")
                ? "เครื่องบิน"
                : transportDetails.includes("รถบัส")
                  ? "รถบัส"
                  : transportDetails.includes("รถไฟ")
                    ? "รถไฟ"
                    : "อื่นๆ";

              await supabase.from("seminar_transportation").upsert(
                {
                  participant_id: participant.id,
                  direction: "outbound",
                  transport_type: transportType,
                  details: transportDetails,
                },
                {
                  onConflict: "participant_id,direction",
                },
              );
            }
          }
        } catch (error) {
          console.error("Error merging outbound transport:", error);
        }
      }

      // Process return transportation from separate sheet
      for (const transportRecord of transportationData.return) {
        try {
          const participantName = transportRecord["ชื่อ-สกุล"];
          const { data: participant } = await supabase
            .from("seminar_participants")
            .select("id")
            .eq("full_name", participantName)
            .maybeSingle();

          if (participant) {
            // Check if transportation already exists
            const { data: existing } = await supabase
              .from("seminar_transportation")
              .select("id, details")
              .eq("participant_id", participant.id)
              .eq("direction", "return")
              .maybeSingle();

            const transportDetails = cleanText(transportRecord["รายละเอียด"]);

            // Only update if we have MORE details in separate sheet
            if (
              transportDetails &&
              (!existing ||
                !existing.details ||
                existing.details.length < transportDetails.length)
            ) {
              const transportType = transportDetails.includes("เครื่องบิน")
                ? "เครื่องบิน"
                : transportDetails.includes("รถบัส")
                  ? "รถบัส"
                  : transportDetails.includes("รถไฟ")
                    ? "รถไฟ"
                    : "อื่นๆ";

              await supabase.from("seminar_transportation").upsert(
                {
                  participant_id: participant.id,
                  direction: "return",
                  transport_type: transportType,
                  details: transportDetails,
                },
                {
                  onConflict: "participant_id,direction",
                },
              );
            }
          }
        } catch (error) {
          console.error("Error merging return transport:", error);
        }
      }

      // Process accommodation data from the combined sheet
      for (const accommodationRecord of accommodationData) {
        try {
          // Find participant by name
          const { data: participant } = await supabase
            .from("seminar_participants")
            .select("id")
            .eq("full_name", accommodationRecord["ชื่อ-สกุล"])
            .single();

          if (participant) {
            // Find or create hotel
            let hotelId: number | null = null;
            const hotelName = cleanText(accommodationRecord["โรงแรม/ที่พัก"]);

            if (hotelName && hotelName !== "จองที่พักเอง") {
              const { data: existingHotel } = await supabase
                .from("seminar_hotels")
                .select("id")
                .eq("name", hotelName)
                .single();

              if (existingHotel) {
                hotelId = existingHotel.id;
              } else {
                // Create new hotel
                const { data: newHotel, error: hotelError } = await supabase
                  .from("seminar_hotels")
                  .insert({ name: hotelName })
                  .select("id")
                  .single();

                if (!hotelError && newHotel) {
                  hotelId = newHotel.id;
                }
              }
            }

            // Update accommodation with hotel info
            const accommodationData = {
              participant_id: participant.id,
              hotel_id: hotelId,
              check_in_date: parseThaiDate(accommodationRecord["วันที่เข้า"]),
              check_out_date: parseThaiDate(accommodationRecord["วันที่ออก"]),
              room_type: "Standard", // Default room type
              number_of_rooms: 1,
              notes: cleanText(accommodationRecord["รายละเอียด"]),
            };

            await supabase
              .from("seminar_accommodations")
              .upsert(accommodationData, {
                onConflict: "participant_id",
              });
            results.perTable.accommodations++;
          }
        } catch (error) {
          console.error("Error processing accommodation:", error);
        }
      }
    }

    // Log audit event
    await audit.logEvent({
      action: "excel_import",
      resource: "seminar_participants",
      actor_id: user.id,
      actor_role: "admin",
      result: "success",
      correlation_id: `excel_import_${Date.now()}`,
      meta: {
        fileName: file.name,
        fileSize: file.size,
        totalRows: dataRows.length,
        results: results,
        userId: user.id,
        userEmail: user.email,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Import completed successfully${dryRun ? " (DRY RUN)" : ""}`,
      results: results,
      summary: {
        totalProcessed: maxRows,
        inserted: results.inserted,
        updated: results.updated,
        unchanged: results.unchanged,
        errors: results.errors.length,
        perTable: results.perTable,
        dryRun: dryRun,
        errorRows: results.errorRows.slice(0, 10), // Include first 10 error rows for preview
      },
    });
  } catch (error) {
    console.error("Excel import error:", error);

    // Log audit event for error
    await audit.logEvent({
      action: "excel_import_error",
      resource: "seminar_participants",
      actor_id: "system",
      actor_role: "admin",
      result: "error",
      correlation_id: `excel_import_error_${Date.now()}`,
      meta: {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
    });

    return NextResponse.json(
      {
        error: "Import failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
