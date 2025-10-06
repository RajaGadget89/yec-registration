import { getSupabaseServiceClient } from "@/lib/supabase-server";
import {
  CustomFunctionRegistry,
  CustomFunctionParams,
} from "./customFunctionRegistry";

export interface TransformationConfig {
  version: string;
  exportedAt: string;
  sessionId: string;
  mappings: Array<{
    required: boolean;
    csvColumn: string;
    systemField: string;
  }>;
  transformations: Record<
    string,
    {
      type: string;
      config: any;
    }
  >;
  sourceInfo: any;
}

export interface TransformationResult {
  success: boolean;
  transformedData: Record<string, any>;
  errors: string[];
  warnings: string[];
}

export class JsonConfigurationTransformer {
  private config: TransformationConfig | null = null;
  private storageBucket: string;
  private storageKey: string;
  private customFunctionRegistry: CustomFunctionRegistry;

  constructor(storageKey?: string, storageBucket?: string) {
    this.storageBucket =
      storageBucket ||
      process.env.SUPABASE_STORAGE_CONFIG_BUCKET ||
      "import-mappings";
    this.storageKey =
      storageKey || process.env.SUPABASE_STORAGE_CONFIG_KEY || "default.json";
    this.customFunctionRegistry = new CustomFunctionRegistry();
  }

  /**
   * Load configuration from Supabase Storage (single source of truth)
   */
  async loadConfiguration(): Promise<void> {
    try {
      const supabase = getSupabaseServiceClient();
      const { data, error } = await supabase.storage
        .from(this.storageBucket)
        .download(this.storageKey);
      if (error) {
        throw new Error(`Supabase Storage download failed: ${error.message}`);
      }
      const text = await data.text();
      if (!text) {
        throw new Error("Empty configuration file downloaded from storage");
      }
      this.config = JSON.parse(text);
      console.log(
        `✅ JSON configuration loaded from Supabase Storage: ${this.storageBucket}/${this.storageKey}`,
      );
    } catch (error: any) {
      console.error(
        "❌ Failed to load JSON configuration from storage:",
        error.message,
      );
      throw new Error(`Configuration loading failed: ${error.message}`);
    }
  }

