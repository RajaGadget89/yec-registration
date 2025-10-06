import { getSupabaseServiceClient } from "../supabase-server";
import { TransformedRecord } from "./dataTransformerService";
import { TrackingCodeResult } from "./trackingCodeService";
import { GoogleDriveService } from "./googleDriveService";
import { SupabaseStorageService } from "./supabaseStorageService";
import { BadgeGenerationService } from "./badgeGenerationService";
import { EmailNotificationService } from "./emailNotificationService";

export interface RegistrationCreationResult {
  success: boolean;
  registrationId?: string;
  trackingCode?: string;
  error?: string;
  fileProcessingResults?: {
    profileImageUrl?: string;
    chamberCardUrl?: string;
    paymentSlipUrl?: string;
  };
}

export interface DetailedErrorInfo {
  code: string;
  constraint: string;
  field: string;
  message: string;
  technicalDetails: string;
  value?: any;
}

export interface SuccessfulRecordInfo {
  rowNumber: number;
  registrationId: string;
  name: string;
  email: string;
  phone: string;
}

export interface FailedRecordInfo {
  rowNumber: number;
  registrationId: string;
  name: string;
  email: string;
  phone: string;
  error: DetailedErrorInfo;
  originalData: Record<string, any>;
  transformedData: any;
}

export interface BatchRegistrationResult {
  success: boolean;
  registrations: RegistrationCreationResult[];
  successfulRecords: SuccessfulRecordInfo[];
  failedRecords: FailedRecordInfo[];
  statistics: {
    totalRequested: number;
    successful: number;
    failed: number;
  };
  errors?: string[];
}

export class RegistrationCreationService {
  private supabase = getSupabaseServiceClient();
  private googleDriveService: GoogleDriveService | null = null;
  private supabaseStorageService = new SupabaseStorageService();
  private badgeGenerationService = new BadgeGenerationService();
  private emailNotificationService = new EmailNotificationService();

  /**
   * Get GoogleDriveService instance (lazy initialization)
   */
  private getGoogleDriveService(): GoogleDriveService | null {
    if (this.googleDriveService === null) {
      try {
        this.googleDriveService = new GoogleDriveService();
      } catch (error) {
        console.warn("GoogleDriveService not available:", error);
        return null;
      }
    }
    return this.googleDriveService;
  }

