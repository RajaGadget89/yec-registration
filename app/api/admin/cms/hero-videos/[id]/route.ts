/**
 * CMS Hero Videos API - Individual Hero Video Management
 * Handles GET, PUT, DELETE operations for specific hero videos
 */

import { NextRequest, NextResponse } from 'next/server';
import { withContentManagementGuard } from '../../../../../lib/cms-api-guard';
import { getCurrentUserFromRequest } from '../../../../../lib/auth-utils.server';
import { maybeServiceClient } from '../../../../../lib/supabase/server';
import { z } from 'zod';

const UpdateHeroVideoSchema = z.object({
  desktop_video_url: z.string().url().optional(),
  mobile_video_url: z.string().url().optional(),
  fallback_image_url: z.string().url().optional(),
  autoplay: z.boolean().optional(),
  muted: z.boolean().optional(),
  loop: z.boolean().optional()
});

/**
 * GET /api/admin/cms/hero-videos/[id]
 * Get a specific hero video by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const { id } = params;
    const supabase = await maybeServiceClient(request);

    const { data: video, error } = await supabase
      .from('cms_hero_videos')
      .select(`
        id,
        page_id,
        desktop_video_url,
        mobile_video_url,
        fallback_image_url,
        autoplay,
        muted,
        loop,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Hero video not found' }, { status: 404 });
      }
      console.error('Error fetching hero video:', error);
      return NextResponse.json({ error: 'Failed to fetch hero video' }, { status: 500 });
    }

    return NextResponse.json(video);

  } catch (error) {
    console.error('Hero Video GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/cms/hero-videos/[id]
 * Update a specific hero video
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const validatedData = UpdateHeroVideoSchema.parse(body);

    const supabase = await maybeServiceClient(request);

    // Check if hero video exists
    const { data: existingVideo } = await supabase
      .from('cms_hero_videos')
      .select('id, desktop_video_url, mobile_video_url')
      .eq('id', id)
      .single();

    if (!existingVideo) {
      return NextResponse.json({ error: 'Hero video not found' }, { status: 404 });
    }

    // Validate that at least one video URL will remain after update
    const finalDesktopUrl = validatedData.desktop_video_url !== undefined 
      ? validatedData.desktop_video_url 
      : existingVideo.desktop_video_url;
    const finalMobileUrl = validatedData.mobile_video_url !== undefined 
      ? validatedData.mobile_video_url 
      : existingVideo.mobile_video_url;

    if (!finalDesktopUrl && !finalMobileUrl) {
      return NextResponse.json({ error: 'At least one video URL (desktop or mobile) must be provided' }, { status: 400 });
    }

    // Update hero video
    const { data: updatedVideo, error } = await supabase
      .from('cms_hero_videos')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating hero video:', error);
      return NextResponse.json({ error: 'Failed to update hero video' }, { status: 500 });
    }

    return NextResponse.json(updatedVideo);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    
    console.error('Hero Video PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/cms/hero-videos/[id]
 * Delete a specific hero video
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const { id } = params;
    const supabase = await maybeServiceClient(request);

    // Check if hero video exists
    const { data: existingVideo } = await supabase
      .from('cms_hero_videos')
      .select('id, page_id')
      .eq('id', id)
      .single();

    if (!existingVideo) {
      return NextResponse.json({ error: 'Hero video not found' }, { status: 404 });
    }

    // Delete hero video
    const { error } = await supabase
      .from('cms_hero_videos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting hero video:', error);
      return NextResponse.json({ error: 'Failed to delete hero video' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Hero video deleted successfully' });

  } catch (error) {
    console.error('Hero Video DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
