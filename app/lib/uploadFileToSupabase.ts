import { createClient } from '@supabase/supabase-js';
import { generateUniqueFilename, validateFilename, ensureFileExtension } from './filenameUtils';

/**
 * Creates a Supabase client with environment variables
 * @returns Supabase client instance
 */
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

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
  filename?: string
): Promise<string> {
  const supabase = createSupabaseClient();
  try {
    // Validate input parameters
    if (!file) {
      throw new Error('File is required');
    }

    if (!folder || folder.trim() === '') {
      throw new Error('Folder is required');
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
    if (file.type.startsWith('image/')) {
      const extension = file.type.split('/')[1];
      finalFilename = ensureFileExtension(finalFilename, extension);
    }

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(folder)
      .upload(finalFilename, file, {
        cacheControl: '3600',
        upsert: false // Don't overwrite existing files
      });

    if (error) {
      console.error('Supabase upload error:', error);
      
      // Handle specific error types
      if (error.message.includes('duplicate')) {
        throw new Error('File with this name already exists. Please rename your file and try again.');
      } else if (error.message.includes('size')) {
        throw new Error('File size exceeds the maximum allowed limit.');
      } else if (error.message.includes('type')) {
        throw new Error('File type not allowed. Please use JPEG, JPG, or PNG files.');
      } else {
        throw new Error(`Failed to upload file: ${error.message}`);
      }
    }

    if (!data?.path) {
      throw new Error('Upload succeeded but no file path returned');
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from(folder)
      .getPublicUrl(data.path);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to generate public URL for uploaded file');
    }

    console.log(`File uploaded successfully: ${urlData.publicUrl}`);
    return urlData.publicUrl;

  } catch (error) {
    console.error('Error in uploadFileToSupabase:', error);
    
    // Re-throw with descriptive error message
    if (error instanceof Error) {
      throw new Error(`File upload failed: ${error.message}`);
    } else {
      throw new Error('File upload failed: Unknown error occurred');
    }
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
  filename: string
): Promise<boolean> {
  const supabase = createSupabaseClient();
  
  try {
    const { error } = await supabase.storage
      .from(folder)
      .remove([filename]);

    if (error) {
      console.error('Supabase delete error:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }

    console.log(`File deleted successfully: ${filename}`);
    return true;

  } catch (error) {
    console.error('Error in deleteFileFromSupabase:', error);
    
    if (error instanceof Error) {
      throw new Error(`File deletion failed: ${error.message}`);
    } else {
      throw new Error('File deletion failed: Unknown error occurred');
    }
  }
} 