  /**
   * Create a single registration from transformed data
   */
  async createRegistration(
    transformedRecord: TransformedRecord,
    trackingCode: string,
  ): Promise<RegistrationCreationResult> {
    try {
      const { transformedData } = transformedRecord;
      // Allow accessing extended fields that are not in the strict TransformedRecord type
      const td: any = transformedData as any;

      // Helper to parse JSON-like string fields into objects for json/jsonb columns
      const asJson = (v: any) => {
        if (!v) return v;
        if (typeof v === "string") {
          try {
            return JSON.parse(v);
          } catch {
            return v;
          }
        }
        return v;
      };

      // Process files from Google Drive URLs
      const fileProcessingResults = await this.processFiles(transformedData);

      // Create registration record
      console.log(
        `[DB Insert] ${trackingCode} business_type: "${transformedData.business_type}"`,
      );
      console.log(
        `[DB Insert] ${trackingCode} business_type_other: "${transformedData.business_type_other}"`,
      );
      console.log(
        `[DB Insert] ${trackingCode} chamber_card_url (before processFiles): "${transformedData.chamber_card_url}"`,
      );
      console.log(
        `[DB Insert] ${trackingCode} chamber_card_url (after processFiles): "${fileProcessingResults.chamberCardUrl}"`,
      );

      // Sanitize line_id to match DB constraint: ^[a-zA-Z0-9._-]+$
      const sanitizeLineId = (lineId: string): string => {
        if (!lineId || !lineId.trim()) return "";
        // Remove any characters that don't match the allowed pattern
        const sanitized = lineId.replace(/[^a-zA-Z0-9._-]/g, "");
        return sanitized || ""; // Return empty string if nothing left after sanitization
      };

      // Determine hotel choice and ensure external hotel name is set when out-of-quota
      const hotelChoice =
        (typeof transformedData.hotel_choice === "string"
          ? transformedData.hotel_choice
          : (transformedData.hotel_choice as any)?.hotel_choice) ||
        "out-of-quota";
      const externalHotelName = transformedData.external_hotel_name || null;

      // If out-of-quota but no external hotel name, set a placeholder
      const finalExternalHotelName =
        hotelChoice === "out-of-quota" && !externalHotelName
          ? "ไม่ระบุโรงแรม" // "Hotel not specified" in Thai
          : externalHotelName;

      const registrationData = {
        registration_id: trackingCode,
        title: transformedData.title, // Use transformed title from data
        first_name: transformedData.first_name,
        last_name: transformedData.last_name,
        nickname: transformedData.nickname,
        phone: transformedData.phone,
        line_id: sanitizeLineId(transformedData.line_id),
        email: transformedData.email,
        company_name: transformedData.company_name,
        business_type: transformedData.business_type,
        business_type_other:
          transformedData.business_type_other === "" ||
          transformedData.business_type_other === null
            ? null
            : transformedData.business_type_other,
        yec_province: transformedData.yec_province,
        hotel_choice: hotelChoice,
        room_type:
          typeof transformedData.room_type === "string"
            ? transformedData.room_type
            : (transformedData.room_type as any)?.room_type,
        roommate_info: transformedData.roommate_info,
        roommate_phone: transformedData.roommate_phone,
        external_hotel_name: finalExternalHotelName,
        travel_type: transformedData.travel_type,
        profile_image_url: fileProcessingResults.profileImageUrl,
        chamber_card_url: fileProcessingResults.chamberCardUrl,
        payment_slip_url: fileProcessingResults.paymentSlipUrl,
        badge_url: null, // Will be generated later
        email_sent: false,
        email_sent_at: null,
        status: "approved" as const, // Imported registrations are pre-approved
        update_reason: null,
        rejected_reason: null,
        payment_review_status: "approved" as const, // Pre-approved
        profile_review_status: "approved" as const, // Pre-approved
        tcc_review_status: "approved" as const, // Pre-approved
        // Enforce approved checklist shape if not provided
        review_checklist: asJson(td.review_checklist) || {
          tcc: { status: "approved" },
          payment: { status: "approved" },
          profile: { status: "approved" },
        },
        price_applied:
          typeof td.price_applied === "number"
            ? td.price_applied
            : td.price_applied?.price_applied,
        currency: td.currency || "THB",
        selected_package_code:
          typeof td.selected_package_code === "string"
            ? td.selected_package_code
            : td.selected_package_code?.selected_package_code,
        price_breakdown: asJson(td.price_breakdown),
        form_data: asJson(td.form_data),
        is_early_bird:
          typeof td.is_early_bird === "boolean" ? td.is_early_bird : true,
        ip_address: td.ip_address,
        user_agent: td.user_agent,
        // Honor transformed created_at from preview if present
        created_at: td.created_at || new Date().toISOString(),
      };

      // Insert registration into database
      const { data: registration, error: insertError } = await this.supabase
        .from("registrations")
        .insert(registrationData)
        .select()
        .single();

      if (insertError) {
        console.error("❌ Registration creation failed:", {
          registrationId: trackingCode,
          error: insertError,
          errorCode: insertError.code,
          errorMessage: insertError.message,
          errorDetails: insertError.details,
          errorHint: insertError.hint,
          registrationData: {
            first_name: transformedData.first_name,
            last_name: transformedData.last_name,
            email: transformedData.email,
            business_type: transformedData.business_type,
            payment_review_status: "approved",
            profile_review_status: "approved",
            tcc_review_status: "approved",
          },
        });
        throw new Error(
          `Failed to create registration: ${insertError.message} (Code: ${insertError.code})`,
        );
      }

      // Generate badge for the registration
      let badgeUrl: string | undefined;
      try {
        console.log(`🏆 Generating badge for registration: ${trackingCode}`);
        const badgeResult =
          await this.badgeGenerationService.generateImportBadge(registration);

        if (badgeResult.success && badgeResult.badgeUrl) {
          badgeUrl = badgeResult.badgeUrl;

          // Update registration with badge URL
          await this.badgeGenerationService.updateRegistrationBadgeUrl(
            trackingCode,
            badgeUrl,
          );
          console.log(`✅ Badge generated and updated for: ${trackingCode}`);
        } else {
          console.warn(
            `⚠️ Badge generation failed for ${trackingCode}: ${badgeResult.error}`,
          );
        }
      } catch (badgeError: any) {
        console.error(
          `❌ Badge generation error for ${trackingCode}:`,
          badgeError,
        );
        // Continue without badge - don't fail the entire registration
      }

      // Send congratulation email (queue for batch processing)
      try {
        if (registration.email) {
          console.log(
            `📧 Queueing congratulation email for: ${registration.email}`,
          );
          const emailResult =
            await this.emailNotificationService.queueImportEmail({
              registrationId: trackingCode,
              email: registration.email,
              firstName: registration.first_name,
              lastName: registration.last_name,
              badgeUrl: badgeUrl || "",
              trackingCode: trackingCode,
            });

          if (emailResult.success) {
            console.log(`✅ Email queued for: ${registration.email}`);
          } else {
            console.warn(
              `⚠️ Email queueing failed for ${registration.email}: ${emailResult.error}`,
            );
          }
        }
      } catch (emailError: any) {
        console.error(
          `❌ Email queueing error for ${trackingCode}:`,
          emailError,
        );
        // Continue without email - don't fail the entire registration
      }

      return {
        success: true,
        registrationId: registration.id,
        trackingCode,
        fileProcessingResults: {
          ...fileProcessingResults,
        },
      };
    } catch (error: any) {
      console.error(
        `Error creating registration for ${transformedRecord.metadata.rowNumber}:`,
        error,
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Parse database error into user-friendly format
   */
  private parseDetailedError(
    error: any,
    record: TransformedRecord,
    trackingCode: string,
  ): DetailedErrorInfo {
    const constraintMatch = error.message?.match(/constraint "([^"]+)"/);
    const columnMatch = error.message?.match(/column "([^"]+)"/);
    const constraint = constraintMatch?.[1] || "";
    const field = columnMatch?.[1] || "";

    // Map constraints to user-friendly messages
    const constraintMessages: Record<string, string> = {
      chk_email_format: "Invalid email format",
      chk_line_id_format:
        "Line ID contains invalid characters (only letters, numbers, dots, dashes, and underscores allowed)",
      chk_phone_format: "Invalid phone number format",
      registrations_hotel_choice_check:
        "Hotel choice is required and cannot be null",
      chk_external_hotel_required_when_out_quota:
        "External hotel name is required when hotel choice is out-of-quota",
      registrations_business_type_check: "Business type is required",
      unique_registration_id: "Registration ID already exists",
      unique_email: "Email address already exists",
    };

    return {
      code: error.code || "UNKNOWN",
      constraint: constraint,
      field: field,
      message:
        constraintMessages[constraint] ||
        error.message ||
        "Unknown database error",
      technicalDetails: error.message,
      value: field ? (record.transformedData as any)[field] : undefined,
    };
  }

  /**
   * Create multiple registrations in batch
   */
  async createBatchRegistrations(
    transformedRecords: TransformedRecord[],
    trackingCodes: TrackingCodeResult[],
  ): Promise<BatchRegistrationResult> {
    const results: RegistrationCreationResult[] = [];
    const successfulRecords: SuccessfulRecordInfo[] = [];
    const failedRecords: FailedRecordInfo[] = [];
    const errors: string[] = [];
    let successful = 0;
    let failed = 0;

    console.log(
      `🚀 Starting batch registration creation for ${transformedRecords.length} records`,
    );
    console.log(
      `📊 Tracking codes available: ${trackingCodes.filter((tc) => tc.success).length}/${trackingCodes.length}`,
    );

    // Process registrations in batches of 10 to avoid overwhelming the database
    const batchSize = 10;
    const batches = this.createBatches(transformedRecords, batchSize);

    for (const batch of batches) {
      try {
        const batchResults = await Promise.all(
          batch.map(async (record, index) => {
            const recordIndex = transformedRecords.indexOf(record);
            const trackingCode = trackingCodes[recordIndex];

            console.log(
              `\n📝 Processing record ${recordIndex + 1}/${transformedRecords.length}:`,
            );
            console.log(
              `   Name: ${record.transformedData.first_name} ${record.transformedData.last_name}`,
            );
            console.log(`   Email: ${record.transformedData.email}`);
            console.log(
              `   Business Type: ${record.transformedData.business_type}`,
            );
            console.log(`   Province: ${record.transformedData.yec_province}`);
            console.log(
              `   Tracking Code: ${trackingCode?.trackingCode || "N/A"}`,
            );
            console.log(
              `   Tracking Code Success: ${trackingCode?.success || false}`,
            );

            if (!trackingCode.success) {
              console.log(
                `⚠️ Skipping record ${recordIndex + 1}: No tracking code available - ${trackingCode.error}`,
              );
              const failedInfo: FailedRecordInfo = {
                rowNumber: record.metadata.rowNumber,
                registrationId: "",
                name: `${record.transformedData.first_name} ${record.transformedData.last_name}`,
                email: record.transformedData.email,
                phone: record.transformedData.phone,
                error: {
                  code: "TRACKING_CODE_ERROR",
                  constraint: "",
                  field: "",
                  message:
                    trackingCode.error || "Tracking code generation failed",
                  technicalDetails:
                    trackingCode.error || "Tracking code generation failed",
                },
                originalData: record.originalData,
                transformedData: record.transformedData,
              };
              failedRecords.push(failedInfo);
              return {
                success: false,
                error: trackingCode.error || "Tracking code generation failed",
              };
            }

            try {
              const result = await this.createRegistration(
                record,
                trackingCode.trackingCode,
              );
              console.log(
                `✅ Record ${recordIndex + 1} processed successfully: ${result.registrationId}`,
              );

              // Track successful record details
              successfulRecords.push({
                rowNumber: record.metadata.rowNumber,
                registrationId: trackingCode.trackingCode,
                name: `${record.transformedData.first_name} ${record.transformedData.last_name}`,
                email: record.transformedData.email,
                phone: record.transformedData.phone,
              });

              return result;
            } catch (error: any) {
              console.log(
                `❌ Record ${recordIndex + 1} failed: ${error.message}`,
              );

              // Track failed record with detailed error info
              const failedInfo: FailedRecordInfo = {
                rowNumber: record.metadata.rowNumber,
                registrationId: trackingCode.trackingCode,
                name: `${record.transformedData.first_name} ${record.transformedData.last_name}`,
                email: record.transformedData.email,
                phone: record.transformedData.phone,
                error: this.parseDetailedError(
                  error,
                  record,
                  trackingCode.trackingCode,
                ),
                originalData: record.originalData,
                transformedData: record.transformedData,
              };
              failedRecords.push(failedInfo);

              return {
                success: false,
                error: error.message,
              };
            }
          }),
        );

        results.push(...batchResults);

        // Count results
        for (const result of batchResults) {
          if (result.success) {
            successful++;
          } else {
            failed++;
          }
        }

        // Small delay between batches to avoid overwhelming the system
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error: any) {
        console.error("Error processing batch:", error);
        errors.push(error.message);

        // Create error results for all records in this batch
        for (const record of batch) {
          results.push({
            success: false,
            error: error.message,
          });
          failed++;
        }
      }
    }

    console.log(`\n📊 Batch registration creation completed:`);
    console.log(`   Total records: ${transformedRecords.length}`);
    console.log(`   Successful: ${successful}`);
    console.log(`   Failed: ${failed}`);
    console.log(
      `   Success rate: ${Math.round((successful / transformedRecords.length) * 100)}%`,
    );

    return {
      success: errors.length === 0,
      registrations: results,
      successfulRecords,
      failedRecords,
      statistics: {
        totalRequested: transformedRecords.length,
        successful,
        failed,
      },
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Process files from Google Drive URLs
   */
  private async processFiles(transformedData: any): Promise<{
    profileImageUrl?: string;
    chamberCardUrl?: string;
    paymentSlipUrl?: string;
  }> {
    const results: any = {};

    try {
      // Process profile image
      if (transformedData.profile_image_url) {
        const profileResult = await this.processSingleFile(
          transformedData.profile_image_url,
          "profile_images",
        );
        if (profileResult.success) {
          results.profileImageUrl = profileResult.url;
        }
      }

      // Process chamber card
      if (transformedData.chamber_card_url) {
        const chamberResult = await this.processSingleFile(
          transformedData.chamber_card_url,
          "chamber_cards",
        );
        if (chamberResult.success) {
          results.chamberCardUrl = chamberResult.url;
        }
      }

      // Process payment slip
      if (transformedData.payment_slip_url) {
        const paymentResult = await this.processSingleFile(
          transformedData.payment_slip_url,
          "payment_slips",
        );
        if (paymentResult.success) {
          results.paymentSlipUrl = paymentResult.url;
        }
      }
    } catch (error: any) {
      console.error("Error processing files:", error);
      // Continue with registration creation even if file processing fails
    }

    return results;
  }

  /**
   * Process a single file from Google Drive to Supabase Storage
   */
  private async processSingleFile(
    googleDriveUrl: string,
    folderPath: string,
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Get GoogleDriveService instance (lazy initialization)
      const googleDriveService = this.getGoogleDriveService();

      if (!googleDriveService) {
        console.warn(
          "GoogleDriveService not available, skipping file processing",
        );
        return {
          success: false,
          error:
            "GoogleDriveService not available - GOOGLE_DRIVE_API_KEY not configured",
        };
      }

      // Download file from Google Drive
      let downloadResult;
      try {
        downloadResult = await googleDriveService.downloadFile(googleDriveUrl);
      } catch (error: any) {
        console.warn(
          `Error downloading file from Google Drive: ${error.message}`,
        );
        return {
          success: false,
          error: `Google Drive download failed: ${error.message}`,
        };
      }

      // Upload file to Supabase Storage
      const uploadResult = await this.supabaseStorageService.uploadFile(
        downloadResult,
        folderPath,
      );

      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error || "Failed to upload to Supabase Storage",
        };
      }

      return {
        success: true,
        url: uploadResult.url,
      };
    } catch (error: any) {
      console.error(`Error processing file ${googleDriveUrl}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create batches from an array
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];

    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }

    return batches;
  }

  /**
   * Update import session with results
   */
  async updateImportSession(
    sessionId: string,
    results: BatchRegistrationResult,
  ): Promise<void> {
    try {
      const { data: session } = await this.supabase
        .from("import_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (!session) {
        throw new Error("Import session not found");
      }

      // Update session with results
      await this.supabase
        .from("import_sessions")
        .update({
          processedrecords:
            session.processedrecords + results.statistics.totalRequested,
          successfulrecords:
            session.successfulrecords + results.statistics.successful,
          failedrecords: session.failedrecords + results.statistics.failed,
          status: results.success ? "completed" : "failed",
          completed_at: new Date().toISOString(),
          metadata: {
            ...session.metadata,
            batch_results: results.statistics,
            completion_timestamp: new Date().toISOString(),
          },
        })
        .eq("id", sessionId);
    } catch (error: any) {
      console.error("Error updating import session:", error);
      throw error;
    }
  }

  /**
   * Log registration creation audit
   */
  async logRegistrationCreation(
    sessionId: string,
    adminUserId: string,
    results: BatchRegistrationResult,
  ): Promise<void> {
    try {
      await this.supabase.from("import_audit_logs").insert({
        import_session_id: sessionId,
        action: "registrations_created",
        details: {
          total_requested: results.statistics.totalRequested,
          successful: results.statistics.successful,
          failed: results.statistics.failed,
          success_rate:
            (results.statistics.successful /
              results.statistics.totalRequested) *
            100,
          errors: results.errors,
        },
        admin_user_id: adminUserId,
      });
    } catch (error: any) {
      console.error("Error logging registration creation:", error);
      // Don't throw error as this is just logging
    }
  }
}
