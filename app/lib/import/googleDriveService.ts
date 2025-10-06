// import { createClient } from '@supabase/supabase-js';

export interface FileData {
  originalUrl: string;
  filename: string;
  contentType: string;
  size: number;
  buffer: Buffer;
  metadata: FileMetadata;
}

export interface FileMetadata {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  webViewLink?: string;
  webContentLink?: string;
}

export interface ValidationResult {
  success: boolean;
  accessible: string[];
  inaccessible: string[];
  errors: string[];
}

export class GoogleDriveService {
  private apiKey: string;
  private baseUrl = "https://www.googleapis.com/drive/v3";

  constructor() {
    this.apiKey = process.env.GOOGLE_DRIVE_API_KEY || "";
    if (!this.apiKey) {
      console.warn(
        "⚠️ GOOGLE_DRIVE_API_KEY environment variable is not set - Google Drive functionality will be disabled",
      );
    }
  }

  /**
   * Download a file from Google Drive share URL
   */
  async downloadFile(shareUrl: string): Promise<FileData> {
    if (!this.apiKey) {
      throw new Error(
        "GoogleDriveService not available - GOOGLE_DRIVE_API_KEY not configured",
      );
    }
    try {
      // Extract file ID from share URL
      const fileId = this.extractFileId(shareUrl);
      if (!fileId) {
        throw new Error("Invalid Google Drive URL format");
      }

      // Get file metadata first
      const metadata = await this.getFileMetadata(fileId);

      // Download file content
      const response = await fetch(
        `${this.baseUrl}/files/${fileId}?alt=media&key=${this.apiKey}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      return {
        originalUrl: shareUrl,
        filename: metadata.name,
        contentType: metadata.mimeType,
        size: buffer.length,
        buffer,
        metadata,
      };
    } catch (error) {
      console.error("Error downloading file from Google Drive:", error);
      throw new Error(
        `Failed to download file: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Validate access to multiple Google Drive URLs
   */
  async validateAccess(urls: string[]): Promise<ValidationResult> {
    const result: ValidationResult = {
      success: true,
      accessible: [],
      inaccessible: [],
      errors: [],
    };

    for (const url of urls) {
      try {
        const fileId = this.extractFileId(url);
        if (!fileId) {
          result.inaccessible.push(url);
          result.errors.push(`Invalid URL format: ${url}`);
          continue;
        }

        await this.getFileMetadata(fileId);
        result.accessible.push(url);
      } catch (error) {
        result.inaccessible.push(url);
        result.errors.push(
          `Access denied: ${url} - ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    result.success = result.inaccessible.length === 0;
    return result;
  }

  /**
   * Download multiple files in parallel
   */
  async batchDownload(urls: string[]): Promise<FileData[]> {
    const downloadPromises = urls.map((url) =>
      this.downloadFile(url).catch((error) => {
        console.error(`Failed to download ${url}:`, error);
        return null;
      }),
    );

    const results = await Promise.all(downloadPromises);
    return results.filter((file): file is FileData => file !== null);
  }

  /**
   * Get file metadata from Google Drive
   */
  async getFileMetadata(fileId: string): Promise<FileMetadata> {
    try {
      const response = await fetch(
        `${this.baseUrl}/files/${fileId}?key=${this.apiKey}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to get file metadata: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        id: data.id,
        name: data.name,
        mimeType: data.mimeType,
        size: parseInt(data.size) || 0,
        webViewLink: data.webViewLink,
        webContentLink: data.webContentLink,
      };
    } catch (error) {
      console.error("Error getting file metadata:", error);
      throw new Error(
        `Failed to get file metadata: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Extract file ID from Google Drive share URL
   */
  private extractFileId(url: string): string | null {
    try {
      // Handle different Google Drive URL formats
      const patterns = [
        /\/file\/d\/([a-zA-Z0-9_-]+)/, // Standard share URL
        /id=([a-zA-Z0-9_-]+)/, // URL with id parameter
        /\/open\?id=([a-zA-Z0-9_-]+)/, // Open URL format
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          return match[1];
        }
      }

      return null;
    } catch (error) {
      console.error("Error extracting file ID:", error);
      return null;
    }
  }

  /**
   * Validate file type for import requirements
   */
  validateFileType(
    fileData: FileData,
    expectedType: "image" | "document",
  ): boolean {
    const { contentType } = fileData;

    if (expectedType === "image") {
      return contentType.startsWith("image/");
    } else if (expectedType === "document") {
      return (
        contentType.includes("pdf") ||
        contentType.includes("image/") ||
        contentType.includes("application/")
      );
    }

    return false;
  }

  /**
   * Get file size in human readable format
   */
  formatFileSize(bytes: number): string {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  }
}
