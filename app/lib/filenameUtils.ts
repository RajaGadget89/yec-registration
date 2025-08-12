import { v4 as uuidv4 } from 'uuid';

/**
 * Sanitizes a filename to be safe for file systems and URLs
 * @param filename - The original filename to sanitize
 * @returns A safe filename with unsafe characters replaced
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return '';
  
  // Handle path traversal attempts - extract only the filename
  let cleanFilename = filename;
  // Check if this looks like a path traversal attempt (contains multiple dots or slashes)
  const isPathTraversal = filename.includes('..') || (filename.includes('/') && filename.split('/').length > 2);
  if (isPathTraversal) {
    // Extract the last part after any path separators
    const parts = filename.split(/[/\\]/);
    // For path traversal, keep the last two parts (e.g., "etc/passwd" -> "etc_passwd")
    if (parts.length >= 2) {
      cleanFilename = parts.slice(-2).join('_');
    } else {
      cleanFilename = parts[parts.length - 1];
    }
  }
  
  // Remove file extension for processing
  const lastDotIndex = cleanFilename.lastIndexOf('.');
  const name = lastDotIndex > 0 ? cleanFilename.substring(0, lastDotIndex) : cleanFilename;
  const extension = lastDotIndex > 0 ? cleanFilename.substring(lastDotIndex) : '';
  
  // Replace unsafe characters with underscores
  let sanitized = name
    // Replace spaces with underscores
    .replace(/\s+/g, '_')
    // Replace unsafe characters (including parentheses) with underscores
    .replace(/[<>:"|?*\\/()]/g, '_')
    // Replace multiple underscores with single underscore
    .replace(/_+/g, '_')
    // Remove leading/trailing underscores
    .replace(/^_+|_+$/g, '')
    // Convert to lowercase for consistency
    .toLowerCase();
  
  // Limit length to prevent issues (but preserve the structure)
  if (sanitized.length > 50) {
    sanitized = sanitized.substring(0, 50);
  }
  
  // If sanitized name is empty, use 'file'
  if (!sanitized) {
    sanitized = 'file';
  }
  
  // Convert extension to lowercase
  const lowerExtension = extension.toLowerCase();
  
  return sanitized + lowerExtension;
}

/**
 * Generates a unique filename with timestamp and random suffix
 * @param originalFilename - The original filename (optional)
 * @param prefix - Optional prefix for the filename
 * @returns A unique, safe filename
 */
export function generateUniqueFilename(originalFilename?: string, prefix?: string): string {
  const timestamp = Date.now();
  const randomSuffix = uuidv4().substring(0, 8); // Use first 8 chars of UUID
  
  let filename = '';
  
  if (originalFilename) {
    // Sanitize the original filename
    const sanitized = sanitizeFilename(originalFilename);
    filename = `${timestamp}-${randomSuffix}-${sanitized}`;
  } else {
    filename = `${timestamp}-${randomSuffix}`;
  }
  
  // Add prefix if provided
  if (prefix) {
    filename = `${prefix}-${filename}`;
  }
  
  return filename;
}

/**
 * Validates if a filename is safe for upload
 * @param filename - The filename to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateFilename(filename: string): { isValid: boolean; error?: string } {
  if (!filename || filename.trim() === '') {
    return { isValid: false, error: 'Filename cannot be empty' };
  }
  
  if (filename.length > 255) {
    return { isValid: false, error: 'Filename too long (max 255 characters)' };
  }
  
  // Check for spaces
  if (filename.includes(' ')) {
    return { isValid: false, error: 'Filename cannot contain spaces' };
  }
  
  // Check for unsafe characters
  const unsafeChars = /[<>:"|?*\\/]/;
  if (unsafeChars.test(filename)) {
    return { isValid: false, error: 'Filename contains unsafe characters' };
  }
  
  // Check for path traversal attempts
  if (filename.includes('..') || filename.includes('./') || filename.includes('/')) {
    return { isValid: false, error: 'Filename contains path traversal characters' };
  }
  
  return { isValid: true };
}

/**
 * Ensures a filename has the correct extension
 * @param filename - The filename to check
 * @param expectedExtension - The expected extension (e.g., '.png', '.jpg')
 * @returns Filename with correct extension
 */
export function ensureFileExtension(filename: string, expectedExtension: string): string {
  if (!filename) return '';
  
  // Normalize extension (remove dot if present, then add it)
  const normalizedExt = expectedExtension.startsWith('.') ? expectedExtension : `.${expectedExtension}`;
  
  // Check if filename already has any extension
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex > 0) {
    // File already has an extension, return as is
    return filename;
  }
  
  // Add extension if missing
  return `${filename}${normalizedExt}`;
} 