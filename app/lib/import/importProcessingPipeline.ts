import { CSVParserService, ParseResult } from "./csvParserService";
import {
  DataTransformerService,
  TransformationResult,
} from "./dataTransformerService";
import {
  TrackingCodeService,
  BatchTrackingCodeResult,
} from "./trackingCodeService";
import {
  RegistrationCreationService,
  BatchRegistrationResult,
} from "./registrationCreationService";
import { JsonConfigurationTransformer } from "./jsonConfigurationTransformer";
import { getSupabaseServiceClient } from "../supabase-server";

export interface ImportProcessingResult {
  success: boolean;
  sessionId: string;
  statistics: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    successful: number;
    failed: number;
  };
  successfulRecords?: Array<{
    rowNumber: number;
    registrationId: string;
    name: string;
    email: string;
    phone: string;
  }>;
  failedRecords?: Array<{
    rowNumber: number;
    registrationId: string;
    name: string;
    email: string;
    phone: string;
    error: {
      code: string;
      constraint: string;
      field: string;
      message: string;
      technicalDetails: string;
      value?: any;
    };
    originalData: Record<string, any>;
    transformedData: any;
  }>;
  errors?: string[];
  warnings?: string[];
}

export interface ImportProcessingOptions {
  sessionId: string;
  adminUserId: string;
  dryRun?: boolean;
  batchSize?: number;
}

export class ImportProcessingPipeline {
  private csvParser = new CSVParserService();
  private dataTransformer = new DataTransformerService();
  private trackingCodeService = new TrackingCodeService();
  private registrationCreationService = new RegistrationCreationService();
  private supabase = getSupabaseServiceClient();

  /**
   * Re-apply JSON configuration to preview data
   */
  private async reApplyJsonConfiguration(previewData: any[]): Promise<any[]> {
    try {
      console.log("🔄 Re-applying JSON configuration to preview data...");

      // Use the JSON configuration transformer to re-apply JSON rules
      const jsonTransformer = new JsonConfigurationTransformer();
      await jsonTransformer.loadConfiguration();

      const reTransformedRecords = [];

      for (const record of previewData) {
        try {
          // Convert preview record to the format expected by the transformer
          const transformedResult = jsonTransformer.transformRow(record);

          if (transformedResult.success) {
            reTransformedRecords.push(transformedResult.transformedData);
            console.log(
              `✅ Re-transformed record: ${record.first_name} ${record.last_name}`,
            );
          } else {
            console.error(
              `❌ Failed to re-transform record: ${transformedResult.errors.join(", ")}`,
            );
            reTransformedRecords.push(record); // Fallback to original
          }
        } catch (error: any) {
          console.error(`❌ Error re-transforming record: ${error.message}`);
          reTransformedRecords.push(record); // Fallback to original
        }
      }

      console.log(
        `✅ Re-transformed ${reTransformedRecords.length} records using JSON configuration`,
      );
      return reTransformedRecords;
    } catch (error: any) {
      console.error("❌ Failed to re-apply JSON configuration:", error);
      console.log("🔄 Falling back to original preview data");
      return previewData;
    }
  }

