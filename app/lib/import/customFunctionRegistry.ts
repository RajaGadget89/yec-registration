/**
 * Custom Function Registry for Enhanced JSON Configuration
 *
 * This registry allows complex transformation logic to be defined as custom functions
 * and called from JSON configuration, enabling single-file data transformation.
 */

export interface CustomFunctionParams {
  row: Record<string, any>;
  config: any;
  fieldName: string;
}

export interface CustomFunction {
  name: string;
  description: string;
  execute: (params: CustomFunctionParams) => any;
}

export class CustomFunctionRegistry {
  private functions: Map<string, CustomFunction> = new Map();

  constructor() {
    this.registerBuiltInFunctions();
  }

  /**
   * Register a custom function
   */
  register(
    name: string,
    description: string,
    execute: (params: CustomFunctionParams) => any,
  ): void {
    this.functions.set(name, {
      name,
      description,
      execute,
    });
    console.log(`✅ Registered custom function: ${name}`);
  }

  /**
   * Execute a custom function
   */
  execute(name: string, params: CustomFunctionParams): any {
    const func = this.functions.get(name);
    if (!func) {
      throw new Error(
        `Custom function '${name}' not found. Available functions: ${Array.from(this.functions.keys()).join(", ")}`,
      );
    }

    try {
      return func.execute(params);
    } catch (error: any) {
      console.error(`❌ Error executing custom function '${name}':`, error);
      throw new Error(
        `Custom function '${name}' execution failed: ${error.message}`,
      );
    }
  }

  /**
   * Get all registered functions
   */
  getRegisteredFunctions(): string[] {
    return Array.from(this.functions.keys());
  }

  /**
   * Check if a function is registered
   */
  hasFunction(name: string): boolean {
    return this.functions.has(name);
  }

