/**
 * CMS Media API - Media Library Management
 * Handles media file operations with authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMediaUploadGuard } from '../../../../lib/cms-api-guard';
import { getCurrentUserFromRequest } from '../../../../lib/auth-utils.server';
import { maybeServiceClient } from '../../../../lib/supabase/server';
import { z } from 'zod';

// Validation schemas
const MediaSearchSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
  search: z.string().optional(),
  mime_type: z.string().optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional()
});

/**
 * GET /api/admin/cms/media
 * Get media library with search and filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and permissions
    const guardResponse = await withMediaUploadGuard(request);
    if (guardResponse) return guardResponse;

    const supabase = await maybeServiceClient(request);
    const { searchParams } = new URL(request.url);
    
    const validatedParams = MediaSearchSchema.parse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '10',
      search: searchParams.get('search'),
      mime_type: searchParams.get('mime_type'),
      created_after: searchParams.get('created_after'),
      created_before: searchParams.get('created_before')
    });

    const offset = (validatedParams.page - 1) * validatedParams.limit;

    // Build query
    let query = supabase
      .from('cms_media')
      .select(`
        id,
        filename,
        original_filename,
        file_path,
        file_size,
        mime_type,
        alt_text,
        created_at,
        created_by
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + validatedParams.limit - 1);

    // Apply filters
    if (validatedParams.search) {
      query = query.or(`filename.ilike.%${validatedParams.search}%,original_filename.ilike.%${validatedParams.search}%,alt_text.ilike.%${validatedParams.search}%`);
    }
    if (validatedParams.mime_type) {
      query = query.eq('mime_type', validatedParams.mime_type);
    }
    if (validatedParams.created_after) {
      query = query.gte('created_at', validatedParams.created_after);
    }
    if (validatedParams.created_before) {
      query = query.lte('created_at', validatedParams.created_before);
    }

    const { data: media, error, count } = await query;

    if (error) {
      console.error('Error fetching media:', error);
      return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
    }

    return NextResponse.json({
      media: media || [],
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / validatedParams.limit)
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    
    console.error('Media GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