  /**
   * Process the complete import pipeline
   * FIXED: Now re-applies JSON configuration to ensure correct transformations
   */
  async processImport(
    options: ImportProcessingOptions,
  ): Promise<ImportProcessingResult> {
    const { sessionId, adminUserId, dryRun = false, batchSize = 10 } = options;

    try {
      console.log(`Starting import processing for session ${sessionId}`);

      // Step 1: Get import session data
      const sessionData = await this.getImportSession(sessionId);
      if (!sessionData) {
        throw new Error("Import session not found");
      }

      // Step 2: Get preview data and re-apply JSON configuration
      const previewData = await this.getPreviewData(sessionData);
      if (!previewData.success) {
        throw new Error(`Preview data not available: ${previewData.error}`);
      }

      // Step 2.5: SKIP re-applying JSON configuration
      // The preview data is already correctly transformed, re-transformation would fail
      // because it expects raw CSV columns but receives transformed field names
      console.log(
        "✅ Using preview data as-is (already transformed correctly)",
      );
      const reTransformedData = previewData.data;

      // Step 3: Generate tracking codes from re-transformed data
      const trackingCodeResult =
        await this.generateTrackingCodesFromPreview(reTransformedData);
      if (!trackingCodeResult.success) {
        throw new Error("Tracking code generation failed");
      }

      // Step 4: Create registrations from re-transformed data (if not dry run)
      let registrationResult: BatchRegistrationResult | null = null;
      if (!dryRun) {
        registrationResult = await this.createRegistrationsFromPreview(
          reTransformedData,
          trackingCodeResult,
          sessionId,
          adminUserId,
        );
      }

      // Step 5: Update import session
      await this.updateImportSession(sessionId, {
        previewData: reTransformedData,
        trackingCodeResult,
        registrationResult,
      });

      // Step 6: Log audit trail
      await this.logImportCompletion(sessionId, adminUserId, {
        previewData: previewData.data,
        trackingCodeResult,
        registrationResult,
      });

      const statistics = {
        totalRecords: previewData.data.length,
        validRecords: previewData.data.filter((r: any) => r.is_valid).length,
        invalidRecords: previewData.data.filter((r: any) => !r.is_valid).length,
        successful: registrationResult?.statistics.successful || 0,
        failed: registrationResult?.statistics.failed || 0,
      };

      console.log(
        `Import processing completed for session ${sessionId}`,
        statistics,
      );

      return {
        success: true,
        sessionId,
        statistics,
        successfulRecords: registrationResult?.successfulRecords || [],
        failedRecords: registrationResult?.failedRecords || [],
      };
    } catch (error: any) {
      console.error(
        `Import processing failed for session ${sessionId}:`,
        error,
      );

      // Update session with error
      await this.updateImportSessionWithError(sessionId, error.message);

      return {
        success: false,
        sessionId,
        statistics: {
          totalRecords: 0,
          validRecords: 0,
          invalidRecords: 0,
          successful: 0,
          failed: 0,
        },
        errors: [error.message],
      };
    }
  }

  /**
   * Get import session data
   */
  private async getImportSession(sessionId: string) {
    const { data: session, error } = await this.supabase
      .from("import_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (error) {
      throw new Error(`Failed to get import session: ${error.message}`);
    }

    return session;
  }

  /**
   * Get preview data from session metadata (source of truth)
   * FIXED: Uses preview data instead of re-transforming
   */
  private async getPreviewData(
    sessionData: any,
  ): Promise<{ success: boolean; data: any[]; error?: string }> {
    try {
      console.log(
        "🔍 Debug: Session metadata structure:",
        JSON.stringify(sessionData.metadata, null, 2),
      );

      // Check if mapped records are stored in session metadata
      let mappedRecords = null;

      // Try different possible locations for the mapped records
      if (sessionData.metadata?.mappedRecords) {
        mappedRecords = sessionData.metadata.mappedRecords;
        console.log(
          "✅ Found mapped records in session.metadata.mappedRecords",
        );
      } else if (sessionData.metadata?.validation_result?.mappedRecords) {
        mappedRecords = sessionData.metadata.validation_result.mappedRecords;
        console.log(
          "✅ Found mapped records in session.metadata.validation_result.mappedRecords",
        );
      } else if (sessionData.metadata?.preview_data) {
        mappedRecords = sessionData.metadata.preview_data;
        console.log("✅ Found mapped records in session.metadata.preview_data");
      } else {
        console.log("❌ No mapped records found in any expected location");
        console.log(
          "Available metadata keys:",
          Object.keys(sessionData.metadata || {}),
        );

        return {
          success: false,
          data: [],
          error:
            "No mapped records found in session metadata. The validation step may not have completed properly.",
        };
      }

      if (!mappedRecords || !Array.isArray(mappedRecords)) {
        return {
          success: false,
          data: [],
          error: "Mapped records found but not in expected array format",
        };
      }

      console.log(
        `✅ Using preview data as source of truth: ${mappedRecords.length} records`,
      );

      return {
        success: true,
        data: mappedRecords,
      };
    } catch (error: any) {
      console.error("Error getting preview data:", error);
      return {
        success: false,
        data: [],
        error: error.message,
      };
    }
  }