  /**
   * Register built-in transformation functions
   */
  private registerBuiltInFunctions(): void {
    // Package parsing function
    this.register(
      "parsePackageInfo",
      "Parse ticket/hotel package information to determine hotel choice, room type, price, and package code",
      (params: CustomFunctionParams) => {
        const { row, config } = params;
        const ticketText = row[config.sourceField || "ต้องการซื้อบัตรแบบไหน"];

        if (!ticketText) {
          return {
            hotel_choice: null,
            room_type: null,
            price_applied: null,
            selected_package_code: null,
          };
        }

        const t = ticketText.replace(/\s+/g, " ");
        const contains = (s: string) => t.includes(s);

        if (contains("2,699") || contains("2699")) {
          return {
            hotel_choice: "in-quota",
            room_type: "single",
            price_applied: 2699,
            selected_package_code: "in-quota-single",
          };
        }

        if (
          (contains("1,999") || contains("1999")) &&
          (contains("พักคู่") || contains("คู่"))
        ) {
          return {
            hotel_choice: "in-quota",
            room_type: "double",
            price_applied: 1999,
            selected_package_code: "in-quota-double",
          };
        }

        if (contains("1,199") || contains("1199")) {
          return {
            hotel_choice: "out-of-quota",
            room_type: null,
            price_applied: 1199,
            selected_package_code: "no-accommodation",
          };
        }

        return {
          hotel_choice: null,
          room_type: null,
          price_applied: null,
          selected_package_code: null,
        };
      },
    );

    // Hotel detection function - ONLY for external_hotel_name field
    this.register(
      "detectHotel",
      "Detect external hotel from free text input with ignore patterns",
      (params: CustomFunctionParams) => {
        const { row, config } = params;
        const rawHotel = row[config.sourceField || "โรงแรมที่พัก"];

        if (!rawHotel) {
          return null;
        }

        const val = rawHotel.toString().trim();
        if (!val) {
          return null;
        }

        const ignorePatterns = config.ignorePatterns || [
          "ยังไม่ทราบ",
          "ไม่พัก",
          "ไม่นอน",
          "none",
          "บ้านเพื่อน",
          "ยกเลิก",
          "ไม่เอาที่พัก",
        ];

        if (ignorePatterns.some((pattern: string) => val.includes(pattern))) {
          return null;
        }

        // Only return the external hotel name, not hotel_choice
        // hotel_choice should be handled by the JSON enum_transform
        return val;
      },
    );

    // Roommate merging function
    this.register(
      "mergeRoommate",
      "Enhanced roommate information handling with double room validation",
      (params: CustomFunctionParams) => {
        const { row, config } = params;
        const sources = config.sources || [
          { field: "ผู้พักร่วม (TRIM)", priority: 1 },
          {
            fields: ["ชื่อ ผู้พักร่วม", "นามสกุล ผู้พักร่วม"],
            mergeStrategy: "join_with_space",
            priority: 2,
          },
        ];

        // Sort sources by priority
        const sortedSources = sources.sort(
          (a: any, b: any) => a.priority - b.priority,
        );

        let roommateInfo = null;
        for (const source of sortedSources) {
          if (source.field) {
            const value = (row[source.field] || "").toString().trim();
            if (value) {
              roommateInfo = value;
              break;
            }
          } else if (source.fields) {
            const values = source.fields
              .map((field: string) => (row[field] || "").toString().trim())
              .filter(Boolean);
            if (values.length > 0) {
              roommateInfo = values.join(" ");
              break;
            }
          }
        }

        // Enhanced double room validation
        const roomType = row["room_type"] || detectRoomType(row);
        if (roomType === "double") {
          if (!roommateInfo || roommateInfo.trim() === "") {
            const constraints = config.constraints || {};
            if (
              constraints.room_type_double?.ifEmpty === "set_to_admin_arranged"
            ) {
              return (
                constraints.room_type_double.adminText ||
                "To be arranged by admin team"
              );
            }
          }
        }

        return roommateInfo;
      },
    );

    // Travel type mapping function
    this.register(
      "mapTravelType",
      "Map travel type using fuzzy string matching",
      (params: CustomFunctionParams) => {
        const { row, config } = params;
        const raw = row[config.sourceField || "ประเภทการเดินทาง"];

        if (!raw) return null;

        const v = raw.toString().toLowerCase();
        if (v.includes("รถตู้") || v.includes("ส่วนกลาง")) return "van";
        if (
          v.includes("ส่วนตัว") ||
          v.includes("ไปเอง") ||
          v.includes("ตัวเอง")
        )
          return "private-car";

        return null;
      },
    );

    // Business type mapping function
    this.register(
      "mapBusinessType",
      "Map business type with fallback to other and store original",
      (params: CustomFunctionParams) => {
        const { row, config } = params;
        const raw = row[config.sourceField || "ประเภทธุรกิจ"];

        if (!raw) return { mapped: false, type: "other", other: null };

        const key = raw.toString().trim();
        const mappings = config.mappings || {
          ค้าปลีก: "retail",
          อาหารและเครื่องดื่ม: "food-beverage",
          สุขภาพและการแพทย์: "healthcare",
          การเงินและการธนาคาร: "finance",
          การศึกษา: "education",
          การผลิต: "manufacturing",
          การก่อสร้าง: "construction",
          อสังหาริมทรัพย์: "real-estate",
          การท่องเที่ยว: "tourism",
          แฟชั่นและเสื้อผ้า: "fashion",
          ยานยนต์: "automotive",
          พลังงาน: "energy",
          โลจิสติกส์: "logistics",
          สื่อและบันเทิง: "media",
          ที่ปรึกษา: "consulting",
          กฎหมาย: "legal",
          การตลาด: "marketing",
          เกษตรกรรม: "agriculture",
          โรงแรม: "hotel",
          บริการ: "services",
          "อื่น ๆ": "other",
        };

        const mapped = mappings[key];
        if (mapped) {
          return { mapped: true, type: mapped, other: null };
        }

        return { mapped: false, type: "other", other: key };
      },
    );

    // Phone formatting function
    this.register(
      "formatPhone",
      "Format phone number with advanced patterns",
      (params: CustomFunctionParams) => {
        const { row, config } = params;
        const phone = row[config.sourceField || "เบอร์โทรศัพท์"];

        if (!phone) return "";

        const cleaned = String(phone).replace(/\D/g, "");
        const patterns = config.patterns || [
          { condition: "length_10_starts_0", transform: "remove_0_add_66" },
          { condition: "length_9_starts_6_8_9", transform: "add_66_prefix" },
          { condition: "length_10_starts_6", transform: "add_plus_prefix" },
          { condition: "length_11_starts_66", transform: "add_plus_prefix" },
          { condition: "starts_with_66", transform: "keep_as_is" },
          { condition: "length_8_starts_6_8_9", transform: "add_66_prefix" },
        ];

        for (const pattern of patterns) {
          if (matchesPhonePattern(cleaned, pattern.condition)) {
            return applyPhoneTransform(cleaned, pattern.transform);
          }
        }

        return config.fallback?.toValue === "original" ? phone : cleaned;
      },
    );

    // Email generation function
    // NOTE: Database email constraint only allows ASCII characters (A-Za-z0-9._%+-)
    // Thai characters are NOT supported, so we generate phone-based emails
    this.register(
      "generateEmail",
      "Generate email from phone when email is empty (ASCII-safe)",
      (params: CustomFunctionParams) => {
        const { row, config } = params;
        const existingEmail = row[config.sourceField || "อีเมล"];
        const fallbackEmail =
          config.fallback?.toValue || "import@yec-import.local";

        // Return existing email if it's valid and ASCII-safe
        if (
          existingEmail &&
          existingEmail.trim() &&
          /^[A-Za-z0-9._%+-]+@/.test(existingEmail)
        ) {
          return existingEmail;
        }

        // Get phone from configured source or default
        const phone = cleanString(
          row[config.generateFrom?.phone || "เบอร์โทรศัพท์"] || "",
        );

        if (!phone) {
          return fallbackEmail;
        }

        // Clean phone to get digits only
        const phoneDigits = phone.replace(/\D/g, "");

        if (!phoneDigits || phoneDigits.length < 4) {
          return fallbackEmail;
        }

        // Generate ASCII-safe email using phone number
        // Format: yec.{phone}@yec-import.local (e.g., yec.0946596361@yec-import.local)
        return `yec.${phoneDigits}@yec-import.local`;
      },
    );

    // Business type other extraction function
    this.register(
      "extractBusinessTypeOther",
      "Extract business_type_other value only if business type is not in known list",
      (params: CustomFunctionParams) => {
        const { row, config } = params;
        const businessTypeValue = cleanString(
          row[config.sourceField || "ประเภทธุรกิจ"] || "",
        );
        const knownTypes = config.knownTypes || [];

        // If the business type is in the known list, return null
        // This means they selected a predefined category, so no "other" text needed
        if (
          knownTypes.includes(businessTypeValue) ||
          businessTypeValue === "อื่น ๆ" ||
          businessTypeValue === ""
        ) {
          return null;
        }

        // If it's NOT in the known list, it means they entered custom text
        // Store this as business_type_other
        return businessTypeValue;
      },
    );

    // Form data generation function
    this.register(
      "generateFormData",
      "Generate form_data JSON matching traditional registration form structure",
      (params: CustomFunctionParams) => {
        const { row, config } = params;

        // Generate email using the same logic as generateEmail function
        let emailValue = row["อีเมล"] || "";
        if (
          !emailValue ||
          !emailValue.trim() ||
          !/^[A-Za-z0-9._%+-]+@/.test(emailValue)
        ) {
          // Generate ASCII-safe email from phone (try with and without trailing space)
          const phone = cleanString(
            row["เบอร์โทรศัพท์ "] || row["เบอร์โทรศัพท์"] || "",
          );
          const phoneDigits = phone.replace(/\D/g, "");
          if (phoneDigits && phoneDigits.length >= 4) {
            emailValue = `yec.${phoneDigits}@yec-import.local`;
          } else {
            // Fallback if phone is not available
            emailValue = "import@yec-import.local";
          }
        }

        // Map source CSV fields to form field names (matching traditional form structure)
        const formData: Record<string, any> = {
          email: emailValue,
          phone: row["เบอร์โทรศัพท์ "] || row["เบอร์โทรศัพท์"] || "",
          title: row["เพศ"] || "",
          lineId: row["Line ID"] || "",
          lastName: row["นามสกุล"] || "",
          nickname: row["ชื่อเล่น"] || "",
          roomType: "", // Will be determined by package
          firstName: row["ชื่อ"] || "",
          travelType: row["ประเภทการเดินทาง"] || "",
          chamberCard: row["บัตรสมาชิก TCC Connect"] || "",
          companyName: row["ชื่อกิจการ หรือ บริษัท"] || "",
          hotelChoice: "", // Will be determined by package
          paymentSlip: row["สลิปโอนเงิน"] || "",
          yecProvince: row["สมาชิกหอการค้า / YEC จังหวัด?"] || "",
          businessType: row["ประเภทธุรกิจ"] || "",
          profileImage: row["รูป Profile"] || "",
          roommateInfo: row["ผู้พักร่วม (TRIM)"] || "",
          roommatePhone: row["เบอร์โทรผู้ร่วมพัก"] || "",
          businessTypeOther: row["ประเภทธุรกิจอื่น"] || "",
          external_hotel_name: row["โรงแรมที่พัก"] || "",
        };

        return JSON.stringify(formData);
      },
    );

    // Price breakdown generation function
    this.register(
      "generatePriceBreakdown",
      "Generate price breakdown matching real system structure",
      (params: CustomFunctionParams) => {
        const { row, config } = params;

        const packageText =
          row[config.sourceField || "ต้องการซื้อบัตรแบบไหน"] || "";
        const mappings = config.mappings || {};

        // Find matching package
        let breakdown = null;
        for (const [pattern, priceData] of Object.entries(mappings)) {
          if (packageText.includes(pattern.trim())) {
            breakdown = priceData;
            break;
          }
        }

        // Fallback to default if no match found
        if (!breakdown) {
          breakdown = {
            basePrice: 1199,
            roomSurcharge: 0,
            total: 1199,
          };
        }

        return JSON.stringify(breakdown);
      },
    );

    this.register(
      "generateSelectedPackageCode",
      "Generate selected package code based on package selection and hotel choice",
      (params: CustomFunctionParams) => {
        const { row, config } = params;
        const packageText = row[config.sourceField || "ต้องการซื้อบัตรแบบไหน"];

        if (!packageText) {
          return config.fallback?.toValue || "no-accommodation";
        }

        const mappings = config.mappings || {};
        const normalizedText = packageText.trim().replace(/\s+/g, " ");

        for (const [pattern, packageCode] of Object.entries(mappings)) {
          if (normalizedText.includes(pattern.trim())) {
            return packageCode;
          }
        }

        return config.fallback?.toValue || "out-of-quota";
      },
    );

    // Preview registration id (non-persistent) generator
    this.register(
      "generateRegistrationIdPreview",
      "Generate a preview-only registration_id based on province with a deterministic sequence per batch",
      (params: CustomFunctionParams) => {
        const { row, config } = params;
        const province = (
          row[config.provinceField || "yec_province"] || ""
        ).toString();
        const map = config.prefixMap || {};
        const prefix = map[province] || "YEC-UNK";

        // Deterministic pseudo-seq using row hash to avoid duplicates in preview
        const base = JSON.stringify(row);
        let hash = 0;
        for (let i = 0; i < base.length; i++) {
          hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
        }
        const seq = (hash % 100000).toString().padStart(5, "0");
        return `${prefix}-${seq}`;
      },
    );

    this.register(
      "detectExternalHotel",
      "Detect external hotel name with special handling for no-accommodation case",
      (params: CustomFunctionParams) => {
        const { row, config } = params;
        const rawHotel = row[config.sourceField || "โรงแรมที่พัก"];
        const packageText = row["ต้องการซื้อบัตรแบบไหน"];

        // Special case: if package text indicates no accommodation, return the no-accommodation text
        if (packageText && packageText.includes("ไม่รวมที่พัก")) {
          return config.noAccommodationText || "ไม่ต้องการที่พัก";
        }

        // For empty hotel fields (not no-accommodation), always return null
        // In-quota packages should have NULL for external_hotel_name
        if (!rawHotel) {
          return null;
        }

        // Check ignore patterns
        const ignorePatterns = config.ignorePatterns || [];
        const normalizedHotel = rawHotel.trim().toLowerCase();

        for (const pattern of ignorePatterns) {
          if (normalizedHotel.includes(pattern.toLowerCase())) {
            return null;
          }
        }

        // Return the hotel name if it doesn't match ignore patterns
        const result = rawHotel.trim() || null;

        // If no result and we have a fallback, use it
        if (!result && config.fallback?.toValue) {
          return config.fallback.toValue;
        }

        return result;
      },
    );

    this.register(
      "validateRoommatePhone",
      "Validate roommate phone for double room scenarios",
      (params: CustomFunctionParams) => {
        const { row, config } = params;
        const roomType = row["room_type"] || detectRoomType(row);
        const sourceField = config.sourceField || "เบอร์โทรผู้ร่วมพัก";
        const roommatePhone = row[sourceField];

        // Only validate for double rooms
        if (roomType === "double") {
          if (!roommatePhone || roommatePhone.trim() === "") {
            // Use fallback value for double rooms without phone
            return config.fallback?.toValue || "0000000000";
          }
          return roommatePhone.trim();
        }

        // For non-double rooms, return null
        return null;
      },
    );

    console.log(
      `✅ Registered ${this.functions.size} built-in custom functions`,
    );
  }
}

