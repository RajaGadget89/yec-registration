/**
 * CMS Activity Cards API - Activity Cards Management
 * Handles CRUD operations for activity cards with authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { withContentManagementGuard } from '../../../../lib/cms-api-guard';
import { getCurrentUserFromRequest } from '../../../../lib/auth-utils.server';
import { maybeServiceClient } from '../../../../lib/supabase/server';
import { z } from 'zod';

// Validation schemas
const CreateActivityCardSchema = z.object({
  page_id: z.string().uuid(),
  card_slug: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
  icon_emoji: z.string().max(10).optional(),
  image_url: z.string().url().optional(),
  detail_page_id: z.string().uuid().optional(),
  display_order: z.number().int().min(0),
  is_active: z.boolean().default(true)
});

const UpdateActivityCardSchema = CreateActivityCardSchema.partial().omit({ page_id: true });

/**
 * GET /api/admin/cms/activity-cards
 * Get all activity cards with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const supabase = await maybeServiceClient(request);
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const page_id = searchParams.get('page_id');
    const is_active = searchParams.get('is_active');
    
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
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
      .order('display_order', { ascending: true })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (page_id) {
      query = query.eq('page_id', page_id);
    }
    if (is_active !== null) {
      query = query.eq('is_active', is_active === 'true');
    }

    const { data: cards, error, count } = await query;

    if (error) {
      console.error('Error fetching activity cards:', error);
      return NextResponse.json({ error: 'Failed to fetch activity cards' }, { status: 500 });
    }

    return NextResponse.json({
      cards: cards || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Activity Cards GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/cms/activity-cards
 * Create a new activity card
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = CreateActivityCardSchema.parse(body);

    const supabase = await maybeServiceClient(request);

    // Check if page exists
    const { data: pageExists } = await supabase
      .from('cms_pages')
      .select('id')
      .eq('id', validatedData.page_id)
      .single();

    if (!pageExists) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Check if card_slug already exists for this page
    const { data: existingCard } = await supabase
      .from('cms_activity_cards')
      .select('id')
      .eq('page_id', validatedData.page_id)
      .eq('card_slug', validatedData.card_slug)
      .single();

    if (existingCard) {
      return NextResponse.json({ error: 'Activity card with this slug already exists for this page' }, { status: 400 });
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

    // Create new activity card
    const { data: newCard, error } = await supabase
      .from('cms_activity_cards')
      .insert(validatedData)
      .select()
      .single();

    if (error) {
      console.error('Error creating activity card:', error);
      return NextResponse.json({ error: 'Failed to create activity card' }, { status: 500 });
    }

    return NextResponse.json(newCard, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    
    console.error('Activity Cards POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