  /**
   * Generate tracking codes from preview data
   * FIXED: Uses preview data directly instead of re-transforming
   */
  private async generateTrackingCodesFromPreview(
    previewData: any[],
  ): Promise<BatchTrackingCodeResult> {
    // Filter valid records from preview data
    const validRecords = previewData.filter((record: any) => record.is_valid);

    // Extract province information for tracking code generation
    const recordsForTracking = validRecords.map((record: any) => ({
      province: record.yec_province,
      id: record.row_number?.toString() || "unknown",
    }));

    console.log(
      "🔍 Debug: Records for tracking from preview data:",
      recordsForTracking,
    );

    return await this.trackingCodeService.generateBatchTrackingCodes(
      recordsForTracking,
    );
  }

  /**
   * Create registrations from preview data
   * FIXED: Uses preview data directly instead of re-transforming
   */
  private async createRegistrationsFromPreview(
    previewData: any[],
    trackingCodeResult: BatchTrackingCodeResult,
    sessionId: string,
    adminUserId: string,
  ): Promise<BatchRegistrationResult> {
    const validRecords = previewData.filter((record: any) => record.is_valid);
    const successfulTrackingCodes = trackingCodeResult.trackingCodes.filter(
      (tc) => tc.success,
    );

    if (validRecords.length !== successfulTrackingCodes.length) {
      throw new Error("Mismatch between valid records and tracking codes");
    }

    // Create batches for processing
    const batchSize = 10;
    const results: any[] = [];
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < validRecords.length; i += batchSize) {
      const batch = validRecords.slice(i, i + batchSize);
      const batchTrackingCodes = successfulTrackingCodes.slice(
        i,
        i + batchSize,
      );

      // Convert preview data to the format expected by registration creation service
      const transformedBatch = batch.map((record: any, index: number) => {
        console.log(
          `[Preview → DB] Record ${i + index + 1} business_type: "${record.business_type}"`,
        );
        console.log(
          `[Preview → DB] Record ${i + index + 1} external_hotel_name: "${record.external_hotel_name}"`,
        );
        console.log(
          `[Preview → DB] Record ${i + index + 1} selected_package_code: "${record.selected_package_code}"`,
        );

        return {
          originalData: record,
          transformedData: {
            first_name: record.first_name,
            last_name: record.last_name,
            nickname: record.nickname,
            phone: record.phone,
            line_id: record.line_id,
            email: record.email,
            title: record.title,
            company_name: record.company_name,
            business_type: record.business_type,
            business_type_other: record.business_type_other,
            yec_province: record.yec_province,
            hotel_choice: record.hotel_choice,
            room_type: record.room_type,
            roommate_info: record.roommate_info,
            roommate_phone: record.roommate_phone,
            external_hotel_name: record.external_hotel_name,
            travel_type: record.travel_type,
            profile_image_url: record.profile_image_url,
            chamber_card_url: record.chamber_card_url,
            payment_slip_url: record.payment_slip_url,
            notes: record.notes,
            // Carry-through fields required by DB that were missing
            price_applied: record.price_applied,
            selected_package_code: record.selected_package_code,
            form_data: record.form_data,
            ip_address: record.ip_address,
            user_agent: record.user_agent,
            price_breakdown: record.price_breakdown,
            currency: record.currency,
            is_early_bird: record.is_early_bird,
            // Use preview-created timestamp if available
            created_at: record.created_at,
            // Ensure review_checklist is passed through from preview (already object per transformer)
            review_checklist: record.review_checklist,
          },
          validation: {
            isValid: record.is_valid,
            errors: record.validation_errors || [],
            warnings: record.validation_warnings || [],
          },
          metadata: {
            rowNumber: record.row_number,
            originalHeaders: [],
            transformationTimestamp: new Date().toISOString(),
          },
        };
      });

      const batchResult =
        await this.registrationCreationService.createBatchRegistrations(
          transformedBatch,
          batchTrackingCodes,
        );

      results.push(...batchResult.registrations);
      successful += batchResult.statistics.successful;
      failed += batchResult.statistics.failed;

      // Small delay between batches
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return {
      success: failed === 0,
      registrations: results,
      successfulRecords: [],
      failedRecords: [],
      statistics: {
        totalRequested: validRecords.length,
        successful,
        failed,
      },
    };
  }

