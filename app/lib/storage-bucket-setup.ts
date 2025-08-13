import { getSupabaseServiceClient } from './supabase-server';

/**
 * Storage bucket configuration for YEC Registration System
 * Phase 0: Foundation Security Implementation
 */

export interface StorageBucketConfig {
  name: string;
  public: boolean;
  allowedMimeTypes: string[];
  maxFileSize: number; // in bytes
  description: string;
}

export const REQUIRED_BUCKETS: StorageBucketConfig[] = [
  {
    name: 'profile-images',
    public: false,
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    description: 'User profile images - private access only'
  },
  {
    name: 'chamber-cards',
    public: false,
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    description: 'Chamber of Commerce membership cards - private access only'
  },
  {
    name: 'payment-slips',
    public: false,
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    description: 'Payment confirmation slips - private access only'
  },
  {
    name: 'yec-badges',
    public: true,
    allowedMimeTypes: ['image/png'],
    maxFileSize: 2 * 1024 * 1024, // 2MB
    description: 'Generated YEC badges - public access for display'
  }
];

/**
 * Verifies that all required storage buckets exist
 * @returns Promise<{exists: boolean, missing: string[], errors: string[]}>
 */
export async function verifyStorageBuckets(): Promise<{
  exists: boolean;
  missing: string[];
  errors: string[];
}> {
  const supabase = getSupabaseServiceClient();
  const missing: string[] = [];
  const errors: string[] = [];

  try {
    // Get list of existing buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      errors.push(`Failed to list buckets: ${listError.message}`);
      return { exists: false, missing: REQUIRED_BUCKETS.map(b => b.name), errors };
    }

    const existingBucketNames = buckets?.map(b => b.name) || [];
    
    // Check each required bucket
    for (const bucketConfig of REQUIRED_BUCKETS) {
      if (!existingBucketNames.includes(bucketConfig.name)) {
        missing.push(bucketConfig.name);
      }
    }

    return {
      exists: missing.length === 0,
      missing,
      errors
    };

  } catch (error) {
    errors.push(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { exists: false, missing: REQUIRED_BUCKETS.map(b => b.name), errors };
  }
}

/**
 * Creates a storage bucket with proper configuration
 * @param bucketConfig - Configuration for the bucket to create
 * @returns Promise<boolean> - True if bucket was created successfully
 */
export async function createStorageBucket(bucketConfig: StorageBucketConfig): Promise<boolean> {
  const supabase = getSupabaseServiceClient();

  try {
    const { error } = await supabase.storage.createBucket(bucketConfig.name, {
      public: bucketConfig.public,
      allowedMimeTypes: bucketConfig.allowedMimeTypes,
      fileSizeLimit: bucketConfig.maxFileSize
    });

    if (error) {
      console.error(`Failed to create bucket ${bucketConfig.name}:`, error);
      return false;
    }

    console.log(`Successfully created bucket: ${bucketConfig.name}`);
    return true;

  } catch (error) {
    console.error(`Error creating bucket ${bucketConfig.name}:`, error);
    return false;
  }
}

/**
 * Creates all missing storage buckets
 * @returns Promise<{success: boolean, created: string[], failed: string[]}>
 */
export async function createMissingBuckets(): Promise<{
  success: boolean;
  created: string[];
  failed: string[];
}> {
  const { missing } = await verifyStorageBuckets();
  const created: string[] = [];
  const failed: string[] = [];

  for (const bucketName of missing) {
    const bucketConfig = REQUIRED_BUCKETS.find(b => b.name === bucketName);
    if (!bucketConfig) {
      failed.push(bucketName);
      continue;
    }

    const success = await createStorageBucket(bucketConfig);
    if (success) {
      created.push(bucketName);
    } else {
      failed.push(bucketName);
    }
  }

  return {
    success: failed.length === 0,
    created,
    failed
  };
}

/**
 * Gets bucket configuration by name
 * @param bucketName - Name of the bucket
 * @returns StorageBucketConfig | undefined
 */
export function getBucketConfig(bucketName: string): StorageBucketConfig | undefined {
  return REQUIRED_BUCKETS.find(b => b.name === bucketName);
}

/**
 * Validates file against bucket configuration
 * @param file - File to validate
 * @param bucketName - Name of the bucket
 * @returns {valid: boolean, error?: string}
 */
export function validateFileForBucket(file: File, bucketName: string): { valid: boolean; error?: string } {
  const bucketConfig = getBucketConfig(bucketName);
  
  if (!bucketConfig) {
    return { valid: false, error: `Unknown bucket: ${bucketName}` };
  }

  // Check file size
  if (file.size > bucketConfig.maxFileSize) {
    return { 
      valid: false, 
      error: `File size (${file.size} bytes) exceeds maximum allowed size (${bucketConfig.maxFileSize} bytes)` 
    };
  }

  // Check MIME type
  if (!bucketConfig.allowedMimeTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: `File type (${file.type}) not allowed. Allowed types: ${bucketConfig.allowedMimeTypes.join(', ')}` 
    };
  }

  return { valid: true };
}

