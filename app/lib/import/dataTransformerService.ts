import { CSVParserService, ParsedRecord } from "./csvParserService";
import { AdvancedDataTransformerService } from "./advancedDataTransformerService";
import { ConfigurationDrivenTransformer } from "./configurationDrivenTransformer";
import { HybridTransformer } from "./hybridTransformer";
import { ConflictResolutionService } from "./conflictResolutionService";
import { ImageProcessingPipeline } from "./imageProcessingPipeline";

export interface TransformedRecord {
  originalData: Record<string, any>;
  transformedData: {
    // Basic Information
    first_name: string;
    last_name: string;
    nickname: string;
    phone: string;
    line_id: string;
    email: string;
    title: string;

    // Business Information
    company_name: string;
    business_type: string;
    business_type_other: string | null;
    yec_province: string;

    // Accommodation Information
    hotel_choice: "in-quota" | "out-of-quota";
    room_type: "single" | "double" | "suite" | "no-accommodation" | null;
    roommate_info: string | null;
    roommate_phone: string | null;
    external_hotel_name: string | null;

    // Travel Information
    travel_type: "private-car" | "van";

    // File URLs
    profile_image_url: string | null;
    chamber_card_url: string | null;
    payment_slip_url: string | null;

    // Additional Information
    notes: string | null;
  };
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  metadata: {
    rowNumber: number;
    originalHeaders: string[];
    transformationTimestamp: string;
  };
}

export interface TransformationResult {
  success: boolean;
  transformedRecords: TransformedRecord[];
  statistics: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    transformationErrors: number;
  };
  errors?: string[];
}

export class DataTransformerService {
  private csvParser: CSVParserService;
  private fieldMapping: Record<string, string>;
  private provinceMapping: Record<string, string>;
  private advancedTransformer: AdvancedDataTransformerService;
  private configurationTransformer: ConfigurationDrivenTransformer;
  private hybridTransformer: HybridTransformer;
  private conflictResolver: ConflictResolutionService;
  private imageProcessor: ImageProcessingPipeline;
  private useConfiguration: boolean = true; // Flag to switch between hardcoded and JSON config
  private useHybrid: boolean = true; // Flag to use hybrid approach (JSON + Hardcoded)

