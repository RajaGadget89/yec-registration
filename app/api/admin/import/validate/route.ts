import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
// import { getProvinceCode } from '@/lib/provinceCodes';
import { validateSuperAdminAccess } from "@/lib/auth/admin-auth";
// import { DataTransformerService } from '@/lib/import/dataTransformerService';
import { JsonConfigurationTransformer } from "@/lib/import/jsonConfigurationTransformer";

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

interface ValidationResult {
  validRecords: number;
  invalidRecords: number;
  errors: ValidationError[];
  warnings: string[];
}

export async function POST(request: NextRequest) {
  try {
    // Validate super admin access
    const adminValidation = await validateSuperAdminAccess(request);
    if (!adminValidation.valid) {
      return NextResponse.json(
        { error: "Unauthorized", message: adminValidation.error },
        { status: 401 },
      );
    }

    const { sessionId, csvData } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Bad Request", message: "Session ID is required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

    // Get session data
    const { data: session, error: sessionError } = await supabase
      .from("import_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found", message: "Import session not found" },
        { status: 404 },
      );
    }

    console.log("=== VALIDATION DEBUG ===");
    console.log("Session ID:", sessionId);
    console.log("Session metadata keys:", Object.keys(session.metadata || {}));

    // Get CSV data from session metadata
    const parsedData = session.metadata?.parsed_data;
    console.log("Parsed data from session:", parsedData);

    // Flatten the data from session
    let flattenedData: any[] = [];
    if (parsedData && Array.isArray(parsedData)) {
      // If parsed_data is an array of sheets, flatten them
      if (parsedData.length > 0 && parsedData[0].data) {
        flattenedData = parsedData[0].data; // Use first sheet data
        console.log("Using first sheet data, length:", flattenedData.length);
      } else {
        flattenedData = parsedData; // Use data directly
        console.log(
          "Using parsed data directly, length:",
          flattenedData.length,
        );
      }
    } else {
      console.log("No parsed data found in session metadata");
    }

    console.log("Flattened data length:", flattenedData.length);

    if (flattenedData.length > 0) {
      console.log(
        "Sample flattened record:",
        JSON.stringify(flattenedData[0], null, 2),
      );
    }

    // Validate the data
    const validationResult = await validateCSVData(flattenedData);
    console.log("Validation result:", validationResult);

    // Transform data using JSON configuration engine
    let mappedRecords: any[] = [];
    let allColumns: string[] = [];

    console.log("=== TRANSFORMATION DEBUG ===");
    console.log(
      "Starting data transformation for",
      flattenedData.length,
      "records...",
    );
    console.log("Using JSON configuration engine (single gateway)");

    if (flattenedData && flattenedData.length > 0) {
      try {
        // JSON-only transformer (single gateway)
        console.log("=== USING JSON CONFIGURATION TRANSFORMER ===");
        const jsonTransformer = new JsonConfigurationTransformer();
        await jsonTransformer.loadConfiguration();

        mappedRecords = flattenedData.map((row: any, index: number) => {
          const res = jsonTransformer.transformRow(row);
          return {
            ...(res.transformedData || {}),
            row_number: index + 1,
            is_valid: res.success,
            validation_errors: res.errors,
            validation_warnings: res.warnings,
          };
        });

        allColumns = Object.keys(mappedRecords[0] || {});
        console.log(
          "Generated columns from JSON transformation:",
          allColumns.length,
        );
        console.log(
          "Sample mapped record:",
          JSON.stringify(mappedRecords[0], null, 2),
        );
        console.log("Mapped records count:", mappedRecords.length);
      } catch (error: any) {
        console.error("❌ Hybrid transformer error:", error);
        console.log("Falling back to basic mapping...");

        // Simple fallback mapping
        mappedRecords = flattenedData.map((row: any, index: number) => ({
          row_number: index + 1,
          first_name: row["ชื่อ"] || "",
          last_name: row["นามสกุล"] || "",
          phone: row["เบอร์โทรศัพท์"] || "",
          email: row["อีเมล"] || "",
          title: row["เพศ"] || "",
          company_name: row["ชื่อกิจการ หรือ บริษัท"] || "",
          yec_province: row["สมาชิกหอการค้า / YEC จังหวัด?"] || "",
          business_type: row["ประเภทธุรกิจ"] || "",
          nickname: row["ชื่อเล่น"] || "",
          line_id: row["Line ID"] || "",
          hotel_choice: row["ต้องการซื้อบัตรแบบไหน"] || "",
          is_valid: true,
          validation_errors: [],
          validation_warnings: [],
        }));

        allColumns = [
          "row_number",
          "first_name",
          "last_name",
          "phone",
          "email",
          "title",
          "company_name",
          "yec_province",
          "business_type",
          "nickname",
          "line_id",
          "hotel_choice",
          "is_valid",
        ];
        console.log("Using fallback mapping:", mappedRecords.length, "records");
      }
    } else {
      console.log("No data to transform");
      mappedRecords = [];
      allColumns = [];
    }

    console.log("=== FINAL TRANSFORMATION RESULT ===");
    console.log("Mapped records length:", mappedRecords.length);
    console.log("Expected records length:", flattenedData.length);
    console.log(
      "Records match:",
      mappedRecords.length === flattenedData.length,
    );

    // Update session with validation results AND mapped records
    await supabase
      .from("import_sessions")
      .update({
        metadata: {
          ...session.metadata,
          validation_result: validationResult,
          mappedRecords: mappedRecords, // Store the transformed data for execution
          preview_data: mappedRecords, // Also store as preview_data for consistency
          validated_at: new Date().toISOString(),
        },
      })
      .eq("id", sessionId);

    console.log("=== RESPONSE DEBUG ===");
    console.log("Returning mappedRecords count:", mappedRecords.length);
    console.log("Returning columns count:", allColumns.length);
    console.log(
      "Sample response mappedRecord:",
      JSON.stringify(mappedRecords[0], null, 2),
    );

    // Use transformation results for validation counts instead of basic validation
    const validRecords = mappedRecords.filter(
      (record) => record.is_valid,
    ).length;
    const invalidRecords = mappedRecords.filter(
      (record) => !record.is_valid,
    ).length;

    console.log("=== FINAL VALIDATION COUNTS ===");
    console.log("Valid records (from transformation):", validRecords);
    console.log("Invalid records (from transformation):", invalidRecords);
    console.log("Total records:", mappedRecords.length);

    return NextResponse.json({
      success: true,
      validation: {
        ...validationResult,
        validRecords,
        invalidRecords,
        totalRecords: mappedRecords.length,
      },
      mappedRecords,
      columns: allColumns,
      sessionId,
      // Add validation data at top level for frontend compatibility
      validRecords,
      invalidRecords,
      totalRecords: mappedRecords.length,
      allColumns: allColumns,
    });
  } catch (error: any) {
    console.error("Error in data validation:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error.message,
        details: error.stack,
      },
      { status: 500 },
    );
  }
}

