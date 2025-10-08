/**
 * CMS Media Upload API - File Upload Endpoint
 * Handles file uploads with authentication and validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMediaUploadGuard } from '../../../../../lib/cms-api-guard';
import { getCurrentUserFromRequest } from '../../../../../lib/auth-utils.server';
import { maybeServiceClient } from '../../../../../lib/supabase/server';
import { uploadFileToSupabase } from '../../../../../lib/uploadFileToSupabase';
import { z } from 'zod';

// File validation
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const UploadSchema = z.object({
  alt_text: z.string().max(200).optional(),
  folder: z.string().max(100).default('cms-media')
});

/**
 * POST /api/admin/cms/media/upload
 * Upload a file to the media library
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and permissions
    const guardResponse = await withMediaUploadGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const altText = formData.get('alt_text') as string;
    const folder = formData.get('folder') as string || 'cms-media';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Allowed types: ' + ALLOWED_MIME_TYPES.join(', ') 
      }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
      }, { status: 400 });
    }

    // Validate additional parameters
    const validatedData = UploadSchema.parse({
      alt_text: altText,
      folder: folder
    });

    // Upload file to Supabase Storage
    const uploadResult = await uploadFileToSupabase(file, validatedData.folder);
    
    if (!uploadResult.success) {
      console.error('File upload failed:', uploadResult.error);
      return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
    }

    // Save media record to database
    const supabase = await maybeServiceClient(request);
    const { data: mediaRecord, error } = await supabase
      .from('cms_media')
      .insert({
        filename: uploadResult.filename,
        original_filename: file.name,
        file_path: uploadResult.path,
        file_size: file.size,
        mime_type: file.type,
        alt_text: validatedData.alt_text,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving media record:', error);
      return NextResponse.json({ error: 'Failed to save media record' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      media: mediaRecord,
      url: uploadResult.url
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    
    console.error('Media upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
