/**
 * CMS Activity Cards API - Individual Activity Card Management
 * Handles GET, PUT, DELETE operations for specific activity cards
 */

import { NextRequest, NextResponse } from 'next/server';
import { withContentManagementGuard } from '../../../../../lib/cms-api-guard';
import { getCurrentUserFromRequest } from '../../../../../lib/auth-utils.server';
import { maybeServiceClient } from '../../../../../lib/supabase/server';
import { z } from 'zod';

const UpdateActivityCardSchema = z.object({
  card_slug: z.string().min(1).max(100).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(500).optional(),
  icon_emoji: z.string().max(10).optional(),
  image_url: z.string().url().optional(),
  detail_page_id: z.string().uuid().optional(),
  display_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional()
});

/**
 * GET /api/admin/cms/activity-cards/[id]
 * Get a specific activity card by ID
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

    const { data: card, error } = await supabase
      .from('cms_activity_cards')
      .select(`
        id,
        page_id,
        card_slug,
        title,
        description,
        icon_emoji,
        image_url,
        detail_page_id,
        display_order,
        is_active,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Activity card not found' }, { status: 404 });
      }
      console.error('Error fetching activity card:', error);
      return NextResponse.json({ error: 'Failed to fetch activity card' }, { status: 500 });
    }

    return NextResponse.json(card);

  } catch (error) {
    console.error('Activity Card GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/cms/activity-cards/[id]
 * Update a specific activity card
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
    const validatedData = UpdateActivityCardSchema.parse(body);

    const supabase = await maybeServiceClient(request);

    // Check if activity card exists
    const { data: existingCard } = await supabase
      .from('cms_activity_cards')
      .select('id, page_id, card_slug')
      .eq('id', id)
      .single();

    if (!existingCard) {
      return NextResponse.json({ error: 'Activity card not found' }, { status: 404 });
    }

    // Check if card_slug is being changed and if it conflicts
    if (validatedData.card_slug) {
      const { data: slugConflict } = await supabase
        .from('cms_activity_cards')
        .select('id')
        .eq('page_id', existingCard.page_id)
        .eq('card_slug', validatedData.card_slug)
        .neq('id', id)
        .single();

      if (slugConflict) {
        return NextResponse.json({ error: 'Activity card with this slug already exists for this page' }, { status: 400 });
      }
    }

    // Check if detail_page_id exists (if provided)
    if (validatedData.detail_page_id) {
      const { data: detailPageExists } = await supabase
        .from('cms_pages')
        .select('id')
        .eq('id', validatedData.detail_page_id)
        .single();

      if (!detailPageExists) {
        return NextResponse.json({ error: 'Detail page not found' }, { status: 404 });
      }
    }

    // Update activity card
    const { data: updatedCard, error } = await supabase
      .from('cms_activity_cards')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating activity card:', error);
      return NextResponse.json({ error: 'Failed to update activity card' }, { status: 500 });
    }

    return NextResponse.json(updatedCard);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    
    console.error('Activity Card PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/cms/activity-cards/[id]
 * Delete a specific activity card
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

    // Check if activity card exists
    const { data: existingCard } = await supabase
      .from('cms_activity_cards')
      .select('id, title')
      .eq('id', id)
      .single();

    if (!existingCard) {
      return NextResponse.json({ error: 'Activity card not found' }, { status: 404 });
    }

    // Delete activity card
    const { error } = await supabase
      .from('cms_activity_cards')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting activity card:', error);
      return NextResponse.json({ error: 'Failed to delete activity card' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Activity card deleted successfully' });

  } catch (error) {
    console.error('Activity Card DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
