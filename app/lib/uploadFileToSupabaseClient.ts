"use client";

import {
  generateUniqueFilename,
  validateFilename,
  ensureFileExtension,
} from "./filenameUtils";
import { getSupabaseClient } from "./supabase";

/**
 * Uploads a file to Supabase Storage using client-side credentials
 * @param file - The file to upload
 * @param folder - The folder to upload to (e.g., 'profile-images', 'documents')
 * @param filename - Optional custom filename, defaults to timestamp + original name
 * @returns Promise<string> - Public URL of the uploaded file
 */
export async function uploadFileToSupabaseClient(
  file: File,
  folder: string,
  filename?: string,
): Promise<string> {
  const supabase = getSupabaseClient();
  try {
    // Validate input parameters
    if (!file) {
      throw new Error("File is required");
    }

    if (!folder || folder.trim() === "") {
      throw new Error("Folder is required");
    }

    // Basic file validation
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    // Check file size
    if (file.size > maxFileSize) {
      throw new Error(
        `File size (${file.size} bytes) exceeds maximum allowed size (${maxFileSize} bytes)`,
      );
    }

    // Check MIME type
    if (!allowedMimeTypes.includes(file.type)) {
      throw new Error(
        `File type (${file.type}) not allowed. Allowed types: ${allowedMimeTypes.join(", ")}`,
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

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from(folder)
      .getPublicUrl(data.path);

    if (!urlData?.publicUrl) {
      throw new Error("Failed to generate public URL for uploaded file");
    }

    return urlData.publicUrl;
  } catch (error) {
    console.error("File upload error:", error);
    throw error;
  }
}
