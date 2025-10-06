import { ConfigurationDrivenTransformer } from "./configurationDrivenTransformer";
import { AdvancedDataTransformerService } from "./advancedDataTransformerService";
import { ParsedRecord } from "./csvParserService";
import { TransformedRecord } from "./dataTransformerService";

export interface HybridTransformationResult {
  success: boolean;
  transformedRecords: TransformedRecord[];
  statistics: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    transformationErrors: number;
  };
  errors?: string[];
  metadata: {
    jsonTransformations: number;
    hardcodedTransformations: number;
    hybridMode: boolean;
  };
}

export class HybridTransformer {
  private configurationTransformer: ConfigurationDrivenTransformer;
  private advancedTransformer: AdvancedDataTransformerService;
  private useHybrid: boolean = true;

  constructor(configPath?: string) {
    this.configurationTransformer = new ConfigurationDrivenTransformer(
      configPath,
    );
    this.advancedTransformer = new AdvancedDataTransformerService();
  }

  /**
   * Set hybrid mode
   */
  setHybridMode(useHybrid: boolean): void {
    this.useHybrid = useHybrid;
    console.log(
      `Hybrid mode set to: ${useHybrid ? "Hybrid (JSON + Hardcoded)" : "JSON Only"}`,
    );
  }

  /**
   * Transform records using hybrid approach
   */
  async transformRecords(
    parsedRecords: ParsedRecord[],
  ): Promise<HybridTransformationResult> {
    console.log("=== HybridTransformer.transformRecords ===");
    console.log("Input parsed records count:", parsedRecords.length);
    console.log("Hybrid mode:", this.useHybrid);

    if (!this.useHybrid) {
      // Use JSON configuration only
      return this.transformWithJsonOnly(parsedRecords);
    }

    // Use hybrid approach: JSON + Hardcoded
    return this.transformWithHybrid(parsedRecords);
  }