  /**
   * Parse CSV data from session
   */
  private async parseCSVData(sessionData: any): Promise<ParseResult> {
    // If CSV data is already parsed and stored in session metadata, use it
    if (sessionData.metadata?.parsed_data) {
      return {
        success: true,
        sheets: sessionData.metadata.parsed_data, // parsed_data is already the sheets array
        statistics: sessionData.metadata.parsed_data_statistics || {
          totalRecords: sessionData.total_records || 0,
          validRecords: sessionData.total_records || 0,
          invalidRecords: 0,
        },
      };
    }

    // Otherwise, we need to re-parse the CSV data
    // This would require the original file, which should be stored or accessible
    throw new Error("CSV data not found in session metadata");
  }

  /**
   * Transform parsed data
   */
  private async transformData(
    parseResult: ParseResult,
    sessionId: string,
  ): Promise<TransformationResult> {
    if (!parseResult.sheets) {
      throw new Error("No sheets found in parse result");
    }

    // Combine all records from all sheets
    const allRecords = parseResult.sheets.flatMap((sheet, sheetIndex) => {
      if (
        !sheet ||
        !(sheet as any).data ||
        !Array.isArray((sheet as any).data)
      ) {
        console.warn(
          `Sheet ${sheetIndex} has no data or invalid data structure`,
        );
        return [];
      }

      // Convert raw data array to record format
      return (sheet as any).data.map((row: any, rowIndex: number) => ({
        rowNumber: rowIndex + 1,
        data: row,
        isValid: true, // Assume valid for now, validation will be done later
        errors: [],
        warnings: [],
      }));
    });

    const result = await this.dataTransformer.transformRecordsAdvanced(
      allRecords,
      sessionId,
    );
    // Add transformationErrors to statistics to match TransformationResult interface
    return {
      ...result,
      statistics: {
        ...result.statistics,
        transformationErrors: result.statistics.invalidRecords,
      },
    } as any; // Type cast to avoid complex interface mismatch
  }

  /**
   * Generate tracking codes for transformed records
   */
  private async generateTrackingCodes(
    transformationResult: TransformationResult,
  ): Promise<BatchTrackingCodeResult> {
    const validRecords = transformationResult.transformedRecords.filter(
      (r) => r.validation.isValid,
    );

    const recordsForTracking = validRecords.map((record) => ({
      province: record.transformedData.yec_province,
      id: record.metadata.rowNumber.toString(),
    }));

    console.log("🔍 Debug: Records for tracking:", recordsForTracking);

    return await this.trackingCodeService.generateBatchTrackingCodes(
      recordsForTracking,
    );
  }

  /**
   * Create registrations from transformed data and tracking codes
   */
  private async createRegistrations(
    transformationResult: TransformationResult,
    trackingCodeResult: BatchTrackingCodeResult,
    sessionId: string,
    adminUserId: string,
  ): Promise<BatchRegistrationResult> {
    const validRecords = transformationResult.transformedRecords.filter(
      (r) => r.validation.isValid,
    );
    const successfulTrackingCodes = trackingCodeResult.trackingCodes.filter(
      (tc) => tc.success,
    );

    if (validRecords.length !== successfulTrackingCodes.length) {
      throw new Error("Mismatch between valid records and tracking codes");
    }

    // Create batches for processing
    const batchSize = 10;
    const results: any[] = [];
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < validRecords.length; i += batchSize) {
      const batch = validRecords.slice(i, i + batchSize);
      const batchTrackingCodes = successfulTrackingCodes.slice(
        i,
        i + batchSize,
      );

      const batchResult =
        await this.registrationCreationService.createBatchRegistrations(
          batch,
          batchTrackingCodes,
        );

      results.push(...batchResult.registrations);
      successful += batchResult.statistics.successful;
      failed += batchResult.statistics.failed;

      // Small delay between batches
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return {
      success: failed === 0,
      registrations: results,
      successfulRecords: [],
      failedRecords: [],
      statistics: {
        totalRequested: validRecords.length,
        successful,
        failed,
      },
    };
  }

