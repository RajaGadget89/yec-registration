/**
 * Pre-Registration File Processor
 *
 * Downloads files from Google Drive and uploads them to Supabase Storage
 * BEFORE registration creation, ensuring badge generation can access storage URLs.
 */

import { GoogleDriveService, FileData } from "./googleDriveService";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export interface FileUrlSet {
  chamberCard?: string | null;
  profileImage?: string | null;
  paymentSlip?: string | null;
}

export interface StorageUrlSet {
  chamberCard?: string | null;
  profileImage?: string | null;
  paymentSlip?: string | null;
}

export interface FileProcessingResult {
  success: boolean;
  storageUrls: StorageUrlSet;
  errors: string[];
  processed: number;
  failed: number;
}

export interface TransformedRecordWithFiles {
  id: string;
  transformedData: any;
}

export class PreRegistrationFileProcessor {
  private googleDriveService: GoogleDriveService;
  private supabase: any;

  constructor() {
    this.googleDriveService = new GoogleDriveService();
    this.supabase = getSupabaseServiceClient();
  }

  /**
   * Process files for a batch of registration records
   * This happens BEFORE registration creation
   */
  async processFilesForBatch(
    records: TransformedRecordWithFiles[],
    sessionId: string,
  ): Promise<TransformedRecordWithFiles[]> {
    console.log(`📥 Processing files for ${records.length} registrations...`);

    const updatedRecords: TransformedRecordWithFiles[] = [];
    let totalProcessed = 0;
    let totalFailed = 0;

    for (const record of records) {
      try {
        // Extract Google Drive URLs from transformed data
        const googleDriveUrls: FileUrlSet = {
          chamberCard: record.transformedData.chamber_card_url,
          profileImage: record.transformedData.profile_image_url,
          paymentSlip: record.transformedData.payment_slip_url,
        };

        // Process files and get storage URLs
        const result = await this.processFilesForRegistration(
          googleDriveUrls,
          sessionId,
          record.id,
        );

        // Update record with storage URLs
        record.transformedData.chamber_card_url =
          result.storageUrls.chamberCard;
        record.transformedData.profile_image_url =
          result.storageUrls.profileImage;
        record.transformedData.payment_slip_url =
          result.storageUrls.paymentSlip;

        totalProcessed += result.processed;
        totalFailed += result.failed;

        if (result.errors.length > 0) {
          console.warn(
            `⚠️ Some files failed for record ${record.id}:`,
            result.errors,
          );
        }

        updatedRecords.push(record);
      } catch (error) {
        console.error(
          `❌ Error processing files for record ${record.id}:`,
          error,
        );
        // Continue with null URLs if file processing fails
        record.transformedData.chamber_card_url = null;
        record.transformedData.profile_image_url = null;
        record.transformedData.payment_slip_url = null;
        updatedRecords.push(record);
        totalFailed += 3;
      }
    }

    console.log(
      `✅ File processing complete: ${totalProcessed} succeeded, ${totalFailed} failed`,
    );

    return updatedRecords;
  }

  /**
   * Process files for a single registration
   */
  private async processFilesForRegistration(
    fileUrls: FileUrlSet,
    sessionId: string,
    registrationId: string,
  ): Promise<FileProcessingResult> {
    const storageUrls: StorageUrlSet = {};
    const errors: string[] = [];
    let processed = 0;
    let failed = 0;

    // Process chamber card
    if (fileUrls.chamberCard) {
      const result = await this.processFile(
        fileUrls.chamberCard,
        "chamber-cards",
        sessionId,
        registrationId,
        "tcc",
      );
      if (result.success) {
        storageUrls.chamberCard = result.storagePath;
        processed++;
      } else {
        errors.push(`Chamber card: ${result.error}`);
        storageUrls.chamberCard = null;
        failed++;
      }
    }

    // Process profile image (CRITICAL for badge generation!)
    if (fileUrls.profileImage) {
      const result = await this.processFile(
        fileUrls.profileImage,
        "profile-images",
        sessionId,
        registrationId,
        "profile",
      );
      if (result.success) {
        storageUrls.profileImage = result.storagePath;
        processed++;
      } else {
        errors.push(`Profile image: ${result.error}`);
        storageUrls.profileImage = null;
        failed++;
      }
    }

    // Process payment slip
    if (fileUrls.paymentSlip) {
      const result = await this.processFile(
        fileUrls.paymentSlip,
        "payment-slips",
        sessionId,
        registrationId,
        "slip",
      );
      if (result.success) {
        storageUrls.paymentSlip = result.storagePath;
        processed++;
      } else {
        errors.push(`Payment slip: ${result.error}`);
        storageUrls.paymentSlip = null;
        failed++;
      }
    }

    return {
      success: failed === 0,
      storageUrls,
      errors,
      processed,
      failed,
    };
  }

  /**
   * Process a single file: download from Google Drive and upload to Supabase Storage
   */
  private async processFile(
    googleDriveUrl: string,
    bucket: string,
    sessionId: string,
    registrationId: string,
    filePrefix: string,
  ): Promise<{ success: boolean; storagePath?: string; error?: string }> {
    try {
      console.log(`📥 Downloading ${filePrefix} from Google Drive...`);

      // Download file from Google Drive using OAuth
      const fileData: FileData =
        await this.googleDriveService.downloadFile(googleDriveUrl);

      console.log(
        `✅ Downloaded ${fileData.filename} (${this.formatFileSize(fileData.size)})`,
      );

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (fileData.size > maxSize) {
        throw new Error(
          `File size (${this.formatFileSize(fileData.size)}) exceeds 10MB limit`,
        );
      }

      // Generate flat storage path (no subfolders - as per requirements)
      // Format: {registrationId}_{fileType}_{timestamp}.ext
      const timestamp = Date.now();
      const extension = this.getFileExtension(fileData.filename);
      const storagePath = `${registrationId}_${filePrefix}_${timestamp}${extension}`;

      console.log(`📤 Uploading to ${bucket}/${storagePath}...`);

      // Upload to Supabase Storage
      const { error: uploadError } = await this.supabase.storage
        .from(bucket)
        .upload(storagePath, fileData.buffer, {
          contentType: fileData.contentType,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log(`✅ Uploaded to storage: ${bucket}/${storagePath}`);

      // Return the storage path in the format: "bucket/path"
      // This matches the format expected by badge generation
      return {
        success: true,
        storagePath: `${bucket}/${storagePath}`,
      };
    } catch (error) {
      console.error(`❌ Error processing file:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf(".");
    return lastDot >= 0 ? filename.substring(lastDot) : "";
  }

  /**
   * Format file size in human-readable format
   */
  private formatFileSize(bytes: number): string {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  }

  /**
   * Validate if a string is a Google Drive URL
   */
  isGoogleDriveUrl(url: string | null | undefined): boolean {
    if (!url || typeof url !== "string") return false;
    return url.includes("drive.google.com") || url.includes("docs.google.com");
  }
}