async function validateCSVData(csvData: any[]): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  let validRecords = 0;
  let invalidRecords = 0;

  for (let i = 0; i < csvData.length; i++) {
    const row = csvData[i];
    const rowNumber = i + 1;
    let hasErrors = false;

    // Check required fields
    const requiredFields = ["ชื่อ", "นามสกุล", "เบอร์โทรศัพท์", "อีเมล"];
    for (const field of requiredFields) {
      if (!row[field] || row[field].toString().trim() === "") {
        errors.push({
          row: rowNumber,
          field,
          message: "Required field is missing",
          value: row[field],
        });
        hasErrors = true;
      }
    }

    // Check email format
    if (row["อีเมล"] && !isValidEmail(row["อีเมล"])) {
      errors.push({
        row: rowNumber,
        field: "อีเมล",
        message: "Invalid email format",
        value: row["อีเมล"],
      });
      hasErrors = true;
    }

    // Check phone format
    if (row["เบอร์โทรศัพท์"] && !isValidPhone(row["เบอร์โทรศัพท์"])) {
      errors.push({
        row: rowNumber,
        field: "เบอร์โทรศัพท์",
        message: "Invalid phone format",
        value: row["เบอร์โทรศัพท์"],
      });
      hasErrors = true;
    }

    if (hasErrors) {
      invalidRecords++;
    } else {
      validRecords++;
    }
  }

  return {
    validRecords,
    invalidRecords,
    errors,
    warnings,
  };
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,15}$/;
  return phoneRegex.test(phone);
}