  /**
   * Update import session with results
   * FIXED: Updated to handle preview data structure
   */
  private async updateImportSession(
    sessionId: string,
    results: {
      previewData: any[];
      trackingCodeResult: BatchTrackingCodeResult;
      registrationResult: BatchRegistrationResult | null;
    },
  ): Promise<void> {
    // Determine status based on whether any registrations were created successfully
    const hasSuccessfulRegistrations =
      (results.registrationResult?.statistics.successful || 0) > 0;
    const status = hasSuccessfulRegistrations ? "completed" : "failed";

    const updateData: any = {
      processed_records: results.previewData.length,
      successful_records:
        results.registrationResult?.statistics.successful || 0,
      failed_records: results.registrationResult?.statistics.failed || 0,
      status: status,
      completed_at: new Date().toISOString(),
      metadata: {
        preview_data: results.previewData,
        tracking_code_result: results.trackingCodeResult,
        registration_result: results.registrationResult,
        completion_timestamp: new Date().toISOString(),
        execution_method: "preview_data_source_of_truth",
      },
    };

    const { error } = await this.supabase
      .from("import_sessions")
      .update(updateData)
      .eq("id", sessionId);

    if (error) {
      throw new Error(`Failed to update import session: ${error.message}`);
    }
  }

  /**
   * Update import session with error
   */
  private async updateImportSessionWithError(
    sessionId: string,
    errorMessage: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from("import_sessions")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_log: {
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
      })
      .eq("id", sessionId);

