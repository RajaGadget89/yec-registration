import { GoogleDriveService } from "./googleDriveService";
import { SupabaseStorageService } from "./supabaseStorageService";

export interface ProcessingResult {
  success: boolean;
  processedFiles: ProcessedFile[];
  errors: ProcessingError[];
  totalSize: number;
}

export interface ProcessedFile {
  originalUrl: string;
  storagePath: string;
  storageUrl: string;
  signedUrl?: string;
  fileType: "tcc_card" | "profile_image" | "payment_slip";
  size: number;
  contentType: string;
}

export interface ProcessingError {
  originalUrl: string;
  error: string;
  fileType: "tcc_card" | "profile_image" | "payment_slip";
}

export interface FileUrls {
  tccCardUrl?: string;
  profileImageUrl?: string;
  paymentSlipUrl?: string;
}

export class FileProcessingPipeline {
  private googleDriveService: GoogleDriveService;
  private supabaseStorageService: SupabaseStorageService;

  constructor() {
    this.googleDriveService = new GoogleDriveService();
    this.supabaseStorageService = new SupabaseStorageService();
  }

  /**
   * Process all files for a single registration record
   */
  async processRegistrationFiles(
    fileUrls: FileUrls,
    registrationId: string,
    sessionId: string,
  ): Promise<ProcessingResult> {
    const processedFiles: ProcessedFile[] = [];
    const errors: ProcessingError[] = [];
    let totalSize = 0;

    // Process TCC card
    if (fileUrls.tccCardUrl) {
      try {
        const result = await this.processFile(
          fileUrls.tccCardUrl,
          "tcc_card",
          registrationId,
          sessionId,
        );

        if (result.success) {
          processedFiles.push(result.file!);
          totalSize += result.file!.size;
        } else {
          errors.push({
            originalUrl: fileUrls.tccCardUrl,
            error: result.error!,
            fileType: "tcc_card",
          });
        }
      } catch (error) {
        errors.push({
          originalUrl: fileUrls.tccCardUrl,
          error: error instanceof Error ? error.message : "Unknown error",
          fileType: "tcc_card",
        });
      }
    }

    // Process profile image
    if (fileUrls.profileImageUrl) {
      try {
        const result = await this.processFile(
          fileUrls.profileImageUrl,
          "profile_image",
          registrationId,
          sessionId,
        );

        if (result.success) {
          processedFiles.push(result.file!);
          totalSize += result.file!.size;
        } else {
          errors.push({
            originalUrl: fileUrls.profileImageUrl,
            error: result.error!,
            fileType: "profile_image",
          });
        }
      } catch (error) {
        errors.push({
          originalUrl: fileUrls.profileImageUrl,
          error: error instanceof Error ? error.message : "Unknown error",
          fileType: "profile_image",
        });
      }
    }

    // Process payment slip
    if (fileUrls.paymentSlipUrl) {
      try {
        const result = await this.processFile(
          fileUrls.paymentSlipUrl,
          "payment_slip",
          registrationId,
          sessionId,
        );

        if (result.success) {
          processedFiles.push(result.file!);
          totalSize += result.file!.size;
        } else {
          errors.push({
            originalUrl: fileUrls.paymentSlipUrl,
            error: result.error!,
            fileType: "payment_slip",
          });
        }
      } catch (error) {
        errors.push({
          originalUrl: fileUrls.paymentSlipUrl,
          error: error instanceof Error ? error.message : "Unknown error",
          fileType: "payment_slip",
        });
      }
    }

    return {
      success: errors.length === 0,
      processedFiles,
      errors,
      totalSize,
    };
  }

