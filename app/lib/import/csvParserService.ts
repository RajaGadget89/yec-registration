import * as Papa from "papaparse";

export interface ParsedRecord {
  rowNumber: number;
  data: Record<string, any>;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ParsedSheet {
  sheetName: string;
  headers: string[];
  records: ParsedRecord[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
}

export interface ParseResult {
  success: boolean;
  sheets?: ParsedSheet[];
  error?: string;
  statistics?: {
    totalSheets: number;
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
  };
}

export class CSVParserService {
  private readonly requiredFields = [
    "ชื่อ",
    "นามสกุล",
    "เบอร์โทรศัพท์",
    "สมาชิกหอการค้า / YEC จังหวัด?",
  ];

  private readonly optionalFields = [
    "ชื่อเล่น",
    "Line ID",
    "ประเภทธุรกิจ",
    "ชื่อ ผู้พักร่วม",
    "นามสกุล ผู้พักร่วม",
    "ประเภทการเดินทาง",
    "บัตรสมาชิก TCC Connect",
    "รูป Profile",
    "ชื่อกิจการ หรือ บริษัท",
    "ต้องการซื้อบัตรแบบไหน",
    "โรงแรมที่พัก",
    "สลิปโอนเงิน",
    "หมายเหตุ",
  ];

  private readonly validProvinces = [
    "กรุงเทพมหานคร",
    "เชียงใหม่",
    "เชียงราย",
    "ลำปาง",
    "ลำพูน",
    "แม่ฮ่องสอน",
    "นครสวรรค์",
    "อุทัยธานี",
    "กำแพงเพชร",
    "ตาก",
    "สุโขทัย",
    "พิษณุโลก",
    "พิจิตร",
    "เพชรบูรณ์",
    "ราชบุรี",
    "กาญจนบุรี",
    "สุพรรณบุรี",
    "นครปฐม",
    "สมุทรสาคร",
    "สมุทรสงคราม",
    "เพชรบุรี",
    "ประจวบคีรีขันธ์",
    "ชุมพร",
    "ระนอง",
    "กระบี่",
    "พังงา",
    "ภูเก็ต",
    "สุราษฎร์ธานี",
    "นครศรีธรรมราช",
    "ตรัง",
    "พัทลุง",
    "สงขลา",
    "ยะลา",
    "นราธิวาส",
    "ปัตตานี",
    "สตูล",
    "นครราชสีมา",
    "บุรีรัมย์",
    "สุรินทร์",
    "ศรีสะเกษ",
    "อุบลราชธานี",
    "ยโสธร",
    "ชัยภูมิ",
    "อำนาจเจริญ",
    "หนองบัวลำภู",
    "ขอนแก่น",
    "อุดรธานี",
    "เลย",
    "หนองคาย",
    "มหาสารคาม",
    "ร้อยเอ็ด",
    "กาฬสินธุ์",
    "สกลนคร",
    "นครพนม",
    "มุกดาหาร",
    "ชลบุรี",
    "ระยอง",
    "จันทบุรี",
    "ตราด",
    "ฉะเชิงเทรา",
    "ปราจีนบุรี",
    "สระแก้ว",
    "นครนายก",
    "ปทุมธานี",
    "สมุทรปราการ",
    "นนทบุรี",
  ];

  private readonly businessTypes = [
    "ธุรกิจการค้า",
    "ธุรกิจบริการ",
    "ธุรกิจอุตสาหกรรม",
    "ธุรกิจเกษตร",
    "ธุรกิจเทคโนโลยี",
    "อื่นๆ",
  ];

  private readonly travelTypes = [
    "รถยนต์ส่วนตัว",
    "รถตู้",
    "รถประจำทาง",
    "เครื่องบิน",
    "รถไฟ",
  ];

  /**
   * Parse CSV or Excel file and validate data
   */
  async parseFile(file: File): Promise<ParseResult> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(data, { type: "array" });

      const parsedSheets: ParsedSheet[] = [];
      let totalRecords = 0;
      let validRecords = 0;
      let invalidRecords = 0;

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonSheet: any[] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
        });

        if (jsonSheet.length === 0) {
          continue;
        }

        const headers = jsonSheet[0] as string[];
        const dataRows = jsonSheet.slice(1);

        const records: ParsedRecord[] = [];
        let sheetValidRecords = 0;
        let sheetInvalidRecords = 0;

        for (let i = 0; i < dataRows.length; i++) {
          const rowData = dataRows[i];
          const rowNumber = i + 2; // +2 because we skip header and 0-indexed

          const record: ParsedRecord = {
            rowNumber,
            data: this.createRecordObject(headers, rowData),
            isValid: true,
            errors: [],
            warnings: [],
          };

          // Validate the record
          this.validateRecord(record);

          if (record.isValid) {
            sheetValidRecords++;
          } else {
            sheetInvalidRecords++;
          }

          records.push(record);
        }