  /**
   * Transform a single row using JSON configuration
   */
  transformRow(row: Record<string, any>): TransformationResult {
    if (!this.config) {
      throw new Error(
        "Configuration not loaded. Call loadConfiguration() first.",
      );
    }

    const transformedData: Record<string, any> = {};
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Apply field mappings first (skip ignored and empty targets)
      this.config.mappings.forEach((mapping) => {
        const target = (mapping as any).systemField;
        if (!target || target === "__ignore__") {
          return; // do not map ignored columns
        }
        const csvValue = row[mapping.csvColumn];
        if (csvValue !== undefined) {
          transformedData[target] = csvValue;
          if (
            target === "business_type" ||
            target === "chamber_card_url" ||
            target === "payment_slip_url" ||
            target === "profile_image_url"
          ) {
            console.log(
              `[Field Mapping] CSV Column: "${mapping.csvColumn}" → System Field: "${target}" = "${csvValue?.substring(0, 80)}..."`,
            );
          }
        } else if (mapping.required) {
          if (
            target === "chamber_card_url" ||
            target === "payment_slip_url" ||
            target === "profile_image_url"
          ) {
            console.log(
              `[Field Mapping] ⚠️ CSV Column: "${mapping.csvColumn}" not found in row for "${target}"`,
            );
            console.log(
              `[Field Mapping] Available columns:`,
              Object.keys(row).slice(0, 10),
            );
          }
          errors.push(`Required field '${mapping.csvColumn}' is missing`);
        }
      });

      // Apply transformations
      Object.entries(this.config.transformations).forEach(
        ([fieldName, transformation]) => {
          try {
            if (fieldName === "business_type") {
              console.log(
                `[Transformation] Field: "${fieldName}", Type: "${transformation.type}"`,
              );
              console.log(
                `[Transformation] Value before: "${transformedData[fieldName]}"`,
              );
            }
            const result = this.applyTransformation(
              fieldName,
              transformation,
              row,
              transformedData,
            );
            if (result !== undefined) {
              transformedData[fieldName] = result;
              if (fieldName === "business_type") {
                console.log(
                  `[Transformation] Value after: "${transformedData[fieldName]}"`,
                );
              }
            }
          } catch (error: any) {
            errors.push(
              `Transformation failed for field '${fieldName}': ${error.message}`,
            );
          }
        },
      );

      return {
        success: errors.length === 0,
        transformedData,
        errors,
        warnings,
      };
    } catch (error: any) {
      return {
        success: false,
        transformedData: {},
        errors: [`Transformation failed: ${error.message}`],
        warnings: [],
      };
    }
  }

  /**
   * Apply a single transformation rule
   */
  private applyTransformation(
    fieldName: string,
    transformation: any,
    row: Record<string, any>,
    transformedData: Record<string, any>,
  ): any {
    const { type, config } = transformation;

    switch (type) {
      case "pass_through": {
        const src = (transformation as any)?.config?.sourceField;
        if (src) {
          const fromTransformed = transformedData[src];
          if (fromTransformed !== undefined)
            return this.passThrough(fromTransformed);
          const fromRow = row[src];
          if (fromRow !== undefined) return this.passThrough(fromRow);
        }
        return this.passThrough(transformedData[fieldName]);
      }

      case "phone_clean":
        return this.cleanPhone(transformedData[fieldName], config);

      case "phone_format":
        return this.formatPhone(transformedData[fieldName], config);

      case "email_generate":
        return this.generateEmail(transformedData[fieldName], row, config);

      case "title_transform":
        return this.transformTitle(transformedData[fieldName], config);

      case "enum_transform":
        return this.enumTransform(transformedData[fieldName], config);

      case "conditional_transform":
        return this.conditionalTransform(
          transformedData[fieldName],
          row,
          config,
          transformedData,
        );

      case "date_parse":
        return this.parseDate(transformedData[fieldName], config);

      case "hardcode":
        return this.hardcode(config);

      case "travel_type_map":
        return this.mapTravelType(transformedData[fieldName], config);

      case "package_parse":
        return this.parsePackage(transformedData[fieldName], config);

      case "hotel_detection":
        return this.detectHotel(transformedData[fieldName], config);

      case "roommate_merge":
        return this.mergeRoommate(row, config);

      case "url_validate":
        return this.validateUrl(transformedData[fieldName], config);

      case "hotel_name_filter":
        return this.filterHotelName(transformedData[fieldName], config);

      case "custom_function":
        return this.executeCustomFunction(
          fieldName,
          transformation,
          row,
          transformedData,
        );

      default:
        console.warn(`Unknown transformation type: ${type}`);
        return transformedData[fieldName];
    }
  }

  // Transformation implementations
  private passThrough(value: any): any {
    return value;
  }

  private cleanPhone(value: any, config: any): string {
    if (!value) return "";

    let cleaned = String(value).replace(/\D/g, "");

    if (config.addCountryCode && !cleaned.startsWith("66")) {
      cleaned = config.addCountryCode + cleaned;
    }

    if (config.removeLeadingZero && cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1);
    }

    return cleaned;
  }

  private formatPhone(value: any, config: any): string {
    if (!value) return "";

    const cleaned = String(value).replace(/\D/g, "");

    // Apply phone formatting patterns
    for (const pattern of config.patterns) {
      if (this.matchesPhonePattern(cleaned, pattern.condition)) {
        return this.applyPhoneTransform(cleaned, pattern.transform);
      }
    }

    return config.fallback?.toValue === "original" ? value : cleaned;
  }

  private matchesPhonePattern(cleaned: string, condition: string): boolean {
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

  private applyPhoneTransform(cleaned: string, transform: string): string {
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

  private generateEmail(
    value: any,
    row: Record<string, any>,
    config: any,
  ): string {
    // If email already exists, return it
    if (value && value.trim()) {
      return value;
    }

    // Generate email from name and phone
    const firstName = this.cleanString(
      row[config.generateFrom.firstName] || "",
    );
    const lastName = this.cleanString(row[config.generateFrom.lastName] || "");
    const phone = this.cleanString(row[config.generateFrom.phone] || "");

    if (!firstName || !lastName || !phone) {
      return "";
    }

    const cleanFirstName = config.cleanNames
      ? firstName.toLowerCase().replace(/[^a-z]/g, "")
      : firstName;
    const cleanLastName = config.cleanNames
      ? lastName.toLowerCase().replace(/[^a-z]/g, "")
      : lastName;
    const phoneDigits = phone.replace(/\D/g, "").slice(-config.phoneDigits);

    return config.format
      .replace("{firstName}", cleanFirstName)
      .replace("{lastName}", cleanLastName)
      .replace("{phoneLast4}", phoneDigits);
  }

  private transformTitle(value: any, config: any): string {
    const title = this.cleanString(value);
    return config.mappings[title] || config.fallback?.toValue || title;
  }

  private enumTransform(value: any, config: any): any {
    const normalized = this.normalizeValue(value, config.normalize);

    console.log(`[enumTransform] Input value: "${value}"`);
    console.log(`[enumTransform] Normalized value: "${normalized}"`);
    console.log(
      `[enumTransform] Config mappings:`,
      Object.keys(config?.mappings || {}),
    );

    // Respect explicit mapping even if the value is empty string or falsey
    if (
      config &&
      config.mappings &&
      Object.prototype.hasOwnProperty.call(config.mappings, normalized)
    ) {
      const result = config.mappings[normalized];
      console.log(`[enumTransform] ✅ Mapped "${normalized}" → "${result}"`);
      return result;
    }

    const fallback =
      config && config.fallback && config.fallback.toValue !== undefined
        ? config.fallback.toValue
        : normalized;
    console.log(
      `[enumTransform] ⚠️ No mapping found, using fallback: "${fallback}"`,
    );
    return fallback;
  }

  private conditionalTransform(
    value: any,
    row: Record<string, any>,
    config: any,
    transformedData?: Record<string, any>,
  ): any {
    // Check condition
    if (this.evaluateCondition(config.condition, row)) {
      return this.applyTransform(config.transform, value, row, transformedData);
    }
    return config.fallback?.toValue;
  }

  private parseDate(value: any, config: any): string {
    if (!value) {
      return config.fallback?.toValue === "current_timestamp"
        ? new Date().toISOString()
        : "";
    }

    const text = String(value).trim();

    // Support explicit formats (minimal implementation for our import needs)
    const format: string = (config && config.format) || "";
    const tz: string = (config && config.timezone) || "local";

    let date: Date | null = null;

    // dd/MM/yyyy HH:mm:ss
    if (
      /^d{0,2}d\/Md{0,2}M\/yyyy/.test(format) ||
      format === "dd/MM/yyyy HH:mm:ss"
    ) {
      const m = text.match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/,
      );
      if (m) {
        const [, d, M, y, hh, mm, ss] = m;
        const year = parseInt(y, 10);
        const month = parseInt(M, 10) - 1; // 0-based
        const day = parseInt(d, 10);
        const hour = parseInt(hh, 10);
        const minute = parseInt(mm, 10);
        const second = parseInt(ss, 10);
        if (tz.toUpperCase() === "UTC") {
          date = new Date(Date.UTC(year, month, day, hour, minute, second));
        } else {
          date = new Date(year, month, day, hour, minute, second);
        }
      }
    }

    // Fallback: native Date parsing
    if (!date) {
      const n = new Date(text);
      if (!isNaN(n.getTime())) date = n;
    }

    if (!date || isNaN(date.getTime())) {
      return config.fallback?.toValue === "current_timestamp"
        ? new Date().toISOString()
        : "";
    }
    return date.toISOString();
  }

  private hardcode(config: any): any {
    return config.value;
  }

  private mapTravelType(value: any, config: any): string {
    const normalized = this.cleanString(value);
    return config.mappings[normalized] || normalized;
  }

  private parsePackage(value: any, config: any): any {
    const packageText = this.cleanString(value);

    for (const rule of config.rules) {
      if (this.evaluatePackageCondition(packageText, rule.condition)) {
        return rule.result;
      }
    }

    return config.fallback?.toValue;
  }

  private detectHotel(value: any, config: any): any {
    const hotelName = this.cleanString(value);

    if (!hotelName) {
      return null;
    }

    // Check ignore patterns
    for (const pattern of config.ignorePatterns) {
      if (hotelName.includes(pattern)) {
        return null;
      }
    }

    // Valid hotel detected
    return {
      hotel_choice: config.resultMapping.hotel_choice,
      external_hotel_name: hotelName,
    };
  }

  private mergeRoommate(row: Record<string, any>, config: any): string | null {
    // Try sources in priority order
    for (const source of config.sources) {
      if (source.field) {
        const value = this.cleanString(row[source.field]);
        if (value) return value;
      } else if (source.fields) {
        const values = source.fields
          .map((field: string) => this.cleanString(row[field]))
          .filter(Boolean);
        if (values.length > 0) {
          return values.join(" ");
        }
      }
    }

    // Check constraints
    if (config.constraints?.room_type_double) {
      const roomType = row["room_type"] || this.detectRoomType(row);
      if (roomType === "double") {
        return config.constraints.room_type_double.adminText;
      }
    }

    return config.fallback?.toValue;
  }

  private validateUrl(value: any, config: any): string | null {
    const url = this.cleanString(value);

    console.log(`[url_validate] Input value: "${value}"`);
    console.log(`[url_validate] Cleaned URL: "${url}"`);

    if (!url) {
      console.log(
        `[url_validate] Empty URL, returning fallback: ${config.fallback?.toValue}`,
      );
      return config.fallback?.toValue;
    }

    // Validate Google Drive patterns
    if (config.validateGoogleDrive) {
      const patterns = config.allowedPatterns.map((pattern: string) => {
        // Escape regex special characters in the pattern, then replace {id} placeholder
        const escapedPattern = pattern
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&") // Escape regex special chars
          .replace("\\{id\\}", "[a-zA-Z0-9_-]+"); // Replace {id} placeholder with ID pattern
        return new RegExp(escapedPattern);
      });

      const isValid = patterns.some((pattern: RegExp) => pattern.test(url));
      console.log(
        `[url_validate] Google Drive validation: ${isValid ? "✅ PASS" : "❌ FAIL"}`,
      );

      if (!isValid) {
        console.log(
          `[url_validate] Invalid URL, returning fallback: ${config.fallback?.toValue}`,
        );
        return config.fallback?.toValue;
      }
    }

    console.log(`[url_validate] Returning valid URL: "${url}"`);
    return url;
  }

  private filterHotelName(value: any, config: any): string | null {
    const hotelName = this.cleanString(value);

    if (!hotelName) {
      return config.fallback?.toValue;
    }

    // Check placeholders
    for (const placeholder of config.placeholdersToNull) {
      if (hotelName.includes(placeholder)) {
        return null;
      }
    }

    return hotelName;
  }

  // Helper methods
  private cleanString(value: any): string {
    if (!value || typeof value !== "string") {
      return "";
    }
    return value.trim().replace(/\s+/g, " ");
  }

  private normalizeValue(value: any, normalize: any): string {
    let normalized = this.cleanString(value);

    if (normalize?.trim) {
      normalized = normalized.trim();
    }

    if (normalize?.collapseSpaces) {
      normalized = normalized.replace(/\s+/g, " ");
    }

    return normalized;
  }

  private evaluateCondition(condition: any, row: Record<string, any>): boolean {
    if (!condition) return true;

    if (condition.field && condition.equals !== undefined) {
      return row[condition.field] === condition.equals;
    }

    if (condition.field && condition.isEmpty !== undefined) {
      const value = row[condition.field];
      return condition.isEmpty
        ? !value || value.trim() === ""
        : value && value.trim() !== "";
    }

    return true;
  }

  private applyTransform(
    transform: any,
    value: any,
    row: Record<string, any>,
    transformedData?: Record<string, any>,
  ): any {
    if (transform.type === "null_fallback") {
      if (!value || value.trim() === "") {
        return transform.fallbackValue;
      }
      return transform.preserveOriginal ? value : transform.fallbackValue;
    }

    if (transform.type === "hardcode") {
      return transform.value;
    }

    if (transform.type === "copy_from") {
      const sourceField = transform.field;
      if (
        transformedData &&
        sourceField &&
        transformedData[sourceField] !== undefined
      ) {
        return transformedData[sourceField];
      }
      if (sourceField && row[sourceField] !== undefined) {
        return row[sourceField];
      }
      return value;
    }

    return value;
  }

  private evaluatePackageCondition(
    packageText: string,
    condition: string,
  ): boolean {
    switch (condition) {
      case "contains_2699_or_2699":
        return packageText.includes("2,699") || packageText.includes("2699");
      case "contains_1999_and_double":
        return (
          (packageText.includes("1,999") || packageText.includes("1999")) &&
          (packageText.includes("พักคู่") || packageText.includes("คู่"))
        );
      case "contains_1199":
        return packageText.includes("1,199") || packageText.includes("1199");
      default:
        return false;
    }
  }

  private detectRoomType(row: Record<string, any>): string | null {
    const packageText = row["ต้องการซื้อบัตรแบบไหน"] || "";
    if (packageText.includes("พักคู่") || packageText.includes("คู่")) {
      return "double";
    }
    if (packageText.includes("พักเดี่ยว") || packageText.includes("เดี่ยว")) {
      return "single";
    }
    return null;
  }

  /**
   * Execute custom function transformation
   */
  private executeCustomFunction(
    fieldName: string,
    transformation: any,
    row: Record<string, any>,
    transformedData: Record<string, any>,
  ): any {
    const { function: functionName, config } = transformation;

    if (!functionName) {
      console.warn(
        `Custom function name not specified for field: ${fieldName}`,
      );
      return transformedData[fieldName];
    }

    try {
      const params: CustomFunctionParams = {
        row,
        config: config || {},
        fieldName,
      };

      const result = this.customFunctionRegistry.execute(functionName, params);

      // If result is an object with multiple fields, merge them into transformedData
      if (result && typeof result === "object" && !Array.isArray(result)) {
        Object.entries(result).forEach(([key, value]) => {
          if (key !== fieldName) {
            transformedData[key] = value;
          }
        });
      }

      return result;
    } catch (error: any) {
      console.error(
        `❌ Custom function '${functionName}' failed for field '${fieldName}':`,
        error,
      );
      return transformedData[fieldName];
    }
  }

  /**
   * Register a custom function
   */
  registerCustomFunction(
    name: string,
    description: string,
    execute: (params: CustomFunctionParams) => any,
  ): void {
    this.customFunctionRegistry.register(name, description, execute);
  }

  /**
   * Get available custom functions
   */
  getAvailableCustomFunctions(): string[] {
    return this.customFunctionRegistry.getRegisteredFunctions();
  }
}
