/**
 * Open Graph Image Upload Utility
 * Handles uploading images to Supabase public storage for social media sharing
 */

import { getSupabaseClient } from "./supabase";

export interface OGImageUploadResult {
  success: boolean;
  publicUrl?: string;
  error?: string;
}

/**
 * Upload an image file to Supabase public storage for Open Graph use
 * @param file - The image file to upload
 * @param fileName - Optional custom filename (defaults to timestamp-based name)
 * @returns Promise with upload result including public URL
 */
export async function uploadOGImage(
  file: File,
  fileName?: string,
): Promise<OGImageUploadResult> {
  try {
    const supabase = getSupabaseClient();

    // Generate filename if not provided
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop() || "jpg";
    const finalFileName = fileName || `og-image-${timestamp}.${fileExtension}`;
    const filePath = `og-images/${finalFileName}`;

    // Upload to public bucket
    const { error } = await supabase.storage
      .from("public-assets") // Must be a public bucket
      .upload(filePath, file, {
        cacheControl: "3600", // 1 hour cache
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      console.error("Error uploading OG image:", error);
      return {
        success: false,
        error: `Upload failed: ${error.message}`,
      };
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("public-assets")
      .getPublicUrl(filePath);

    return {
      success: true,
      publicUrl: publicUrlData.publicUrl,
    };
  } catch (error) {
    console.error("Error in uploadOGImage:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Validate if a URL is a valid Supabase public storage URL
 * @param url - The URL to validate
 * @returns boolean indicating if the URL is valid
 */
export function isValidSupabasePublicUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.includes("/storage/v1/object/public/");
  } catch {
    return false;
  }
}

/**
 * Get the recommended dimensions for Open Graph images
 */
export const OG_IMAGE_DIMENSIONS = {
  width: 1200,
  height: 630,
  aspectRatio: "1.91:1",
} as const;

/**
 * Validate image dimensions for Open Graph
 * @param file - The image file to validate
 * @returns Promise with validation result
 */
export async function validateOGImageDimensions(file: File): Promise<{
  valid: boolean;
  width?: number;
  height?: number;
  error?: string;
}> {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const _ctx = canvas.getContext("2d");

    img.onload = () => {
      const { width, height } = img;
      const aspectRatio = width / height;
      const expectedRatio =
        OG_IMAGE_DIMENSIONS.width / OG_IMAGE_DIMENSIONS.height;

      if (Math.abs(aspectRatio - expectedRatio) > 0.1) {
        resolve({
          valid: false,
          width,
          height,
          error: `Aspect ratio should be ${OG_IMAGE_DIMENSIONS.aspectRatio}. Current: ${aspectRatio.toFixed(2)}:1`,
        });
      } else {
        resolve({
          valid: true,
          width,
          height,
        });
      }
    };

    img.onerror = () => {
      resolve({
        valid: false,
        error: "Invalid image file",
      });
    };

    // Create object URL for the file
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    // Clean up object URL after validation
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  });
}