  /**
   * Transform using JSON configuration only
   */
  private async transformWithJsonOnly(
    parsedRecords: ParsedRecord[],
  ): Promise<HybridTransformationResult> {
    console.log("Using JSON configuration only...");

    try {
      await this.configurationTransformer.initialize();
      const result =
        await this.configurationTransformer.transformRecords(parsedRecords);

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
        metadata: {
          jsonTransformations: result.statistics.totalRecords,
          hardcodedTransformations: 0,
          hybridMode: false,
        },
      };
    } catch (error: any) {
      console.error("JSON-only transformation failed:", error);
      throw error;
    }
  }

  /**
   * Transform using hybrid approach (JSON + Hardcoded)
   */
  private async transformWithHybrid(
    parsedRecords: ParsedRecord[],
  ): Promise<HybridTransformationResult> {
    console.log("Using hybrid approach (JSON + Hardcoded)...");

    const transformedRecords: TransformedRecord[] = [];
    let validRecords = 0;
    let invalidRecords = 0;
    let transformationErrors = 0;
    let jsonTransformations = 0;
    let hardcodedTransformations = 0;

    try {
      // Initialize JSON transformer
      await this.configurationTransformer.initialize();
      console.log("✅ JSON configuration loaded");

      // Process each record with hybrid approach
      for (let i = 0; i < parsedRecords.length; i++) {
        const parsedRecord = parsedRecords[i];
        console.log(
          `Processing record ${i + 1}/${parsedRecords.length} (row ${parsedRecord.rowNumber})`,
        );

        try {
          // Step 1: Apply JSON configuration transformations
          const jsonResults =
            await this.configurationTransformer.transformRecords([
              parsedRecord,
            ]);
          const jsonResult = jsonResults.transformedRecords[0];
          jsonTransformations++;

          if (!jsonResult.validation.isValid) {
            console.log(
              `Record ${i + 1} JSON transformation failed:`,
              jsonResult.validation.errors,
            );
            // Create error record
            const errorRecord = this.createErrorRecord(
              parsedRecord,
              `JSON transformation failed: ${jsonResult.validation.errors.join(", ")}`,
            );
            transformedRecords.push(errorRecord);
            invalidRecords++;
            continue;
          }

          // Step 2: Apply complex hardcoded transformations
          const hardcodedResult = this.applyComplexTransformations(
            parsedRecord.data,
            jsonResult.transformedData,
          );
          hardcodedTransformations++;

          // Step 3: Merge results
          const finalTransformedData = this.mergeTransformationResults(
            jsonResult.transformedData,
            hardcodedResult,
            parsedRecord.data,
          );

          // Step 4: Validate final result
          const validationErrors =
            this.validateTransformedData(finalTransformedData);

          const transformedRecord: TransformedRecord = {
            originalData: parsedRecord.data,
            transformedData: finalTransformedData,
            validation: {
              isValid: validationErrors.length === 0,
              errors: validationErrors,
              warnings: jsonResult.validation?.warnings || [],
            },
            metadata: {
              rowNumber: parsedRecord.rowNumber,
              originalHeaders: Object.keys(parsedRecord.data),
              transformationTimestamp: new Date().toISOString(),
            },
          };

          transformedRecords.push(transformedRecord);

          if (transformedRecord.validation.isValid) {
            validRecords++;
            console.log(
              `Record ${i + 1} transformed successfully (JSON + Hardcoded)`,
            );
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

          const errorRecord = this.createErrorRecord(
            parsedRecord,
            `Hybrid transformation failed: ${error.message}`,
          );
          transformedRecords.push(errorRecord);
          invalidRecords++;
        }
      }

      console.log("=== HybridTransformer Results ===");
      console.log(`Total records: ${parsedRecords.length}`);
      console.log(`Valid records: ${validRecords}`);
      console.log(`Invalid records: ${invalidRecords}`);
      console.log(`Transformation errors: ${transformationErrors}`);
      console.log(`JSON transformations: ${jsonTransformations}`);
      console.log(`Hardcoded transformations: ${hardcodedTransformations}`);

      return {
        success: transformationErrors === 0,
        transformedRecords,
        statistics: {
          totalRecords: parsedRecords.length,
          validRecords,
          invalidRecords,
          transformationErrors,
        },
        errors:
          transformationErrors > 0
            ? [`${transformationErrors} transformation errors occurred`]
            : undefined,
        metadata: {
          jsonTransformations,
          hardcodedTransformations,
          hybridMode: true,
        },
      };
    } catch (error: any) {
      console.error("Hybrid transformation failed:", error);
      throw error;
    }
  }

  /**
   * Apply complex hardcoded transformations
   */
  private applyComplexTransformations(
    originalData: Record<string, any>,
    jsonData: Record<string, any>,
  ): Record<string, any> {
    // Use the advanced transformer to apply complex logic
    const hardcodedResult = this.advancedTransformer.transformRow(originalData);

    // Extract only the complex transformations that JSON couldn't handle
    const complexFields = {
      // Package parsing (complex business logic)
      hotel_choice: hardcodedResult.hotel_choice,
      room_type: hardcodedResult.room_type,
      price_applied: hardcodedResult.price_applied,
      selected_package_code: hardcodedResult.selected_package_code,

      // Hotel detection (complex logic)
      external_hotel_name: hardcodedResult.external_hotel_name,

      // Travel type (fuzzy matching)
      travel_type: hardcodedResult.travel_type,

      // ⚠️ REMOVED: business_type and business_type_other
      // These are now handled exclusively by JSON configuration (single gateway)
      // This prevents the dual-gateway override issue

      // Roommate merging (multi-source)
      roommate_info: hardcodedResult.roommate_info,
      roommate_phone: hardcodedResult.roommate_phone,
    };

    return complexFields;
  }

  /**
   * Merge JSON and hardcoded transformation results
   */
  private mergeTransformationResults(
    jsonData: Record<string, any>,
    hardcodedData: Record<string, any>,
    originalData: Record<string, any>,
  ): TransformedRecord["transformedData"] {
    // Start with JSON transformations as base
    const merged = { ...jsonData };

    // Override with complex hardcoded transformations where they exist
    Object.entries(hardcodedData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        merged[key] = value;
      }
    });

    // Map to final format
    return {
      first_name: merged.first_name || "",
      last_name: merged.last_name || "",
      nickname: merged.nickname || "",
      phone: merged.phone || "",
      line_id: merged.line_id || "",
      email: merged.email || "",
      title: merged.title || "",
      company_name: merged.company_name || "",
      business_type: merged.business_type || "other",
      business_type_other: merged.business_type_other || null,
      yec_province: merged.yec_province || "",
      hotel_choice: merged.hotel_choice || "out-of-quota",
      room_type: merged.room_type || null,
      roommate_info: merged.roommate_info || null,
      roommate_phone: merged.roommate_phone || null,
      external_hotel_name: merged.external_hotel_name || null,
      travel_type: merged.travel_type || "private-car",
      profile_image_url: merged.profile_image_url || null,
      chamber_card_url: merged.chamber_card_url || null,
      payment_slip_url: merged.payment_slip_url || null,
      notes: merged.notes || null,
      // status: merged.status || 'approved', // Removed - not in TransformedRecord type
      // currency: merged.currency || 'THB', // Removed - not in TransformedRecord type
      // is_early_bird: merged.is_early_bird !== undefined ? merged.is_early_bird : true, // Removed - not in TransformedRecord type
      // review_checklist: merged.review_checklist || '{"tcc":{"status":"approved"},"payment":{"status":"approved"},"profile":{"status":"approved"}}', // Removed - not in TransformedRecord type
      // created_at: merged.created_at || new Date().toISOString(), // Removed - not in TransformedRecord type
      // tcc_review_status: merged.tcc_review_status || 'approved', // Removed - not in TransformedRecord type
      // profile_review_status: merged.profile_review_status || 'approved', // Removed - not in TransformedRecord type
      // payment_review_status: merged.payment_review_status || 'approved' // Removed - not in TransformedRecord type
    };
  }

  /**
   * Validate transformed data
   */
  private validateTransformedData(
    data: TransformedRecord["transformedData"],
  ): string[] {
    const errors: string[] = [];

    // Required field validation
    if (!data.first_name?.trim()) {
      errors.push("First name is required");
    }
    if (!data.last_name?.trim()) {
      errors.push("Last name is required");
    }
    if (!data.phone?.trim()) {
      errors.push("Phone number is required");
    }
    if (!data.email?.trim()) {
      errors.push("Email is required");
    }
    if (!data.yec_province?.trim()) {
      errors.push("YEC province is required");
    }

    // Business logic validation
    if (data.room_type === "double") {
      if (!data.roommate_info?.trim()) {
        errors.push("Roommate info is required for double rooms");
      }
      if (!data.roommate_phone?.trim()) {
        errors.push("Roommate phone is required for double rooms");
      }
    }

    return errors;
  }

  /**
   * Create error record
   */
  private createErrorRecord(
    parsedRecord: ParsedRecord,
    errorMessage: string,
  ): TransformedRecord {
    return {
      originalData: parsedRecord.data,
      transformedData: this.createEmptyTransformedData(),
      validation: {
        isValid: false,
        errors: [errorMessage],
        warnings: [],
      },
      metadata: {
        rowNumber: parsedRecord.rowNumber,
        originalHeaders: Object.keys(parsedRecord.data),
        transformationTimestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Create empty transformed data structure
   */
  private createEmptyTransformedData(): TransformedRecord["transformedData"] {
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
      hotel_choice: "out-of-quota",
      room_type: null,
      roommate_info: null,
      roommate_phone: null,
      external_hotel_name: null,
      travel_type: "private-car",
      profile_image_url: null,
      chamber_card_url: null,
      payment_slip_url: null,
      notes: null,
      // status: 'approved', // Removed - not in TransformedRecord type
      // currency: 'THB', // Removed - not in TransformedRecord type
      // is_early_bird: true, // Removed - not in TransformedRecord type
      // review_checklist: '{"tcc":{"status":"approved"},"payment":{"status":"approved"},"profile":{"status":"approved"}}', // Removed - not in TransformedRecord type
      // created_at: new Date().toISOString(), // Removed - not in TransformedRecord type
      // tcc_review_status: 'approved', // Removed - not in TransformedRecord type
      // profile_review_status: 'approved', // Removed - not in TransformedRecord type
      // payment_review_status: 'approved' // Removed - not in TransformedRecord type
    };
  }

  /**
   * Get transformation preview for a single record
   */
  getTransformationPreview(record: Record<string, any>): {
    original: Record<string, any>;
    jsonTransformed: Record<string, any>;
    hardcodedTransformed: Record<string, any>;
    finalTransformed: Record<string, any>;
    changes: Array<{
      field: string;
      originalValue: any;
      jsonValue: any;
      hardcodedValue: any;
      finalValue: any;
      source: "json" | "hardcoded" | "merged";
    }>;
  } {
    const original = { ...record };

    // Get JSON transformation
    // Note: ConfigurationDrivenTransformer doesn't have transformRow method
    // Using transformedData directly since it's already transformed
    const jsonTransformed = record.transformedData;

    // Get hardcoded transformation
    const hardcodedTransformed = this.advancedTransformer.transformRow(record);

    // Get final merged result
    const merged = this.mergeTransformationResults(
      jsonTransformed,
      hardcodedTransformed,
      record,
    );

    // Identify changes
    const changes: Array<{
      field: string;
      originalValue: any;
      jsonValue: any;
      hardcodedValue: any;
      finalValue: any;
      source: "json" | "hardcoded" | "merged";
    }> = [];

    Object.keys(merged).forEach((key) => {
      if ((original as any)[key] !== (merged as any)[key]) {
        changes.push({
          field: key,
          originalValue: original[key],
          jsonValue: jsonTransformed[key],
          hardcodedValue: hardcodedTransformed[key],
          finalValue: (merged as any)[key],
          source: this.determineSource(
            key,
            (jsonTransformed as any)[key],
            (hardcodedTransformed as any)[key],
            (merged as any)[key],
          ),
        });
      }
    });

    return {
      original,
      jsonTransformed,
      hardcodedTransformed,
      finalTransformed: merged,
      changes,
    };
  }

  /**
   * Determine the source of a transformation
   */
  private determineSource(
    field: string,
    jsonValue: any,
    hardcodedValue: any,
    finalValue: any,
  ): "json" | "hardcoded" | "merged" {
    if (jsonValue === finalValue && hardcodedValue !== finalValue) {
      return "json";
    }
    if (hardcodedValue === finalValue && jsonValue !== finalValue) {
      return "hardcoded";
    }
    return "merged";
  }
}
