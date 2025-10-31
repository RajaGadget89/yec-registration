import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "../../../../lib/auth-utils.server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { audit } from "../../../../lib/audit";

// Helper: format checker reference id with 4 digits (sequential)
function formatCheckerId(n: number): string {
  return `TCC-SEM68-${n.toString().padStart(4, "0")}`;
}

// Helper to hard-limit text length to column constraints
function truncateText(value: string | null, maxLength: number): string | null {
  if (!value) return null;
  return value.length > maxLength ? value.substring(0, maxLength) : value;
}

// Helper to clean and normalize text
function cleanText(value: any): string | null {
  if (value === null || value === undefined) return null;
  return value.toString().trim() || null;
}

// Helper to normalize Thai phone numbers
function normalizeThaiPhone(value: any): string | null {
  if (!value) return null;

  const digits = value.toString().replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) {
    return digits;
  } else if (digits.length === 9) {
    return "0" + digits;
  }

  return digits || null;
}

// Helper to parse numeric values
function parseNumeric(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = parseFloat(value.toString().replace(/[^\d.-]/g, ""));
  return isNaN(num) ? null : num;
}

// Helper to parse Thai date
function parseThaiDate(value: any): string | null {
  if (!value) return null;
  const dateStr = value.toString().trim();
  if (!dateStr) return null;

  // Handle DD/MM/YYYY format
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }

  return dateStr;
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

    // Parse query parameters
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
    if (!file.name.endsWith(".csv")) {
      return NextResponse.json(
        { error: "Only CSV files (.csv) are allowed" },
        { status: 400 },
      );
    }

    // Read CSV file
    let text = await file.text();

    // Remove BOM if present
    if (text.charCodeAt(0) === 0xfeff) {
      text = text.slice(1);
    }

    const lines = text.split("\n").filter((line) => line.trim());

    if (lines.length < 2) {
      return NextResponse.json(
        {
          error: "CSV file must contain at least a header row and one data row",
        },
        { status: 400 },
      );
    }

    // Parse CSV with proper handling of quoted fields
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }

      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]).map((h) =>
      h.replace(/^["']|["']$/g, ""),
    );
    const dataRows = lines.slice(1).map((line) => {
      const values = parseCSVLine(line);
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.replace(/^["']|["']$/g, "").trim() || "";
      });
      return row;
    });

    // Create a helper function to get data by header name
    const getDataByHeader = (row: any, headerName: string | undefined) => {
      if (!headerName) return null;
      return row[headerName];
    };

    console.log("CSV Headers:", headers);
    console.log("Total rows:", dataRows.length);
    console.log("First few headers:", headers.slice(0, 10));

    // Find column header names
    const columnMap = {
      fullName: headers.find((h) => h.includes("ชื่อ-สกุล")),
      prefix: headers.find((h) => h.includes("คำนำหน้า")),
      position: headers.find((h) => h.includes("ตำแหน่ง")),
      participantPosition: headers.find((h) =>
        h.includes("ตำแหน่งผู้เข้าร่วมงาน"),
      ),
      province: headers.find((h) => h.includes("จังหวัด")),
      region:
        headers.find((h) => h.includes("ระบุภาค")) ||
        headers.find((h) => h.includes("ภาค")),
      gender: headers.find((h) => h.includes("เพศ")),
      email: headers.find((h) => h.includes("อีเมล")),
      mobilePhone: headers.find((h) => h.includes("เบอร์มือถือ")),
      hotelName: headers.find((h) => h.includes("โรงแรม/ที่พัก")),
      checkinDate: headers.find((h) => h.includes("วันที่เข้า")),
      checkoutDate: headers.find((h) => h.includes("วันที่ออก")),
      roomType: headers.find((h) => h.includes("ประเภทห้อง/เตียง")),
      numberOfRooms: headers.find((h) => h.includes("จำนวนห้อง")),
      activityFee: headers.find((h) => h.includes("ค่ากิจกรรม")),
      accommodationFee: headers.find((h) => h.includes("ค่าที่พัก")),
      dinnerFee: headers.find((h) => h.includes("ค่างานเลี้ยงภาคค่ำ")),
      totalFee: headers.find((h) => h.includes("ค่าใช้จ่ายทั้งหมด")),
      paymentStatus: headers.find((h) => h.includes("สถานะชำระเงิน")),
      paymentDetails: headers.find((h) => h.includes("รายละเอียดค่าใช้จ่าย")),
      paymentDocument: headers.find((h) => h.includes("เอกสารค่าใช้จ่าย")),
      outboundTransport: headers.find((h) => h.includes("ขาไป (การเดินทาง)")),
      outboundMode: headers.find((h) => h === "เดินทาง"),
      outboundDateTime: headers.find((h) => h === "วันที่-เวลา"),
      outboundDetails: headers.find(
        (h) =>
          h.includes("รายละเอียด") &&
          headers.indexOf(h) >
            headers.findIndex((h2) => h2.includes("ขาไป (การเดินทาง)")),
      ),
      returnTransport: headers.find((h) => h.includes("ขากลับ (การเดินทาง)")),
      returnMode: headers.find((h) => h === "เดินทาง3"),
      returnDateTime: headers.find((h) => h === "วันที่-เวลา4"),
      returnDetails: headers.find(
        (h) =>
          h.includes("รายละเอียด") &&
          headers.indexOf(h) >
            headers.findIndex((h2) => h2.includes("ขากลับ (การเดินทาง)")),
      ),
      // Daily stays
      stay_20_11: headers.find((h) => h.includes("20/11/2025")),
      stay_21_11: headers.find((h) => h.includes("21/11/2025")),
      stay_22_11: headers.find((h) => h.includes("22/11/2025")),
      stay_23_11: headers.find((h) => h.includes("23/11/2025")),
      // Events
      event_1: headers.find((h) => h.includes("งานสัมมนาหอการค้า 5 ภาค")),
      event_2: headers.find((h) =>
        h.includes("ที่ปรึกษาและกรรมการหอการค้าไทย"),
      ),
      event_3: headers.find((h) => h.includes("Sea Wealth")),
      event_4: headers.find((h) => h.includes("บริษัท พาเนล พลัส")),
      event_5: headers.find((h) => h.includes("งานเลี้ยงต้อนรับ")),
      event_6: headers.find((h) => h.includes("Unlocking New Growth")),
      event_7: headers.find((h) => h.includes("Digital & AI")),
      event_8: headers.find((h) => h.includes("งานเลี้ยงภาคค่ำ+พิธีมอบรางวัล")),
      event_9: headers.find((h) => h.includes("สำเภาทอง")),
    };

    // Debug: Check if column mapping is working
    console.log("Column mapping debug:", {
      fullName: columnMap.fullName,
      fullNameValue: dataRows[0]
        ? getDataByHeader(dataRows[0], columnMap.fullName)
        : "No data",
      hotelName: columnMap.hotelName,
      hotelNameValue: dataRows[0]
        ? getDataByHeader(dataRows[0], columnMap.hotelName)
        : "No data",
      outboundTransport: columnMap.outboundTransport,
      outboundDetails: columnMap.outboundDetails,
      outboundDetailsValue: dataRows[0]
        ? getDataByHeader(dataRows[0], columnMap.outboundDetails)
        : "No data",
    });

    console.log("Column mapping:", columnMap);
    console.log(
      "First data row sample:",
      dataRows[0] ? Object.keys(dataRows[0]).slice(0, 5) : "No data rows",
    );
    console.log(
      "Full name from first row:",
      dataRows[0]
        ? getDataByHeader(dataRows[0], columnMap.fullName)
        : "No data",
    );
    console.log(
      "Clean full name:",
      dataRows[0]
        ? cleanText(getDataByHeader(dataRows[0], columnMap.fullName))
        : "No data",
    );
    console.log(
      "Has valid name:",
      dataRows[0]
        ? !!(
            getDataByHeader(dataRows[0], columnMap.fullName) &&
            cleanText(getDataByHeader(dataRows[0], columnMap.fullName))
          )
        : "No data",
    );

    // Process data
    const maxRows =
      rowLimit > 0 ? Math.min(rowLimit, dataRows.length) : dataRows.length;
    const results = {
      inserted: 0,
      updated: 0,
      unchanged: 0,
      errors: [] as string[],
      errorRows: [] as any[],
      perTable: {
        participants: 0,
        accommodations: 0,
        accommodationDaily: 0,
        transportation: 0,
        finances: 0,
        events: 0,
      },
    };

    if (!dryRun) {
      console.log(`Processing ${maxRows} rows...`);

      for (let i = 0; i < maxRows; i++) {
        try {
          const row = dataRows[i];
          console.log(`Processing row ${i + 1}:`, {
            fullName: getDataByHeader(row, columnMap.fullName),
            cleanFullName: cleanText(getDataByHeader(row, columnMap.fullName)),
            hasData: !!(
              getDataByHeader(row, columnMap.fullName) &&
              cleanText(getDataByHeader(row, columnMap.fullName))
            ),
          });

          // Skip empty rows
          if (
            !getDataByHeader(row, columnMap.fullName) ||
            !cleanText(getDataByHeader(row, columnMap.fullName))
          ) {
            console.log(`Skipping row ${i + 1} - no valid name`);
            continue;
          }

          const fullName = cleanText(getDataByHeader(row, columnMap.fullName));
          const participantNumber = (i + 1).toString().padStart(4, "0");

          // Check if participant already exists
          const { data: existingParticipant } = await supabase
            .from("seminar_participants")
            .select("id, full_name, participant_number, checker_reference_id")
            .eq("full_name", fullName)
            .single();

          let participantId: number;

          if (existingParticipant) {
            participantId = existingParticipant.id;
            results.updated++;
          } else {
            // Create new participant (sequential checker id + correct lengths)
            let nextId = 1;
            const { data: last } = await supabase
              .from("seminar_participants")
              .select("checker_reference_id")
              .order("checker_reference_id", { ascending: false })
              .limit(1);
            if (
              last &&
              last.length > 0 &&
              last[0].checker_reference_id?.startsWith("TCC-SEM68-")
            ) {
              const n = parseInt(last[0].checker_reference_id.split("-")[2]);
              if (!isNaN(n)) nextId = n + 1;
            }
            // Create new participant
            const participantData = {
              checker_reference_id: formatCheckerId(nextId),
              participant_number: participantNumber,
              prefix: truncateText(
                cleanText(getDataByHeader(row, columnMap.prefix)),
                20,
              ),
              full_name: truncateText(fullName, 255),
              position: truncateText(
                cleanText(getDataByHeader(row, columnMap.position)),
                255,
              ),
              participant_position: truncateText(
                cleanText(getDataByHeader(row, columnMap.participantPosition)),
                255,
              ),
              province: truncateText(
                cleanText(getDataByHeader(row, columnMap.province)),
                100,
              ),
              region: truncateText(
                cleanText(getDataByHeader(row, columnMap.region)),
                50,
              ),
              gender: truncateText(
                cleanText(getDataByHeader(row, columnMap.gender)),
                20,
              ),
              email: truncateText(
                cleanText(getDataByHeader(row, columnMap.email)),
                255,
              ),
              mobile_phone: truncateText(
                normalizeThaiPhone(getDataByHeader(row, columnMap.mobilePhone)),
                50,
              ),
              attendance_status: "registered",
            };

            const { data: newParticipant, error: participantError } =
              await supabase
                .from("seminar_participants")
                .insert(participantData)
                .select("id")
                .single();

            if (participantError) {
              console.error("Participant insert error:", participantError);
              results.errors.push(`Row ${i + 1}: ${participantError.message}`);
              results.errorRows.push({
                row: i + 1,
                data: row,
                error: participantError.message,
              });
              continue;
            }

            participantId = newParticipant.id;
            results.inserted++;
            results.perTable.participants++;
          }

          // Process accommodation data

          if (
            columnMap.hotelName &&
            getDataByHeader(row, columnMap.hotelName)
          ) {
            const hotelName = truncateText(
              cleanText(getDataByHeader(row, columnMap.hotelName)),
              200,
            );

            // Look up or create hotel
            let hotelId: number | null = null;
            if (hotelName) {
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
                  .insert({
                    name: hotelName,
                    location: "Hat Yai", // Default location
                    description: "Imported from CSV",
                  })
                  .select("id")
                  .single();

                if (hotelError) {
                  console.error("Hotel creation error:", hotelError);
                  results.errors.push(
                    `Row ${i + 1}: Hotel creation error - ${hotelError.message}`,
                  );
                } else {
                  hotelId = newHotel.id;
                }
              }
            }

            if (hotelId) {
              const accommodationData = {
                participant_id: participantId,
                hotel_id: hotelId,
                check_in_date: parseThaiDate(
                  getDataByHeader(row, columnMap.checkinDate),
                ),
                check_out_date: parseThaiDate(
                  getDataByHeader(row, columnMap.checkoutDate),
                ),
                room_type: truncateText(
                  cleanText(getDataByHeader(row, columnMap.roomType)),
                  100,
                ),
                number_of_rooms:
                  parseNumeric(getDataByHeader(row, columnMap.numberOfRooms)) ||
                  1,
                notes: null,
              };

              // Check if accommodation already exists for this participant
              const { data: existingAccommodation } = await supabase
                .from("seminar_accommodations")
                .select("id")
                .eq("participant_id", participantId)
                .single();

              let accommodationResult;
              if (existingAccommodation) {
                // Update existing accommodation
                const { error: accommodationError, data: updateResult } =
                  await supabase
                    .from("seminar_accommodations")
                    .update(accommodationData)
                    .eq("id", existingAccommodation.id)
                    .select();

                if (accommodationError) {
                  console.error(
                    "Accommodation update error:",
                    accommodationError,
                  );
                  results.errors.push(
                    `Row ${i + 1}: Accommodation update error - ${accommodationError.message}`,
                  );
                } else {
                  accommodationResult = updateResult;
                }
              } else {
                // Insert new accommodation
                const { error: accommodationError, data: insertResult } =
                  await supabase
                    .from("seminar_accommodations")
                    .insert(accommodationData)
                    .select();

                if (accommodationError) {
                  console.error(
                    "Accommodation insert error:",
                    accommodationError,
                  );
                  results.errors.push(
                    `Row ${i + 1}: Accommodation insert error - ${accommodationError.message}`,
                  );
                } else {
                  accommodationResult = insertResult;
                }
              }

              if (accommodationResult) {
                results.perTable.accommodations++;
              }
            }
          }

          // Process transportation - Outbound
          if (columnMap.outboundTransport) {
            const typeRaw = cleanText(
              getDataByHeader(row, columnMap.outboundTransport),
            );
            const mode = columnMap.outboundMode
              ? cleanText(getDataByHeader(row, columnMap.outboundMode))
              : null;
            const dt = columnMap.outboundDateTime
              ? cleanText(getDataByHeader(row, columnMap.outboundDateTime))
              : null;
            const details = columnMap.outboundDetails
              ? cleanText(getDataByHeader(row, columnMap.outboundDetails))
              : null;
            const hasAny = typeRaw || mode || dt || details;
            if (hasAny) {
              const combined = [mode, dt, details].filter(Boolean).join(" | ");
              const type =
                typeRaw ||
                (combined.includes("เครื่องบิน")
                  ? "เครื่องบิน"
                  : combined.includes("รถบัส")
                    ? "รถบัส"
                    : combined.includes("รถไฟ")
                      ? "รถไฟ"
                      : "อื่นๆ");
              const { error: transportError } = await supabase
                .from("seminar_transportation")
                .upsert(
                  {
                    participant_id: participantId,
                    direction: "outbound",
                    transport_type: type,
                    details: combined || null,
                  },
                  { onConflict: "participant_id,direction" },
                );
              if (!transportError) results.perTable.transportation++;
            }
          }

          // Process transportation - Return
          if (columnMap.returnTransport) {
            const typeRaw = cleanText(
              getDataByHeader(row, columnMap.returnTransport),
            );
            const mode = columnMap.returnMode
              ? cleanText(getDataByHeader(row, columnMap.returnMode))
              : null;
            const dt = columnMap.returnDateTime
              ? cleanText(getDataByHeader(row, columnMap.returnDateTime))
              : null;
            const details = columnMap.returnDetails
              ? cleanText(getDataByHeader(row, columnMap.returnDetails))
              : null;
            const hasAny = typeRaw || mode || dt || details;
            if (hasAny) {
              const combined = [mode, dt, details].filter(Boolean).join(" | ");
              const type =
                typeRaw ||
                (combined.includes("เครื่องบิน")
                  ? "เครื่องบิน"
                  : combined.includes("รถบัส")
                    ? "รถบัส"
                    : combined.includes("รถไฟ")
                      ? "รถไฟ"
                      : "อื่นๆ");
              const { error: transportError } = await supabase
                .from("seminar_transportation")
                .upsert(
                  {
                    participant_id: participantId,
                    direction: "return",
                    transport_type: type,
                    details: combined || null,
                  },
                  { onConflict: "participant_id,direction" },
                );
              if (!transportError) results.perTable.transportation++;
            }
          }

          // Process finance data
          if (
            columnMap.activityFee ||
            columnMap.accommodationFee ||
            columnMap.dinnerFee ||
            columnMap.paymentStatus
          ) {
            const financeData = {
              participant_id: participantId,
              activity_fee:
                parseNumeric(getDataByHeader(row, columnMap.activityFee)) ||
                null,
              accommodation_fee:
                parseNumeric(
                  getDataByHeader(row, columnMap.accommodationFee),
                ) || null,
              dinner_fee:
                parseNumeric(getDataByHeader(row, columnMap.dinnerFee)) || null,
              total_fee: null,
              payment_status: truncateText(
                cleanText(getDataByHeader(row, columnMap.paymentStatus)),
                100,
              ),
              payment_details: truncateText(
                cleanText(getDataByHeader(row, columnMap.paymentDetails)),
                1000,
              ),
              payment_document: truncateText(
                cleanText(getDataByHeader(row, columnMap.paymentDocument)),
                500,
              ),
            };

            // Calculate total fee
            const total =
              (financeData.activity_fee || 0) +
              (financeData.accommodation_fee || 0) +
              (financeData.dinner_fee || 0);
            (financeData as any).total_fee = total > 0 ? total : null;

            const { error: financeError } = await supabase
              .from("seminar_finances")
              .upsert(financeData, { onConflict: "participant_id" });

            if (!financeError) {
              results.perTable.finances++;
            }
          }

          // Daily stays
          const stays = [
            { header: columnMap.stay_20_11, date: "2025-11-20" },
            { header: columnMap.stay_21_11, date: "2025-11-21" },
            { header: columnMap.stay_22_11, date: "2025-11-22" },
            { header: columnMap.stay_23_11, date: "2025-11-23" },
          ];
          if (stays.some((s) => s.header)) {
            const { data: accom } = await supabase
              .from("seminar_accommodations")
              .select("id")
              .eq("participant_id", participantId)
              .maybeSingle();
            if (accom) {
              for (const s of stays) {
                if (!s.header) continue;
                const val = cleanText(getDataByHeader(row, s.header));
                if (val) {
                  await supabase.from("seminar_accommodation_daily").upsert(
                    {
                      accommodation_id: accom.id,
                      stay_date: s.date,
                      status: val === "1" ? "1" : val === "--" ? "--" : "0",
                    },
                    { onConflict: "accommodation_id,stay_date" },
                  );
                  results.perTable.accommodationDaily++;
                }
              }
            }
          }

          // Events
          const eventCols = [
            { header: columnMap.event_1, name: "งานสัมมนาหอการค้า 5 ภาค" },
            {
              header: columnMap.event_2,
              name: "ดูงานสำหรับที่ปรึกษาและกรรมการหอการค้าไทย",
            },
            { header: columnMap.event_3, name: "ดูงานคณะกรรมการ ณ Sea Wealth" },
            {
              header: columnMap.event_4,
              name: "ดูงานคณะกรรมการ ณ บริษัท พาเนล พลัส",
            },
            {
              header: columnMap.event_5,
              name: "งานเลี้ยงต้อนรับ โดยหอจังหวัดสงขลา",
            },
            {
              header: columnMap.event_6,
              name: "งานสัมมนา Unlocking New Growth: ศักยภาพใหม่แห่งการเติบโต",
            },
            {
              header: columnMap.event_7,
              name: "งานสัมมนา Unlocking Thailand's Digital & AI Success",
            },
            {
              header: columnMap.event_8,
              name: "งานเลี้ยงภาคค่ำ+พิธีมอบรางวัลประจำปี 2568",
            },
            {
              header: columnMap.event_9,
              name: 'มอบรางวัลผู้ว่าราชการจังหวัด "สำเภาทอง" + สรุปผลการสัมมนาฯ',
            },
          ];
          for (const ev of eventCols) {
            if (!ev.header) continue;
            const v = cleanText(getDataByHeader(row, ev.header));
            if (v === "1") {
              const { data: event } = await supabase
                .from("seminar_events")
                .select("id")
                .ilike("name", `%${ev.name}%`)
                .maybeSingle();
              if (event) {
                await supabase.from("seminar_event_participants").upsert(
                  {
                    participant_id: participantId,
                    event_id: event.id,
                    registration_status: "ลงทะเบียน",
                  },
                  { onConflict: "participant_id,event_id" },
                );
                results.perTable.events++;
              }
            }
          }
        } catch (error) {
          console.error(`Error processing row ${i + 1}:`, error);
          results.errors.push(
            `Row ${i + 1}: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
          results.errorRows.push({
            row: i + 1,
            data: dataRows[i],
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    } else {
      // Dry run - just count what would be processed
      console.log("Dry run: Processing", maxRows, "rows");
      console.log(
        "Dry run: Column mapping fullName index:",
        columnMap.fullName,
      );

      const validRows = dataRows.slice(0, maxRows).filter((row) => {
        const hasName =
          getDataByHeader(row, columnMap.fullName) &&
          cleanText(getDataByHeader(row, columnMap.fullName));
        console.log(
          "Dry run: Row has name:",
          hasName,
          "Value:",
          getDataByHeader(row, columnMap.fullName),
        );
        return hasName;
      });

      console.log("Dry run: Valid rows count:", validRows.length);

      results.perTable.participants = validRows.length;
      results.perTable.accommodations = validRows.filter(
        (row) =>
          getDataByHeader(row, columnMap.hotelName) &&
          cleanText(getDataByHeader(row, columnMap.hotelName)),
      ).length;

      const outboundTransport = validRows.filter(
        (row) =>
          getDataByHeader(row, columnMap.outboundTransport) &&
          getDataByHeader(row, columnMap.outboundDetails) &&
          cleanText(getDataByHeader(row, columnMap.outboundDetails)),
      ).length;
      const returnTransport = validRows.filter(
        (row) =>
          getDataByHeader(row, columnMap.returnTransport) &&
          getDataByHeader(row, columnMap.returnDetails) &&
          cleanText(getDataByHeader(row, columnMap.returnDetails)),
      ).length;
      results.perTable.transportation = outboundTransport + returnTransport;

      results.perTable.finances = validRows.filter(
        (row) =>
          (getDataByHeader(row, columnMap.activityFee) &&
            cleanText(getDataByHeader(row, columnMap.activityFee))) ||
          (getDataByHeader(row, columnMap.accommodationFee) &&
            cleanText(getDataByHeader(row, columnMap.accommodationFee))) ||
          (getDataByHeader(row, columnMap.dinnerFee) &&
            cleanText(getDataByHeader(row, columnMap.dinnerFee))),
      ).length;

      console.log("Dry run: Final counts:", results.perTable);
    }

    // Log audit event
    await audit.logEvent({
      action: "csv_import",
      resource: "seminar_participants",
      actor_id: user.id,
      actor_role: "admin",
      result: "success",
      correlation_id: `csv_import_${Date.now()}`,
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
      message: `CSV import completed successfully${dryRun ? " (DRY RUN)" : ""}`,
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
    console.error("CSV import error:", error);

    // Log audit event for error
    await audit.logEvent({
      action: "csv_import_error",
      resource: "seminar_participants",
      actor_id: "system",
      actor_role: "admin",
      result: "error",
      correlation_id: `csv_import_error_${Date.now()}`,
      meta: {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
    });

    return NextResponse.json(
      {
        error: "CSV import failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
