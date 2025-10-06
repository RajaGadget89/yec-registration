import { createClient } from "@supabase/supabase-js";
import { FileData } from "./googleDriveService";

export interface StorageResult {
  success: boolean;
  path: string;
  url: string;
  signedUrl?: string;
  error?: string;
}

export interface StorageConfig {
  bucket: string;
  folder: string;
  public: boolean;
}

export class SupabaseStorageService {
  private supabase: any;
  private bucket: string;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET || "import-files";
  }

  /**
   * Upload a single file to Supabase storage
   */
  async uploadFile(
    file: FileData,
    path: string,
    config: StorageConfig = {
      bucket: this.bucket,
      folder: "imports",
      public: false,
    },
  ): Promise<StorageResult> {
    try {
      const fullPath = `${config.folder}/${path}`;

      const { data: _data, error } = await this.supabase.storage
        .from(config.bucket)
        .upload(fullPath, file.buffer, {
          contentType: file.contentType,
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Generate public URL or signed URL
      let url: string;
      let signedUrl: string | undefined;

      if (config.public) {
        const { data: publicData } = this.supabase.storage
          .from(config.bucket)
          .getPublicUrl(fullPath);
        url = publicData.publicUrl;
      } else {
        // Generate signed URL for private files
        const { data: signedData, error: signedError } =
          await this.supabase.storage
            .from(config.bucket)
            .createSignedUrl(fullPath, 60 * 60 * 24 * 7); // 7 days expiry

        if (signedError) {
          throw new Error(
            `Failed to generate signed URL: ${signedError.message}`,
          );
        }

        url = signedData.signedUrl;
        signedUrl = signedData.signedUrl;
      }

      return {
        success: true,
        path: fullPath,
        url,
        signedUrl,
      };
    } catch (error) {
      console.error("Error uploading file to Supabase:", error);
      return {
        success: false,
        path: "",
        url: "",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Upload multiple files in parallel
   */
  async batchUpload(
    files: FileData[],
    basePath: string = "imports",
    config: StorageConfig = {
      bucket: this.bucket,
      folder: "imports",
      public: false,
    },
  ): Promise<StorageResult[]> {
    const uploadPromises = files.map((file, index) => {
      const timestamp = Date.now();
      const _extension = this.getFileExtension(file.filename);
      const path = `${basePath}/${timestamp}_${index}_${file.filename}`;

      return this.uploadFile(file, path, config);
    });

    return Promise.all(uploadPromises);
  }

  /**
   * Generate signed URL for existing file
   */
  async generateSignedUrl(
    path: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        throw new Error(`Failed to generate signed URL: ${error.message}`);
      }

      return data.signedUrl;
    } catch (error) {
      console.error("Error generating signed URL:", error);
      throw new Error(
        `Failed to generate signed URL: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(path: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .remove([path]);

      if (error) {
        console.error("Error deleting file:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error deleting file:", error);
      return false;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(path: string): Promise<any> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .list(path.split("/").slice(0, -1).join("/"), {
          search: path.split("/").pop(),
        });

      if (error) {
        throw new Error(`Failed to get file metadata: ${error.message}`);
      }

      return data[0] || null;
    } catch (error) {
      console.error("Error getting file metadata:", error);
      return null;
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(folder: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .list(folder);

      if (error) {
        throw new Error(`Failed to list files: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error("Error listing files:", error);
      return [];
    }
  }

  /**
   * Clean up old import files
   */
  async cleanupOldFiles(olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const { data: files, error } = await this.supabase.storage
        .from(this.bucket)
        .list("imports");

      if (error) {
        throw new Error(`Failed to list files for cleanup: ${error.message}`);
      }

      const filesToDelete =
        files?.filter((file: any) => {
          const fileDate = new Date(file.created_at);
          return fileDate < cutoffDate;
        }) || [];

      if (filesToDelete.length === 0) {
        return 0;
      }

      const { error: deleteError } = await this.supabase.storage
        .from(this.bucket)
        .remove(filesToDelete.map((f: any) => `imports/${f.name}`));

      if (deleteError) {
        throw new Error(`Failed to delete old files: ${deleteError.message}`);
      }

      return filesToDelete.length;
    } catch (error) {
      console.error("Error cleaning up old files:", error);
      return 0;
    }
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf(".");
    return lastDot !== -1 ? filename.substring(lastDot) : "";
  }

  /**
   * Validate file size limits
   */
  validateFileSize(file: FileData, maxSizeMB: number = 10): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{ totalFiles: number; totalSize: number }> {
    try {
      const { data: files, error } = await this.supabase.storage
        .from(this.bucket)
        .list("imports");

      if (error) {
        throw new Error(`Failed to get storage stats: ${error.message}`);
      }

      const totalFiles = files?.length || 0;
      const totalSize =
        files?.reduce(
          (sum: number, file: any) => sum + (file.metadata?.size || 0),
          0,
        ) || 0;

      return { totalFiles, totalSize };
    } catch (error) {
      console.error("Error getting storage stats:", error);
      return { totalFiles: 0, totalSize: 0 };
    }
  }
}
