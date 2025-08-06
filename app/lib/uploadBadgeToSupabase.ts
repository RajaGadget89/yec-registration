import { createClient } from '@supabase/supabase-js';
import { validateFilename, ensureFileExtension, generateUniqueFilename } from './filenameUtils';

/**
 * Creates a Supabase client with environment variables
 * @returns Supabase client instance
 */
function createSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Uploads a badge image to Supabase Storage
 * @param buffer - The badge image as a Buffer
 * @param filename - Unique filename for the badge (e.g., 'YEC-123456.png')
 * @returns Promise<string> - Public URL of the uploaded image
 */
export async function uploadBadgeToSupabase(buffer: Buffer, filename: string): Promise<string> {
  const supabase = createSupabaseClient();
  try {
    // Validate input parameters
    if (!buffer || buffer.length === 0) {
      throw new Error('Badge buffer is empty or invalid');
    }

    if (!filename || filename.trim() === '') {
      throw new Error('Filename is required');
    }

    // Validate and sanitize filename
    const validation = validateFilename(filename);
    if (!validation.isValid) {
      throw new Error(`Invalid filename: ${validation.error}`);
    }

    // Generate unique filename if needed and ensure .png extension
    let finalFilename = filename;
    
    // If filename doesn't look unique (no timestamp), generate a unique one
    if (!filename.match(/^\d{13,}-/)) {
      finalFilename = generateUniqueFilename(filename, 'badge');
    }
    
    // Ensure .png extension
    finalFilename = ensureFileExtension(finalFilename, '.png');

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('yec-badges')
      .upload(finalFilename, buffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false // Don't overwrite existing files
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Failed to upload badge: ${error.message}`);
    }

    if (!data?.path) {
      throw new Error('Upload succeeded but no file path returned');
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('yec-badges')
      .getPublicUrl(data.path);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to generate public URL for uploaded badge');
    }

    console.log(`Badge uploaded successfully: ${urlData.publicUrl}`);
    return urlData.publicUrl;

  } catch (error) {
    console.error('Error in uploadBadgeToSupabase:', error);
    
    // Re-throw with descriptive error message
    if (error instanceof Error) {
      throw new Error(`Badge upload failed: ${error.message}`);
    } else {
      throw new Error('Badge upload failed: Unknown error occurred');
    }
  }
}

/**
 * Deletes a badge image from Supabase Storage
 * @param filename - Filename of the badge to delete
 * @returns Promise<boolean> - True if deletion was successful
 */
export async function deleteBadgeFromSupabase(filename: string): Promise<boolean> {
  const supabase = createSupabaseClient();
  
  try {
    // Ensure filename has .png extension
    const finalFilename = filename.endsWith('.png') ? filename : `${filename}.png`;

    const { error } = await supabase.storage
      .from('yec-badges')
      .remove([finalFilename]);

    if (error) {
      console.error('Supabase delete error:', error);
      throw new Error(`Failed to delete badge: ${error.message}`);
    }

    console.log(`Badge deleted successfully: ${finalFilename}`);
    return true;

  } catch (error) {
    console.error('Error in deleteBadgeFromSupabase:', error);
    
    if (error instanceof Error) {
      throw new Error(`Badge deletion failed: ${error.message}`);
    } else {
      throw new Error('Badge deletion failed: Unknown error occurred');
    }
  }
}

/**
 * Checks if a badge exists in Supabase Storage
 * @param filename - Filename of the badge to check
 * @returns Promise<boolean> - True if badge exists
 */
export async function badgeExistsInSupabase(filename: string): Promise<boolean> {
  const supabase = createSupabaseClient();
  
  try {
    // Ensure filename has .png extension
    const finalFilename = filename.endsWith('.png') ? filename : `${filename}.png`;

    const { data, error } = await supabase.storage
      .from('yec-badges')
      .list('', {
        search: finalFilename
      });

    if (error) {
      console.error('Supabase list error:', error);
      return false;
    }

    return data.some(file => file.name === finalFilename);

  } catch (error) {
    console.error('Error in badgeExistsInSupabase:', error);
    return false;
  }
} 