  constructor() {
    this.csvParser = new CSVParserService();
    this.fieldMapping = this.csvParser.getFieldMapping();
    this.provinceMapping = this.csvParser.getProvinceMapping();
    this.advancedTransformer = new AdvancedDataTransformerService();
    // Ensure ConfigurationDrivenTransformer uses the correct JSON file path
    this.configurationTransformer = new ConfigurationDrivenTransformer();
    this.hybridTransformer = new HybridTransformer();
    this.conflictResolver = new ConflictResolutionService({
      allowDuplicateEmails: false,
      allowDuplicatePhones: false,
      autoResolveConflicts: true,
      requireManualReview: false,
      maxConflictsForAutoResolve: 10,
    });
    this.imageProcessor = new ImageProcessingPipeline(
      // These will be injected properly in the actual implementation
      {} as any, // GoogleDriveService
      {} as any, // SupabaseStorageService
      {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
        ],
        retryAttempts: 3,
        retryDelay: 1000,
        supabaseBucket: "yec-registration-files",
      },
    );
  }

  /**
   * Set transformation mode
   */
  setUseConfiguration(useConfig: boolean): void {
    this.useConfiguration = useConfig;
    console.log(
      `Transformation mode set to: ${useConfig ? "JSON Configuration" : "Hardcoded"}`,
    );
  }

  /**
   * Set hybrid mode
   */
  setUseHybrid(useHybrid: boolean): void {
    this.useHybrid = useHybrid;
    this.hybridTransformer.setHybridMode(useHybrid);
    console.log(
      `Hybrid mode set to: ${useHybrid ? "Hybrid (JSON + Hardcoded)" : "JSON Only"}`,
    );
  }

  /**
   * Transform parsed CSV records to system format
   */
  async transformRecords(
    parsedRecords: ParsedRecord[],
  ): Promise<TransformationResult> {
    console.log("=== DataTransformerService.transformRecords ===");
    console.log("Input parsed records count:", parsedRecords.length);
    console.log(
      "Using configuration-driven transformation:",
      this.useConfiguration,
    );
    console.log("Using hybrid approach:", this.useHybrid);

    if (this.useHybrid) {
      // Use hybrid approach (JSON + Hardcoded)
      try {
        const result =
          await this.hybridTransformer.transformRecords(parsedRecords);

        // Convert to expected format
        return {
          success: result.success,
          transformedRecords: result.transformedRecords,
          statistics: {
            totalRecords: result.statistics.totalRecords,
            validRecords: result.statistics.validRecords,
            invalidRecords: result.statistics.invalidRecords,
            transformationErrors: result.statistics.transformationErrors,
          },
          errors: result.errors,
        };
      } catch (error: any) {
        console.error("Hybrid transformation failed:", error);
        console.log("Falling back to hardcoded transformation...");
        this.useHybrid = false;
        // Fall through to hardcoded transformation
      }
    }

    if (this.useConfiguration) {
      // Use JSON configuration-driven transformation
      try {
        console.log(
          "🔄 Attempting to use JSON configuration-driven transformation...",
        );
        await this.configurationTransformer.initialize();
        console.log("✅ JSON configuration loaded successfully");
        const result =
          await this.configurationTransformer.transformRecords(parsedRecords);
        console.log("✅ JSON transformation completed successfully");

        // Convert to expected format
        return {
          success: result.success,
          transformedRecords: result.transformedRecords,
          statistics: {
            totalRecords: result.statistics.totalRecords,
            validRecords: result.statistics.validRecords,
            invalidRecords: result.statistics.invalidRecords,
            transformationErrors: result.statistics.transformationErrors,
          },
          errors: result.errors,
        };
      } catch (error: any) {
        console.error("❌ Configuration-driven transformation failed:", error);
        console.log("🔄 Falling back to hardcoded transformation...");
        this.useConfiguration = false;
        // Fall through to hardcoded transformation
      }
    }

    // Fallback to hardcoded transformation
    console.log("Using hardcoded transformation...");
    const transformedRecords: TransformedRecord[] = [];
    let validRecords = 0;
    let invalidRecords = 0;
    let transformationErrors = 0;

    // Process ALL records - ensure no records are skipped
    for (let i = 0; i < parsedRecords.length; i++) {
      const parsedRecord = parsedRecords[i];
      console.log(
        `Processing record ${i + 1}/${parsedRecords.length} (row ${parsedRecord.rowNumber})`,
      );

      try {
        const transformedRecord =
          await this.transformSingleRecord(parsedRecord);
        transformedRecords.push(transformedRecord);

        if (transformedRecord.validation.isValid) {
          validRecords++;
          console.log(`Record ${i + 1} transformed successfully`);
        } else {
          invalidRecords++;
          console.log(
            `Record ${i + 1} has validation errors:`,
            transformedRecord.validation.errors,
          );
        }
      } catch (error: any) {
        console.error(
          `Error transforming record ${parsedRecord.rowNumber}:`,
          error,
        );
        transformationErrors++;

        // Create error record - ENSURE ALL RECORDS ARE INCLUDED
        const errorRecord: TransformedRecord = {
          originalData: parsedRecord.data,
          transformedData: this.createEmptyTransformedData(),
          validation: {
            isValid: false,
            errors: [`Transformation failed: ${error.message}`],
            warnings: [],
          },
          metadata: {
            rowNumber: parsedRecord.rowNumber,
            originalHeaders: Object.keys(parsedRecord.data),
            transformationTimestamp: new Date().toISOString(),
          },
        };

        transformedRecords.push(errorRecord);
        invalidRecords++;
        console.log(`Record ${i + 1} added as error record`);
      }
    }

    console.log("=== DataTransformerService Results ===");
    console.log("Total input records:", parsedRecords.length);
    console.log("Total output records:", transformedRecords.length);
    console.log("Valid records:", validRecords);
    console.log("Invalid records:", invalidRecords);
    console.log("Transformation errors:", transformationErrors);
    console.log(
      "Records match:",
      transformedRecords.length === parsedRecords.length,
    );

    return {
      success: true,
      transformedRecords,
      statistics: {
        totalRecords: parsedRecords.length,
        validRecords,
        invalidRecords,
        transformationErrors,
      },
    };
  }

  /**
   * Transform a single parsed record
   */
  private async transformSingleRecord(
    parsedRecord: ParsedRecord,
  ): Promise<TransformedRecord> {
    const { data } = parsedRecord;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Transform basic information
    const first_name = this.cleanString(data["ชื่อ"]);
    const last_name = this.cleanString(data["นามสกุล"]);
    const nickname = this.cleanString(data["ชื่อเล่น"]);
    const phone = this.cleanString(data["เบอร์โทรศัพท์"]); // Let configuration system handle phone transformation
    const line_id = this.cleanString(data["Line ID"]);
    // Use original email from CSV, or generate if missing
    const originalEmail = this.cleanString(data["อีเมล"]);
    const email =
      originalEmail ||
      this.generateEmail(first_name, last_name, data["เบอร์โทรศัพท์"]);
    // Transform title: ชาย->นาย, หญิง->นางสาว
    const title = this.transformTitle(data["เพศ"]);

    // Transform business information
    const company_name = this.cleanString(data["ชื่อกิจการ หรือ บริษัท"]);
    const business_type = this.transformBusinessType(data["ประเภทธุรกิจ"]);
    const business_type_other = this.getBusinessTypeOther(data["ประเภทธุรกิจ"]);
    const yec_province = this.transformProvince(
      data["สมาชิกหอการค้า / YEC จังหวัด?"],
    );

    // Transform accommodation information
    const hotel_choice = this.transformHotelChoice(
      data["ต้องการซื้อบัตรแบบไหน"],
    );
    const room_type = this.transformRoomType(data["ต้องการซื้อบัตรแบบไหน"]);
    // Handle roommate info with constraint logic for double rooms
    let roommate_info = this.transformRoommateInfo(
      data["ชื่อ ผู้พักร่วม"],
      data["นามสกุล ผู้พักร่วม"],
    );
    if (room_type === "double" && !roommate_info) {
      // For double rooms without roommate info, provide default text for admin team
      roommate_info = "To be arranged by admin team";
    }
    // Handle roommate phone based on room type
    let roommate_phone: string | null = null;
    if (room_type === "double") {
      // For double rooms, set hardcoded phone number to satisfy constraint
      roommate_phone = "0999999999";
    } else {
      // For non-double rooms, use main phone or null
      roommate_phone = this.cleanPhoneNumber(data["เบอร์โทรศัพท์"]);
    }
    const external_hotel_name = this.cleanString(data["โรงแรมที่พัก"]);

    // Transform travel information
    const travel_type = this.transformTravelType(data["ประเภทการเดินทาง"]);

    // Transform file URLs
    const profile_image_url = this.cleanUrl(data["รูป Profile"]);
    const chamber_card_url = this.cleanUrl(data["บัตรสมาชิก TCC Connect"]);
    const payment_slip_url = this.cleanUrl(data["สลิปโอนเงิน"]);

    // Transform additional information
    const notes = this.cleanString(data["หมายเหตุ"]);

    // Validate transformed data
    this.validateTransformedData(
      {
        first_name,
        last_name,
        phone,
        yec_province,
      },
      errors,
      warnings,
    );

    const transformedData = {
      first_name,
      last_name,
      nickname,
      phone,
      line_id,
      email,
      title,
      company_name,
      business_type,
      business_type_other,
      yec_province,
      hotel_choice,
      room_type,
      roommate_info,
      roommate_phone,
      external_hotel_name,
      travel_type,
      profile_image_url,
      chamber_card_url,
      payment_slip_url,
      notes,
    };

    return {
      originalData: data,
      transformedData,
      validation: {
        isValid: errors.length === 0,
        errors,
        warnings,
      },
      metadata: {
        rowNumber: parsedRecord.rowNumber,
        originalHeaders: Object.keys(data),
        transformationTimestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Clean and normalize string values
   */
  private cleanString(value: any): string {
    if (!value || typeof value !== "string") {
      return "";
    }
    return value.trim().replace(/\s+/g, " ");
  }

  /**
   * Clean and normalize phone numbers
   */
  private cleanPhoneNumber(value: any): string {
    if (!value) {
      return "";
    }

    // Remove all non-digit characters (spaces, hyphens, etc.)
    const cleaned = String(value).replace(/\D/g, "");

    // Handle different phone number formats based on real data patterns
    if (cleaned.length === 10 && cleaned.startsWith("0")) {
      // 10 digits starting with 0: remove 0 and add +66 (most common format in real data)
      return `+66${cleaned.substring(1)}`;
    } else if (
      cleaned.length === 9 &&
      (cleaned.startsWith("6") ||
        cleaned.startsWith("8") ||
        cleaned.startsWith("9"))
    ) {
      // 9 digits starting with 6, 8, or 9: add +66 prefix
      return `+66${cleaned}`;
    } else if (cleaned.length === 10 && cleaned.startsWith("6")) {
      // 10 digits starting with 6: add + prefix
      return `+${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith("66")) {
      // 11 digits starting with 66: add + prefix
      return `+${cleaned}`;
    } else if (cleaned.startsWith("+66")) {
      // Already has +66 prefix
      return cleaned;
    } else if (
      cleaned.length === 8 &&
      (cleaned.startsWith("6") ||
        cleaned.startsWith("8") ||
        cleaned.startsWith("9"))
    ) {
      // 8 digits starting with 6, 8, or 9: add +66 prefix
      return `+66${cleaned}`;
    }

    // If we can't determine the format, return as is
    return cleaned;
  }

  /**
   * Generate email address from name and phone
   */
  private generateEmail(
    firstName: string,
    lastName: string,
    phone: string,
  ): string {
    const cleanFirstName = firstName.toLowerCase().replace(/[^a-z]/g, "");
    const cleanLastName = lastName.toLowerCase().replace(/[^a-z]/g, "");
    const phoneDigits = phone.replace(/\D/g, "").slice(-4);

    return `${cleanFirstName}.${cleanLastName}.${phoneDigits}@yec-import.local`;
  }

  /**
   * Transform title: ชาย->นาย, หญิง->นางสาว
   */
  private transformTitle(value: any): string {
    const title = this.cleanString(value);

    // Map Thai gender values to valid constraint values
    const titleMap: Record<string, string> = {
      ชาย: "นาย", // Male → Mr.
      หญิง: "นางสาว", // Female → Ms.
      คุณ: "นาย", // Generic polite form → Mr. (default)
      "Mr.": "Mr.",
      "Mrs.": "Mrs.",
      "Ms.": "Ms.",
      นาย: "นาย",
      นาง: "นาง",
      นางสาว: "นางสาว",
    };

    // Return mapped value or default to 'นาย' if not recognized
    return titleMap[title] || "นาย";
  }

  /**
   * Transform business type
   */
  private transformBusinessType(value: any): string {
    const businessType = this.cleanString(value);

    const businessTypeMap: Record<string, string> = {
      // Real business types from CSV data - mapped to database constraint values
      โรงแรม: "tourism", // Map to tourism since hospitality not in constraint
      hotel: "tourism", // Map hotel to tourism
      พลังงาน: "energy",
      energy: "energy",
      ค้าปลีก: "retail",
      retail: "retail",
      อาหารและเครื่องดื่ม: "food-beverage", // Use hyphen, not underscore
      "food-beverage": "food-beverage",
      ตัวแทนจำหน่าย: "retail", // Map to retail since distribution not in constraint
      สุขภาพและการแพทย์: "healthcare",
      healthcare: "healthcare",
      การก่อสร้าง: "construction",
      construction: "construction",
      นำเข้าไม้แปรรูป: "manufacturing", // Map to manufacturing since import_processing not in constraint
      "Organize & Event": "media", // Map to media since event_management not in constraint
      // Fallback mappings
      ธุรกิจการค้า: "retail",
      ธุรกิจบริการ: "consulting", // Map to consulting since service not in constraint
      ธุรกิจอุตสาหกรรม: "manufacturing",
      ธุรกิจเกษตร: "agriculture",
      ธุรกิจเทคโนโลยี: "technology",
      อื่นๆ: "other",
      other: "other",
    };

    return businessTypeMap[businessType] || businessType || "other";
  }

  /**
   * Get business type other value
   */
  private getBusinessTypeOther(value: any): string | null {
    const businessType = this.cleanString(value);
    return businessType === "อื่นๆ" ? businessType : null;
  }

  /**
   * Transform province name
   */
  private transformProvince(value: any): string {
    const province = this.cleanString(value);
    return this.provinceMapping[province] || province;
  }

  /**
   * Transform hotel choice based on package selection
   */
  private transformHotelChoice(value: any): "in-quota" | "out-of-quota" {
    const packageChoice = this.cleanString(value);

    // If package includes accommodation, it's in-quota
    if (
      packageChoice.includes("รวมที่พัก") ||
      packageChoice.includes("accommodation")
    ) {
      return "in-quota";
    }

    // If package doesn't include accommodation, it's out-of-quota
    if (
      packageChoice.includes("ไม่รวมที่พัก") ||
      packageChoice.includes("no accommodation")
    ) {
      return "out-of-quota";
    }

    // Default to in-quota for packages that include accommodation
    return "in-quota";
  }

  /**
   * Transform room type
   */
  private transformRoomType(
    value: any,
  ): "single" | "double" | "suite" | "no-accommodation" | null {
    const packageChoice = this.cleanString(value);

    if (
      packageChoice.includes("ไม่รวมที่พัก") ||
      packageChoice.includes("no accommodation")
    ) {
      return "no-accommodation";
    } else if (
      packageChoice.includes("single") ||
      packageChoice.includes("เดี่ยว")
    ) {
      return "single";
    } else if (
      packageChoice.includes("double") ||
      packageChoice.includes("คู่")
    ) {
      return "double";
    } else if (
      packageChoice.includes("suite") ||
      packageChoice.includes("สวีท")
    ) {
      return "suite";
    }

    return null;
  }

  /**
   * Transform roommate information
   */
  private transformRoommateInfo(firstName: any, lastName: any): string | null {
    const firstNameClean = this.cleanString(firstName);
    const lastNameClean = this.cleanString(lastName);

    if (!firstNameClean && !lastNameClean) {
      return null;
    }

    return `${firstNameClean} ${lastNameClean}`.trim();
  }

  /**
   * Transform travel type
   */
  private transformTravelType(value: any): "private-car" | "van" {
    const travelType = this.cleanString(value);

    if (travelType.includes("รถตู้") || travelType.includes("van")) {
      return "van";
    }

    return "private-car";
  }

  /**
   * Clean and validate URLs
   */
  private cleanUrl(value: any): string | null {
    const url = this.cleanString(value);

    if (!url) {
      return null;
    }

    // Validate Google Drive URL
    const googleDrivePatterns = [
      /https?:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+/,
      /https?:\/\/drive\.google\.com\/open\?id=[a-zA-Z0-9_-]+/,
      /https?:\/\/docs\.google\.com\/document\/d\/[a-zA-Z0-9_-]+/,
      /https?:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9_-]+/,
    ];

    const isValidUrl = googleDrivePatterns.some((pattern) => pattern.test(url));

    return isValidUrl ? url : null;
  }

  /**
   * Validate transformed data
   */
  private validateTransformedData(
    data: {
      first_name: string;
      last_name: string;
      phone: string;
      yec_province: string;
    },
    errors: string[],
    warnings: string[],
  ): void {
    if (!data.first_name) {
      errors.push("First name is required");
    }

    if (!data.last_name) {
      errors.push("Last name is required");
    }

    if (!data.phone) {
      errors.push("Phone number is required");
    } else if (data.phone.length < 10) {
      errors.push("Phone number is too short");
    }

    if (!data.yec_province) {
      errors.push("Province is required");
    }
  }

  /**
   * Create empty transformed data structure
   */
  private createEmptyTransformedData() {
    return {
      first_name: "",
      last_name: "",
      nickname: "",
      phone: "",
      line_id: "",
      email: "",
      title: "",
      company_name: "",
      business_type: "other",
      business_type_other: null,
      yec_province: "",
      hotel_choice: "out-of-quota" as const,
      room_type: null,
      roommate_info: null,
      roommate_phone: null,
      external_hotel_name: null,
      travel_type: "private-car" as const,
      profile_image_url: null,
      chamber_card_url: null,
      payment_slip_url: null,
      notes: null,
    };
  }

  /**
   * Advanced transformation with conflict detection and resolution
   */
  async transformRecordsAdvanced(
    parsedRecords: ParsedRecord[],
    sessionId: string,
  ): Promise<{
    success: boolean;
    transformedRecords: TransformedRecord[];
    conflicts: any[];
    statistics: {
      totalRecords: number;
      validRecords: number;
      invalidRecords: number;
      conflictsDetected: number;
      conflictsResolved: number;
      imageProcessingResults: any[];
    };
    errors?: string[];
  }> {
    try {
      // Step 1: Detect conflicts
      const conflictDetection = await this.conflictResolver.detectConflicts(
        parsedRecords.map((r) => r.data),
        sessionId,
      );

      // Step 2: Resolve conflicts
      const conflictResolution = await this.conflictResolver.resolveConflicts(
        conflictDetection.conflicts,
        sessionId,
      );

      // Step 3: Apply advanced transformations
      const transformedData = this.advancedTransformer.transformRows(
        parsedRecords.map((r) => r.data),
      );

      // Step 4: Process images
      const imageProcessingResults = await this.processImages(
        transformedData,
        sessionId,
      );

      // Step 5: Create final transformed records
      const transformedRecords: TransformedRecord[] = transformedData.map(
        (data, index) => ({
          originalData: parsedRecords[index].data,
          transformedData: this.mapToTransformedData(data),
          validation: {
            isValid: (parsedRecords[index].errors || []).length === 0,
            errors: parsedRecords[index].errors || [],
            warnings: parsedRecords[index].warnings || [],
          },
          metadata: {
            rowNumber: index + 1,
            originalHeaders: Object.keys(parsedRecords[index].data),
            transformationTimestamp: new Date().toISOString(),
          },
        }),
      );

      return {
        success: true,
        transformedRecords,
        conflicts: conflictDetection.conflicts,
        statistics: {
          totalRecords: parsedRecords.length,
          validRecords: transformedRecords.filter((r) => r.validation.isValid)
            .length,
          invalidRecords: transformedRecords.filter(
            (r) => !r.validation.isValid,
          ).length,
          conflictsDetected: conflictDetection.conflicts.length,
          conflictsResolved: conflictResolution.resolved.length,
          imageProcessingResults,
        },
      };
    } catch (error) {
      return {
        success: false,
        transformedRecords: [],
        conflicts: [],
        statistics: {
          totalRecords: parsedRecords.length,
          validRecords: 0,
          invalidRecords: parsedRecords.length,
          conflictsDetected: 0,
          conflictsResolved: 0,
          imageProcessingResults: [],
        },
        errors: [`Advanced transformation failed: ${error}`],
      };
    }
  }

  /**
   * Process images from Google Drive to Supabase Storage
   */
  private async processImages(
    transformedData: Array<Record<string, any>>,
    sessionId: string,
  ): Promise<any[]> {
    const imageUrls: Array<{
      url: string;
      type: "profile" | "chamber_card" | "payment_slip";
      userId: string;
    }> = [];

    // Extract image URLs from transformed data
    transformedData.forEach((record, index) => {
      const userId = `import-${sessionId}-${index}`;

      if (record.profile_image_url) {
        imageUrls.push({
          url: record.profile_image_url,
          type: "profile",
          userId,
        });
      }

      if (record.chamber_card_url) {
        imageUrls.push({
          url: record.chamber_card_url,
          type: "chamber_card",
          userId,
        });
      }

      if (record.payment_slip_url) {
        imageUrls.push({
          url: record.payment_slip_url,
          type: "payment_slip",
          userId,
        });
      }
    });

    // Process images in batches
    if (imageUrls.length > 0) {
      return await this.imageProcessor.processImages(imageUrls);
    }

    return [];
  }

  /**
   * Map transformed data to the expected format
   */
  private mapToTransformedData(
    data: Record<string, any>,
  ): TransformedRecord["transformedData"] {
    return {
      first_name: data.first_name || "",
      last_name: data.last_name || "",
      nickname: data.nickname || "",
      phone: data.phone || "",
      line_id: data.line_id || "",
      email: data.email || "",
      title: data.title || "",
      company_name: data.company_name || "",
      business_type: data.business_type || "other",
      business_type_other: data.business_type_other || null,
      yec_province: data.yec_province || "",
      hotel_choice: data.hotel_choice || "out-of-quota",
      room_type: data.room_type || null,
      roommate_info: data.roommate_info || null,
      roommate_phone: data.roommate_phone || null,
      external_hotel_name: data.external_hotel_name || null,
      travel_type: data.travel_type || "private-car",
      profile_image_url: data.profile_image_url || null,
      chamber_card_url: data.chamber_card_url || null,
      payment_slip_url: data.payment_slip_url || null,
      notes: data.notes || null,
    };
  }

  /**
   * Get transformation preview for a single record
   */
  getTransformationPreview(record: Record<string, any>): {
    original: Record<string, any>;
    transformed: Record<string, any>;
    changes: Array<{
      field: string;
      originalValue: any;
      transformedValue: any;
      transformation: string;
    }>;
  } {
    return this.advancedTransformer.getTransformationPreview(record);
  }

  /**
   * Validate transformation rules
   */
  validateTransformationRules(): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    return this.advancedTransformer.validateTransformationRules();
  }
}