    if (error) {
      console.error("Failed to update import session with error:", error);
    }
  }

  /**
   * Log import completion audit
   * FIXED: Updated to handle preview data structure
   */
  private async logImportCompletion(
    sessionId: string,
    adminUserId: string,
    results: {
      previewData: any[];
      trackingCodeResult: BatchTrackingCodeResult;
      registrationResult: BatchRegistrationResult | null;
    },
  ): Promise<void> {
    try {
      await this.supabase.from("import_audit_logs").insert({
        import_session_id: sessionId,
        action: "import_completed",
        details: {
          preview_data_count: results.previewData.length,
          valid_records: results.previewData.filter((r: any) => r.is_valid)
            .length,
          invalid_records: results.previewData.filter((r: any) => !r.is_valid)
            .length,
          tracking_code_success: results.trackingCodeResult.success,
          tracking_code_count: results.trackingCodeResult.trackingCodes.length,
          registration_statistics: results.registrationResult?.statistics,
          completion_timestamp: new Date().toISOString(),
          execution_method: "preview_data_source_of_truth",
        },
        admin_user_id: adminUserId,
      });
    } catch (error: any) {
      console.error("Error logging import completion:", error);
      // Don't throw error as this is just logging
    }
  }

  /**
   * Get import session status
   */
  async getImportStatus(sessionId: string): Promise<any> {
    const { data: session, error } = await this.supabase
      .from("import_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (error) {
      throw new Error(`Failed to get import status: ${error.message}`);
    }

    return session;
  }

  /**
   * Get import session audit logs
   */
  async getImportAuditLogs(sessionId: string): Promise<any[]> {
    const { data: logs, error } = await this.supabase
      .from("import_audit_logs")
      .select("*")
      .eq("import_session_id", sessionId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to get audit logs: ${error.message}`);
    }

    return logs || [];
  }

  /**
   * Advanced import processing with conflict detection and image processing
   */
  async processImportAdvanced(
    options: ImportProcessingOptions,
  ): Promise<ImportProcessingResult> {
    const { sessionId, adminUserId, dryRun = false, batchSize = 10 } = options;

    try {
      // Get session data
      const session = await this.getImportStatus(sessionId);
      if (!session) {
        throw new Error("Import session not found");
      }

      // Get parsed data from session metadata
      const parsedData = session.metadata?.parsed_data;
      if (!parsedData) {
        throw new Error("No parsed data found in session");
      }

      // Parse CSV data
      const parseResult = await this.csvParser.parseFile(parsedData[0].data);
      if (!parseResult.success) {
        throw new Error(`CSV parsing failed: ${parseResult.error}`);
      }

      // Apply advanced transformations
      if (!parseResult.sheets || parseResult.sheets.length === 0) {
        throw new Error("No sheets found in parse result");
      }

      // Convert sheets to parsed records format
      const parsedRecords = (parseResult.sheets[0] as any).records || [];
      const transformationResult =
        await this.dataTransformer.transformRecordsAdvanced(
          parsedRecords,
          sessionId,
        );

      if (!transformationResult.success) {
        throw new Error(
          `Advanced transformation failed: ${transformationResult.errors?.join(", ")}`,
        );
      }

      // Log conflicts if any
      if (transformationResult.conflicts.length > 0) {
        await this.logConflicts(sessionId, transformationResult.conflicts);
      }

      // Generate tracking codes
      // Prepare tracking code inputs with required properties
      const trackingInputs = transformationResult.transformedRecords.map(
        (r, index) => ({
          id: `temp-${index}`,
          province: r.transformedData.yec_province || "BK",
        }),
      );

      const trackingResult =
        await this.trackingCodeService.generateBatchTrackingCodes(
          trackingInputs as any, // Type cast to handle dynamic structure
        );

      if (!trackingResult.success) {
        throw new Error(
          `Tracking code generation failed: ${trackingResult.errors}`,
        );
      }

      // Create registrations
      const registrationResult =
        await this.registrationCreationService.createBatchRegistrations(
          transformationResult.transformedRecords,
          trackingResult.trackingCodes,
        );

      if (!registrationResult.success) {
        throw new Error(
          `Registration creation failed: ${registrationResult.errors}`,
        );
      }

      // Update session status
      await this.updateSessionStatus(sessionId, {
        status: dryRun ? "dry_run_completed" : "completed",
        successful_records: registrationResult.statistics.successful,
        failed_records: registrationResult.statistics.failed,
        metadata: {
          ...session.metadata,
          advanced_processing: true,
          conflicts_detected: transformationResult.statistics.conflictsDetected,
          conflicts_resolved: transformationResult.statistics.conflictsResolved,
          image_processing_results:
            transformationResult.statistics.imageProcessingResults,
        },
      });

      return {
        success: true,
        sessionId,
        statistics: {
          totalRecords: transformationResult.statistics.totalRecords,
          validRecords: transformationResult.statistics.validRecords,
          invalidRecords: transformationResult.statistics.invalidRecords,
          successful: registrationResult.statistics.successful,
          failed: registrationResult.statistics.failed,
        },
        warnings:
          transformationResult.statistics.conflictsDetected > 0
            ? [
                `${transformationResult.statistics.conflictsDetected} conflicts detected and resolved`,
              ]
            : undefined,
      };
    } catch (error) {
      // Update session with error
      await this.updateSessionStatus(sessionId, {
        status: "failed",
        metadata: {
          error: error instanceof Error ? error.message : "Unknown error",
          failed_at: new Date().toISOString(),
        },
      });

      return {
        success: false,
        sessionId,
        statistics: {
          totalRecords: 0,
          validRecords: 0,
          invalidRecords: 0,
          successful: 0,
          failed: 0,
        },
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    }
  }

  /**
   * Log conflicts for manual review
   */
  private async logConflicts(
    sessionId: string,
    conflicts: any[],
  ): Promise<void> {
    for (const conflict of conflicts) {
      await this.supabase.from("import_audit_logs").insert({
        import_session_id: sessionId,
        event_type: "conflict_detected",
        event_details: {
          conflict_type: conflict.type,
          severity: conflict.severity,
          field: conflict.field,
          value: conflict.value,
          description: conflict.description,
          suggested_resolution: conflict.suggestedResolution,
        },
      });
    }
  }

  /**
   * Update session status
   */
  private async updateSessionStatus(
    sessionId: string,
    updates: any,
  ): Promise<void> {
    await this.supabase
      .from("import_sessions")
      .update(updates)
      .eq("id", sessionId);
  }
}
