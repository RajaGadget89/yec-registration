import {
  generateUniqueFilename,
  validateFilename,
  ensureFileExtension,
} from "./filenameUtils";
import { getSupabaseServiceClient } from "./supabase-server";
import { getBucketConfig as _getBucketConfig } from "./storage-bucket-setup";

/**
 * Uploads a file to Supabase Storage
 * @param file - The file to upload
 * @param folder - The folder to upload to (e.g., 'profile-images', 'documents')
 * @param filename - Optional custom filename, defaults to timestamp + original name
 * @returns Promise<string> - Public URL of the uploaded file
 */
export async function uploadFileToSupabase(
  file: File,
  folder: string,
  filename?: string,
): Promise<string> {
  const supabase = getSupabaseServiceClient();
  try {
    // Validate input parameters
    if (!file) {
      throw new Error("File is required");
    }

    if (!folder || folder.trim() === "") {
      throw new Error("Folder is required");
    }

    // Validate file against bucket configuration
    const bucketConfig = _getBucketConfig(folder);
    if (!bucketConfig) {
      throw new Error(`Unknown bucket: ${folder}`);
    }

    // Check file size
    if (file.size > bucketConfig.maxFileSize) {
      throw new Error(
        `File size (${file.size} bytes) exceeds maximum allowed size (${bucketConfig.maxFileSize} bytes)`,
      );
    }

    // Check MIME type
    if (!bucketConfig.allowedMimeTypes.includes(file.type)) {
      throw new Error(
        `File type (${file.type}) not allowed. Allowed types: ${bucketConfig.allowedMimeTypes.join(", ")}`,
      );
    }

    // Generate safe and unique filename
    let finalFilename: string;

    if (filename) {
      // Validate provided filename
      const validation = validateFilename(filename);
      if (!validation.isValid) {
        throw new Error(`Invalid filename: ${validation.error}`);
      }
      finalFilename = filename;
    } else {
      // Generate unique filename from original file name
      finalFilename = generateUniqueFilename(file.name);
    }

    // Ensure proper file extension based on file type
    if (file.type.startsWith("image/")) {
      const extension = file.type.split("/")[1];
      finalFilename = ensureFileExtension(finalFilename, extension);
    }

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(folder)
      .upload(finalFilename, file, {
        cacheControl: "3600",
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      console.error("Supabase upload error:", error);

      // Handle specific error types
      if (error.message.includes("duplicate")) {
        throw new Error(
          "File with this name already exists. Please rename your file and try again.",
        );
      } else if (error.message.includes("size")) {
        throw new Error("File size exceeds the maximum allowed limit.");
      } else if (error.message.includes("type")) {
        throw new Error(
          "File type not allowed. Please use JPEG, JPG, or PNG files.",
        );
      } else {
        throw new Error(`Failed to upload file: ${error.message}`);
      }
    }

    if (!data?.path) {
      throw new Error("Upload succeeded but no file path returned");
    }

    // Generate appropriate URL based on bucket type
    if (bucketConfig.public) {
      // For public buckets, use public URL
      const { data: urlData } = supabase.storage
        .from(folder)
        .getPublicUrl(data.path);

      if (!urlData?.publicUrl) {
        throw new Error("Failed to generate public URL for uploaded file");
      }

      console.log(`File uploaded successfully (public): ${urlData.publicUrl}`);
      return urlData.publicUrl;
    } else {
      // For private buckets, return the file path - signed URLs will be generated on-demand
      console.log(`File uploaded successfully (private bucket): ${folder}/${data.path}`);
      return `${folder}/${data.path}`;
    }
  } catch (error) {
    console.error("Error in uploadFileToSupabase:", error);

    // Re-throw with descriptive error message
    if (error instanceof Error) {
      throw new Error(`File upload failed: ${error.message}`);
    } else {
      throw new Error("File upload failed: Unknown error occurred");
    }
  }
}

/**
 * Generates a signed URL for a file in a private bucket
 * @param filePath - The file path (e.g., "profile-images/filename.jpg")
 * @param expirySeconds - URL expiry time in seconds (default: 1 hour)
 * @returns Promise<string> - Signed URL for the file
 */
export async function generateSignedUrl(
  filePath: string,
  expirySeconds: number = 3600
): Promise<string> {
  const supabase = getSupabaseServiceClient();
  
  try {
    // Parse the file path to get bucket and file path
    const [bucket, ...pathParts] = filePath.split('/');
    const filePathInBucket = pathParts.join('/');
    
    if (!bucket || !filePathInBucket) {
      throw new Error(`Invalid file path format: ${filePath}`);
    }
    
    console.log(`[SIGNED_URL] Generating signed URL for: ${bucket}/${filePathInBucket}, expiry: ${expirySeconds}s`);
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePathInBucket, expirySeconds);
    
    if (error) {
      console.error(`[SIGNED_URL] Error generating signed URL:`, error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
    
    if (!data?.signedUrl) {
      throw new Error("No signed URL returned from Supabase");
    }
    
    console.log(`[SIGNED_URL] Generated signed URL successfully`);
    return data.signedUrl;
  } catch (error) {
    console.error(`[SIGNED_URL] Error in generateSignedUrl:`, error);
    throw error;
  }
}

/**
 * Deletes a file from Supabase Storage
 * @param folder - The folder containing the file
 * @param filename - Filename of the file to delete
 * @returns Promise<boolean> - True if deletion was successful
 */
export async function deleteFileFromSupabase(
  folder: string,
  filename: string,
): Promise<boolean> {
  const supabase = getSupabaseServiceClient();

  try {
    const { error } = await supabase.storage.from(folder).remove([filename]);

    if (error) {
      console.error("Supabase delete error:", error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }

    console.log(`File deleted successfully: ${filename}`);
    return true;
  } catch (error) {
    console.error("Error in deleteFileFromSupabase:", error);

    if (error instanceof Error) {
      throw new Error(`File deletion failed: ${error.message}`);
    } else {
      throw new Error("File deletion failed: Unknown error occurred");
    }
  }
}