  /**
   * Process a single file
   */
  private async processFile(
    url: string,
    fileType: "tcc_card" | "profile_image" | "payment_slip",
    registrationId: string,
    sessionId: string,
  ): Promise<{ success: boolean; file?: ProcessedFile; error?: string }> {
    try {
      // Download file from Google Drive
      const fileData = await this.googleDriveService.downloadFile(url);

      // Validate file type
      const expectedType = fileType === "profile_image" ? "image" : "document";
      if (!this.googleDriveService.validateFileType(fileData, expectedType)) {
        throw new Error(
          `Invalid file type for ${fileType}. Expected ${expectedType}`,
        );
      }

      // Validate file size (10MB limit)
      if (!this.supabaseStorageService.validateFileSize(fileData, 10)) {
        throw new Error(`File size exceeds 10MB limit for ${fileType}`);
      }

      // Generate storage path
      const timestamp = Date.now();
      const extension = this.getFileExtension(fileData.filename);
      const storagePath = `imports/${sessionId}/${registrationId}/${fileType}_${timestamp}${extension}`;

      // Upload to Supabase storage
      const uploadResult = await this.supabaseStorageService.uploadFile(
        fileData,
        storagePath,
        {
          bucket: process.env.SUPABASE_STORAGE_BUCKET || "import-files",
          folder: "imports",
          public: false,
        },
      );

      if (!uploadResult.success) {
        throw new Error(`Upload failed: ${uploadResult.error}`);
      }

      return {
        success: true,
        file: {
          originalUrl: url,
          storagePath: uploadResult.path,
          storageUrl: uploadResult.url,
          signedUrl: uploadResult.signedUrl,
          fileType,
          size: fileData.size,
          contentType: fileData.contentType,
        },
      };
    } catch (error) {
      console.error(`Error processing ${fileType} file:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Process multiple registrations in batch
   */
  async processBatchFiles(
    registrations: Array<{ id: string; fileUrls: FileUrls }>,
    sessionId: string,
  ): Promise<ProcessingResult[]> {
    const batchPromises = registrations.map((registration) =>
      this.processRegistrationFiles(
        registration.fileUrls,
        registration.id,
        sessionId,
      ),
    );

    return Promise.all(batchPromises);
  }

  /**
   * Validate all file URLs before processing
   */
  async validateFileUrls(fileUrls: FileUrls[]): Promise<{
    valid: string[];
    invalid: string[];
    errors: string[];
  }> {
    const allUrls = fileUrls
      .flatMap((urls) => [
        urls.tccCardUrl,
        urls.profileImageUrl,
        urls.paymentSlipUrl,
      ])
      .filter(Boolean) as string[];

    const validationResult =
      await this.googleDriveService.validateAccess(allUrls);

    return {
      valid: validationResult.accessible,
      invalid: validationResult.inaccessible,
      errors: validationResult.errors,
    };
  }

  /**
   * Clean up failed file uploads
   */
  async cleanupFailedUploads(
    processedFiles: ProcessedFile[],
    errors: ProcessingError[],
  ): Promise<number> {
    let cleanedUp = 0;

    // Clean up files that were uploaded but processing failed
    for (const file of processedFiles) {
      try {
        const success = await this.supabaseStorageService.deleteFile(
          file.storagePath,
        );
        if (success) {
          cleanedUp++;
        }
      } catch (error) {
        console.error(`Error cleaning up file ${file.storagePath}:`, error);
      }
    }

    return cleanedUp;
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf(".");
    return lastDot !== -1 ? filename.substring(lastDot) : "";
  }

  /**
   * Generate file processing report
   */
  generateProcessingReport(results: ProcessingResult[]): {
    totalFiles: number;
    successfulFiles: number;
    failedFiles: number;
    totalSize: number;
    errors: ProcessingError[];
  } {
    const totalFiles = results.reduce(
      (sum, result) => sum + result.processedFiles.length,
      0,
    );
    const successfulFiles = results.filter((r) => r.success).length;
    const failedFiles = results.filter((r) => !r.success).length;
    const totalSize = results.reduce(
      (sum, result) => sum + result.totalSize,
      0,
    );
    const errors = results.flatMap((result) => result.errors);

    return {
      totalFiles,
      successfulFiles,
      failedFiles,
      totalSize,
      errors,
    };
  }
}
