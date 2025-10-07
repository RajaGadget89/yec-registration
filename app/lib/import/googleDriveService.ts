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

interface OAuthTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token?: string;
}

export class GoogleDriveService {
  private clientId: string;
  private clientSecret: string;
  private refreshToken: string;
  private baseUrl = "https://www.googleapis.com/drive/v3";
  private tokenUrl = "https://oauth2.googleapis.com/token";

  // Token caching
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.clientId = process.env.GOOGLE_DRIVE_CLIENT_ID || "";
    this.clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET || "";
    this.refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || "";

    if (!this.clientId || !this.clientSecret || !this.refreshToken) {
      console.warn(
        "⚠️ Google Drive OAuth credentials not configured - Google Drive functionality will be disabled",
      );
      console.warn(
        "Required: GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN",
      );
    }
  }

  /**
   * Get a valid access token (refresh if expired)
   */
  private async getAccessToken(): Promise<string> {
    // Check if we have a cached token that's still valid
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    // Refresh the token
    try {
      console.log("🔄 Refreshing Google Drive access token...");

      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: "refresh_token",
      });

      const response = await fetch(this.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token refresh failed: ${error}`);
      }

      const data: OAuthTokenResponse = await response.json();

      // Cache the token (subtract 60 seconds for safety margin)
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

      console.log("✅ Access token refreshed successfully");
      return this.accessToken;
    } catch (error) {
      console.error("❌ Failed to refresh access token:", error);
      throw new Error(
        `OAuth token refresh failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Check if OAuth is configured
   */
  private isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret && this.refreshToken);
  }

  /**
   * Download a file from Google Drive share URL
   */
  async downloadFile(shareUrl: string): Promise<FileData> {
    if (!this.isConfigured()) {
      throw new Error(
        "GoogleDriveService not available - OAuth credentials not configured",
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

      // Get access token
      const accessToken = await this.getAccessToken();

      // Download file content using OAuth
      const response = await fetch(
        `${this.baseUrl}/files/${fileId}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to download file: ${response.statusText} - ${errorText}`,
        );
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
      const accessToken = await this.getAccessToken();

      const response = await fetch(
        `${this.baseUrl}/files/${fileId}?fields=id,name,mimeType,size,webViewLink,webContentLink`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to get file metadata: ${response.statusText} - ${errorText}`,
        );
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
