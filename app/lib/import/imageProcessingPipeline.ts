import { GoogleDriveService } from "./googleDriveService";
import { SupabaseStorageService } from "./supabaseStorageService";

export interface ImageProcessingResult {
  success: boolean;
  originalUrl: string;
  processedUrl?: string;
  error?: string;
  metadata?: {
    filename: string;
    size: number;
    mimeType: string;
    uploadedAt: string;
  };
}

export interface ImageProcessingConfig {
  maxFileSize: number; // in bytes
  allowedMimeTypes: string[];
  retryAttempts: number;
  retryDelay: number; // in milliseconds
  supabaseBucket: string;
}

export class ImageProcessingPipeline {
  private googleDriveService: GoogleDriveService;
  private supabaseStorageService: SupabaseStorageService;
  private config: ImageProcessingConfig;

  constructor(
    googleDriveService: GoogleDriveService,
    supabaseStorageService: SupabaseStorageService,
    config: ImageProcessingConfig,
  ) {
    this.googleDriveService = googleDriveService;
    this.supabaseStorageService = supabaseStorageService;
    this.config = config;
  }

  /**
   * Process a single image from Google Drive to Supabase Storage
   */
  async processImage(
    googleDriveUrl: string,
    targetPath: string,
    userId: string,
  ): Promise<ImageProcessingResult> {
    let attempt = 0;
    const maxAttempts = this.config.retryAttempts;

    while (attempt < maxAttempts) {
      try {
        // Step 1: Download from Google Drive
        const downloadResult =
          await this.downloadFromGoogleDrive(googleDriveUrl);
        if (!downloadResult.success) {
          throw new Error(downloadResult.error);
        }

        // Step 2: Validate image
        const validationResult = await this.validateImage(downloadResult.data!);
        if (!validationResult.valid) {
          throw new Error(`Image validation failed: ${validationResult.error}`);
        }

        // Step 3: Upload to Supabase Storage
        const uploadResult = await this.uploadToSupabase(
          downloadResult.data!,
          targetPath,
          userId,
        );

        if (uploadResult.success) {
          return {
            success: true,
            originalUrl: googleDriveUrl,
            processedUrl: uploadResult.url,
            metadata: {
              filename: uploadResult.filename || "",
              size: downloadResult.data!.length,
              mimeType: validationResult.mimeType!,
              uploadedAt: new Date().toISOString(),
            },
          };
        } else {
          throw new Error(uploadResult.error);
        }
      } catch (error) {
        attempt++;
        if (attempt >= maxAttempts) {
          return {
            success: false,
            originalUrl: googleDriveUrl,
            error: `Failed after ${maxAttempts} attempts: ${error}`,
          };
        }

        // Wait before retry
        await this.delay(this.config.retryDelay * attempt);
      }
    }

    return {
      success: false,
      originalUrl: googleDriveUrl,
      error: "Maximum retry attempts exceeded",
    };
  }

  /**
   * Process multiple images in parallel with rate limiting
   */
  async processImages(
    imageUrls: Array<{
      url: string;
      type: "profile" | "chamber_card" | "payment_slip";
      userId: string;
    }>,
  ): Promise<ImageProcessingResult[]> {
    const results: ImageProcessingResult[] = [];
    const batchSize = 5; // Process 5 images at a time

    for (let i = 0; i < imageUrls.length; i += batchSize) {
      const batch = imageUrls.slice(i, i + batchSize);
      const batchPromises = batch.map(async (imageData) => {
        const targetPath = this.generateTargetPath(
          imageData.type,
          imageData.userId,
        );
        return await this.processImage(
          imageData.url,
          targetPath,
          imageData.userId,
        );
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Rate limiting: wait between batches
      if (i + batchSize < imageUrls.length) {
        await this.delay(1000); // 1 second between batches
      }
    }

    return results;
  }

  /**
   * Download image from Google Drive
   */
  private async downloadFromGoogleDrive(url: string): Promise<{
    success: boolean;
    data?: Buffer;
    error?: string;
  }> {
    try {
      const fileId = this.extractFileIdFromUrl(url);
      if (!fileId) {
        return {
          success: false,
          error: "Invalid Google Drive URL",
        };
      }

      const fileData = await this.googleDriveService.downloadFile(fileId);
      return {
        success: true,
        data: Buffer.from(fileData.buffer || ""),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to download from Google Drive: ${error}`,
      };
    }
  }

  /**
   * Validate image file
   */
  private async validateImage(data: Buffer): Promise<{
    valid: boolean;
    mimeType?: string;
    error?: string;
  }> {
    try {
      // Check file size
      if (data.length > this.config.maxFileSize) {
        return {
          valid: false,
          error: `File size exceeds limit: ${data.length} > ${this.config.maxFileSize}`,
        };
      }

      // Detect MIME type
      const mimeType = this.detectMimeType(data);
      if (!this.config.allowedMimeTypes.includes(mimeType)) {
        return {
          valid: false,
          error: `Unsupported file type: ${mimeType}`,
        };
      }

      return {
        valid: true,
        mimeType,
      };
    } catch (error) {
      return {
        valid: false,
        error: `Image validation error: ${error}`,
      };
    }
  }

  /**
   * Upload image to Supabase Storage
   */
  private async uploadToSupabase(
    data: Buffer,
    targetPath: string,
    userId: string,
  ): Promise<{
    success: boolean;
    url?: string;
    filename?: string;
    error?: string;
  }> {
    try {
      const result = await this.supabaseStorageService.uploadFile(
        data as any, // FileData type mismatch with Buffer
        targetPath,
        {
          bucket: this.config.supabaseBucket,
          folder: "imports",
          public: false, // Private files, use signed URLs
        } as any,
      );

      return {
        success: true,
        url: result.url,
        filename: (result as any).filename || "",
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to upload to Supabase: ${error}`,
      };
    }
  }

  /**
   * Extract file ID from Google Drive URL
   */
  private extractFileIdFromUrl(url: string): string | null {
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
      /\/open\?id=([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Detect MIME type from file data
   */
  private detectMimeType(data: Buffer): string {
    // Check magic numbers for common image formats
    if (data[0] === 0xff && data[1] === 0xd8) return "image/jpeg";
    if (
      data[0] === 0x89 &&
      data[1] === 0x50 &&
      data[2] === 0x4e &&
      data[3] === 0x47
    )
      return "image/png";
    if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46)
      return "image/gif";
    if (data[0] === 0x42 && data[1] === 0x4d) return "image/bmp";
    if (
      data[0] === 0x52 &&
      data[1] === 0x49 &&
      data[2] === 0x46 &&
      data[3] === 0x46
    )
      return "image/webp";

    return "application/octet-stream";
  }

  /**
   * Generate target path for Supabase Storage
   */
  private generateTargetPath(
    type: "profile" | "chamber_card" | "payment_slip",
    userId: string,
  ): string {
    const timestamp = Date.now();
    const typeMap = {
      profile: "profile-images",
      chamber_card: "chamber-cards",
      payment_slip: "payment-slips",
    };

    return `${typeMap[type]}/${userId}/${timestamp}`;
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(results: ImageProcessingResult[]): {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
    errors: string[];
  } {
    const total = results.length;
    const successful = results.filter((r) => r.success).length;
    const failed = total - successful;
    const successRate = total > 0 ? (successful / total) * 100 : 0;
    const errors = results
      .filter((r) => !r.success)
      .map((r) => r.error)
      .filter(Boolean);

    return {
      total,
      successful,
      failed,
      successRate,
      errors: errors.filter((e): e is string => e !== undefined),
    };
  }
}
