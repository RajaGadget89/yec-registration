import * as XLSX from "xlsx";

export interface ExcelData {
  sheetName: string;
  data: Record<string, any>[];
  headers: string[];
  rowCount: number;
}

export interface ParseResult {
  success: boolean;
  data?: ExcelData[];
  error?: string;
  warnings?: string[];
}

export class ExcelParserService {
  /**
   * Parse Excel file and return structured data
   */
  async parseExcelFile(file: File): Promise<ParseResult> {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      const sheets: ExcelData[] = [];
      const warnings: string[] = [];

      // Process each sheet
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];

        // Convert sheet to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1, // Use first row as headers
          defval: "", // Default value for empty cells
          raw: false, // Convert all values to strings
        });

        if (jsonData.length === 0) {
          warnings.push(`Sheet "${sheetName}" is empty`);
          continue;
        }

        // Extract headers (first row)
        const headers = jsonData[0] as string[];
        const dataRows = jsonData.slice(1) as any[][];

        // Convert to object format
        const data = dataRows.map((row, index) => {
          const obj: Record<string, any> = {};
          headers.forEach((header, colIndex) => {
            obj[header] = row[colIndex] || "";
          });
          return obj;
        });

        sheets.push({
          sheetName,
          data,
          headers,
          rowCount: data.length,
        });
      }

      // If no sheets or all sheets are empty
      if (sheets.length === 0) {
        return {
          success: false,
          error: "No valid data found in Excel file",
        };
      }

      return {
        success: true,
        data: sheets,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      console.error("Error parsing Excel file:", error);
      return {
        success: false,
        error: `Failed to parse Excel file: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Parse CSV file and return structured data
   */
  async parseCSVFile(file: File): Promise<ParseResult> {
    try {
      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());

      if (lines.length === 0) {
        return {
          success: false,
          error: "CSV file is empty",
        };
      }

      // Parse CSV manually to handle Thai characters properly
      const headers = this.parseCSVLine(lines[0]);
      const data = lines.slice(1).map((line) => {
        const values = this.parseCSVLine(line);
        const obj: Record<string, any> = {};
        headers.forEach((header, index) => {
          obj[header] = values[index] || "";
        });
        return obj;
      });

      return {
        success: true,
        data: [
          {
            sheetName: "Sheet1",
            data,
            headers,
            rowCount: data.length,
          },
        ],
      };
    } catch (error) {
      console.error("Error parsing CSV file:", error);
      return {
        success: false,
        error: `Failed to parse CSV file: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Parse a single CSV line handling quoted fields and commas
   */
  private parseCSVLine(line: string): string[] {
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
  }

  /**
   * Detect file type and parse accordingly
   */
  async parseFile(file: File): Promise<ParseResult> {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".csv")) {
      return this.parseCSVFile(file);
    } else if (fileName.endsWith(".xls") || fileName.endsWith(".xlsx")) {
      return this.parseExcelFile(file);
    } else {
      return {
        success: false,
        error: "Unsupported file type. Only CSV and Excel files are supported.",
      };
    }
  }

  /**
   * Validate Excel/CSV data structure
   */
  validateDataStructure(data: ExcelData[]): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (data.length === 0) {
      errors.push("No data found in file");
      return { valid: false, errors, warnings };
    }

    // Check for required columns (based on Google Form structure)
    const requiredColumns = [
      "ชื่อ",
      "นามสกุล",
      "เบอร์โทรศัพท์",
      "สมาชิกหอการค้า / YEC จังหวัด?",
    ];

    for (const sheet of data) {
      if (sheet.data.length === 0) {
        warnings.push(`Sheet "${sheet.sheetName}" has no data rows`);
        continue;
      }

      // Check for required columns
      const missingColumns = requiredColumns.filter(
        (col) => !sheet.headers.some((header) => header.includes(col)),
      );

      if (missingColumns.length > 0) {
        errors.push(
          `Missing required columns in sheet "${sheet.sheetName}": ${missingColumns.join(", ")}`,
        );
      }

      // Check for empty required fields
      const emptyRequiredFields = sheet.data
        .map((row, index) => {
          const emptyFields: string[] = [];
          requiredColumns.forEach((col) => {
            const header = sheet.headers.find((h) => h.includes(col));
            if (
              header &&
              (!row[header] || row[header].toString().trim() === "")
            ) {
              emptyFields.push(col);
            }
          });
          return { row: index + 2, fields: emptyFields }; // +2 because of header row and 0-based index
        })
        .filter((item) => item.fields.length > 0);

      if (emptyRequiredFields.length > 0) {
        warnings.push(
          `Empty required fields found in sheet "${sheet.sheetName}": ${emptyRequiredFields.map((item) => `Row ${item.row} (${item.fields.join(", ")})`).join(", ")}`,
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get file statistics
   */
  getFileStatistics(data: ExcelData[]): {
    totalSheets: number;
    totalRows: number;
    totalColumns: number;
    fileSize: string;
  } {
    const totalSheets = data.length;
    const totalRows = data.reduce((sum, sheet) => sum + sheet.rowCount, 0);
    const totalColumns = data.length > 0 ? data[0].headers.length : 0;

    return {
      totalSheets,
      totalRows,
      totalColumns,
      fileSize: "N/A", // File size not available in this context
    };
  }
}