        const sheet: ParsedSheet = {
          sheetName,
          headers,
          records,
          totalRows: records.length,
          validRows: sheetValidRecords,
          invalidRows: sheetInvalidRecords,
        };

        parsedSheets.push(sheet);
        totalRecords += records.length;
        validRecords += sheetValidRecords;
        invalidRecords += sheetInvalidRecords;
      }

      return {
        success: true,
        sheets: parsedSheets,
        statistics: {
          totalSheets: parsedSheets.length,
          totalRecords,
          validRecords,
          invalidRecords,
        },
      };
    } catch (error: any) {
      console.error("Error parsing file:", error);
      return {
        success: false,
        error: `Failed to parse file: ${error.message}`,
      };
    }
  }

  /**
   * Create a record object from headers and row data
   */
  private createRecordObject(
    headers: string[],
    rowData: any[],
  ): Record<string, any> {
    const record: Record<string, any> = {};

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const value = rowData[i];

      if (header && value !== undefined && value !== null) {
        record[header] = this.cleanValue(value);
      }
    }

    return record;
  }

  /**
   * Clean and normalize field values
   */
  private cleanValue(value: any): string {
    if (value === null || value === undefined) {
      return "";
    }

    let cleaned = String(value).trim();

    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, " ");

    return cleaned;
  }

  /**
   * Validate a single record
   */
  private validateRecord(record: ParsedRecord): void {
    const { data } = record;

    // Validate required fields
    for (const field of this.requiredFields) {
      if (!data[field] || data[field].trim() === "") {
        record.isValid = false;
        record.errors.push(`Required field '${field}' is missing`);
      }
    }

    // Validate phone number format
    if (data["เบอร์โทรศัพท์"]) {
      const phone = data["เบอร์โทรศัพท์"].replace(/\D/g, "");
      if (phone.length < 9 || phone.length > 10) {
        record.isValid = false;
        record.errors.push(
          `Invalid phone number format: ${data["เบอร์โทรศัพท์"]}`,
        );
      }
    }

    // Validate province
    if (data["สมาชิกหอการค้า / YEC จังหวัด?"]) {
      const province = data["สมาชิกหอการค้า / YEC จังหวัด?"];
      if (!this.validProvinces.includes(province)) {
        record.warnings.push(`Province '${province}' may not be valid`);
      }
    }

    // Validate business type
    if (data["ประเภทธุรกิจ"]) {
      const businessType = data["ประเภทธุรกิจ"];
      if (
        !this.businessTypes.includes(businessType) &&
        businessType !== "อื่นๆ"
      ) {
        record.warnings.push(
          `Business type '${businessType}' may not be standard`,
        );
      }
    }

    // Validate travel type
    if (data["ประเภทการเดินทาง"]) {
      const travelType = data["ประเภทการเดินทาง"];
      if (!this.travelTypes.includes(travelType)) {
        record.warnings.push(`Travel type '${travelType}' may not be standard`);
      }
    }

    // Check for duplicate phone numbers (this would need to be done across all records)
    // For now, we'll just note it as a warning
    if (data["เบอร์โทรศัพท์"]) {
      const phone = data["เบอร์โทรศัพท์"].replace(/\D/g, "");
      if (phone.length === 10 && !phone.startsWith("0")) {
        record.warnings.push(`Phone number may be missing country code`);
      }
    }

    // Validate Google Drive URLs
    if (data["บัตรสมาชิก TCC Connect"]) {
      if (!this.isValidGoogleDriveUrl(data["บัตรสมาชิก TCC Connect"])) {
        record.warnings.push(
          `TCC card URL may not be a valid Google Drive link`,
        );
      }
    }

    if (data["รูป Profile"]) {
      if (!this.isValidGoogleDriveUrl(data["รูป Profile"])) {
        record.warnings.push(
          `Profile image URL may not be a valid Google Drive link`,
        );
      }
    }

    if (data["สลิปโอนเงิน"]) {
      if (!this.isValidGoogleDriveUrl(data["สลิปโอนเงิน"])) {
        record.warnings.push(
          `Payment slip URL may not be a valid Google Drive link`,
        );
      }
    }
  }

  /**
   * Check if URL is a valid Google Drive link
   */
  private isValidGoogleDriveUrl(url: string): boolean {
    if (!url || typeof url !== "string") {
      return false;
    }

    const googleDrivePatterns = [
      /https?:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+/,
      /https?:\/\/drive\.google\.com\/open\?id=[a-zA-Z0-9_-]+/,
      /https?:\/\/docs\.google\.com\/document\/d\/[a-zA-Z0-9_-]+/,
      /https?:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9_-]+/,
    ];

    return googleDrivePatterns.some((pattern) => pattern.test(url));
  }

  /**
   * Get field mapping for Thai to English conversion
   */
  getFieldMapping(): Record<string, string> {
    return {
      ชื่อ: "first_name",
      นามสกุล: "last_name",
      ชื่อเล่น: "nickname",
      เบอร์โทรศัพท์: "phone",
      "Line ID": "line_id",
      "สมาชิกหอการค้า / YEC จังหวัด?": "yec_province",
      ประเภทธุรกิจ: "business_type",
      "ชื่อ ผู้พักร่วม": "roommate_first_name",
      "นามสกุล ผู้พักร่วม": "roommate_last_name",
      ประเภทการเดินทาง: "travel_type",
      "บัตรสมาชิก TCC Connect": "chamber_card_url",
      "รูป Profile": "profile_image_url",
      "ชื่อกิจการ หรือ บริษัท": "company_name",
      ต้องการซื้อบัตรแบบไหน: "package_choice",
      โรงแรมที่พัก: "hotel_choice",
      สลิปโอนเงิน: "payment_slip_url",
      หมายเหตุ: "notes",
    };
  }

  /**
   * Get province mapping for Thai to English conversion
   */
  getProvinceMapping(): Record<string, string> {
    return {
      กรุงเทพมหานคร: "Bangkok",
      เชียงใหม่: "Chiang Mai",
      เชียงราย: "Chiang Rai",
      ลำปาง: "Lampang",
      ลำพูน: "Lamphun",
      แม่ฮ่องสอน: "Mae Hong Son",
      นครสวรรค์: "Nakhon Sawan",
      อุทัยธานี: "Uthai Thani",
      กำแพงเพชร: "Kamphaeng Phet",
      ตาก: "Tak",
      สุโขทัย: "Sukhothai",
      พิษณุโลก: "Phitsanulok",
      พิจิตร: "Phichit",
      เพชรบูรณ์: "Phetchabun",
      ราชบุรี: "Ratchaburi",
      กาญจนบุรี: "Kanchanaburi",
      สุพรรณบุรี: "Suphan Buri",
      นครปฐม: "Nakhon Pathom",
      สมุทรสาคร: "Samut Sakhon",
      สมุทรสงคราม: "Samut Songkhram",
      เพชรบุรี: "Phetchaburi",
      ประจวบคีรีขันธ์: "Prachuap Khiri Khan",
      ชุมพร: "Chumphon",
      ระนอง: "Ranong",
      กระบี่: "Krabi",
      พังงา: "Phang Nga",
      ภูเก็ต: "Phuket",
      สุราษฎร์ธานี: "Surat Thani",
      นครศรีธรรมราช: "Nakhon Si Thammarat",
      ตรัง: "Trang",
      พัทลุง: "Phatthalung",
      สงขลา: "Songkhla",
      ยะลา: "Yala",
      นราธิวาส: "Narathiwat",
      ปัตตานี: "Pattani",
      สตูล: "Satun",
      นครราชสีมา: "Nakhon Ratchasima",
      บุรีรัมย์: "Buriram",
      สุรินทร์: "Surin",
      ศรีสะเกษ: "Sisaket",
      อุบลราชธานี: "Ubon Ratchathani",
      ยโสธร: "Yasothon",
      ชัยภูมิ: "Chaiyaphum",
      อำนาจเจริญ: "Amnat Charoen",
      หนองบัวลำภู: "Nong Bua Lamphu",
      ขอนแก่น: "Khon Kaen",
      อุดรธานี: "Udon Thani",
      เลย: "Loei",
      หนองคาย: "Nong Khai",
      มหาสารคาม: "Maha Sarakham",
      ร้อยเอ็ด: "Roi Et",
      กาฬสินธุ์: "Kalasin",
      สกลนคร: "Sakon Nakhon",
      นครพนม: "Nakhon Phanom",
      มุกดาหาร: "Mukdahan",
      ชลบุรี: "Chonburi",
      ระยอง: "Rayong",
      จันทบุรี: "Chanthaburi",
      ตราด: "Trat",
      ฉะเชิงเทรา: "Chachoengsao",
      ปราจีนบุรี: "Prachinburi",
      สระแก้ว: "Sa Kaeo",
      นครนายก: "Nakhon Nayok",
      ปทุมธานี: "Pathum Thani",
      สมุทรปราการ: "Samut Prakan",
      นนทบุรี: "Nonthaburi",
    };
  }
}