// Helper functions for custom functions
function detectRoomType(row: Record<string, any>): string | null {
  const packageText = row["ต้องการซื้อบัตรแบบไหน"] || "";
  if (packageText.includes("พักคู่") || packageText.includes("คู่")) {
    return "double";
  }
  if (packageText.includes("พักเดี่ยว") || packageText.includes("เดี่ยว")) {
    return "single";
  }
  return null;
}

function cleanString(value: any): string {
  if (!value || typeof value !== "string") {
    return "";
  }
  return value.trim().replace(/\s+/g, " ");
}

function matchesPhonePattern(cleaned: string, condition: string): boolean {
  switch (condition) {
    case "length_10_starts_0":
      return cleaned.length === 10 && cleaned.startsWith("0");
    case "length_9_starts_6_8_9":
      return cleaned.length === 9 && ["6", "8", "9"].includes(cleaned[0]);
    case "length_10_starts_6":
      return cleaned.length === 10 && cleaned.startsWith("6");
    case "length_11_starts_66":
      return cleaned.length === 11 && cleaned.startsWith("66");
    case "starts_with_66":
      return cleaned.startsWith("66");
    case "starts_with_plus_66":
      return cleaned.startsWith("+66");
    case "length_8_starts_6_8_9":
      return cleaned.length === 8 && ["6", "8", "9"].includes(cleaned[0]);
    default:
      return false;
  }
}

function applyPhoneTransform(cleaned: string, transform: string): string {
  switch (transform) {
    case "remove_0_add_66":
      return `+66${cleaned.substring(1)}`;
    case "add_66_prefix":
      return `+66${cleaned}`;
    case "add_plus_prefix":
      return `+${cleaned}`;
    case "keep_as_is":
      return cleaned;
    case "add_0_prefix":
      return `0${cleaned}`;
    case "remove_66_add_0":
      return `0${cleaned.substring(2)}`;
    case "remove_plus_66_add_0":
      return `0${cleaned.substring(3)}`;
    default:
      return cleaned;
  }
}
