/**
 * CMS Pages API - Individual Page Management
 * Handles GET, PUT, DELETE operations for specific CMS pages
 */

import { NextRequest, NextResponse } from 'next/server';
import { withContentManagementGuard } from '../../../../../lib/cms-api-guard';
import { getCurrentUserFromRequest } from '../../../../../lib/auth-utils.server';
import { maybeServiceClient } from '../../../../../lib/supabase/server';
import { z } from 'zod';

const UpdatePageSchema = z.object({
  slug: z.string().min(1).max(100).optional(),
  title: z.string().min(1).max(200).optional(),
  meta_description: z.string().max(500).optional(),
  language: z.enum(['th', 'en']).optional(),
  is_active: z.boolean().optional()
});

/**
 * GET /api/admin/cms/pages/[id]
 * Get a specific CMS page by ID
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

    const { data: page, error } = await supabase
      .from('cms_pages')
      .select(`
        id,
        slug,
        title,
        meta_description,
        language,
        is_active,
        published_at,
        created_at,
        updated_at,
        created_by,
        updated_by
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Page not found' }, { status: 404 });
      }
      console.error('Error fetching CMS page:', error);
      return NextResponse.json({ error: 'Failed to fetch page' }, { status: 500 });
    }

    return NextResponse.json(page);

  } catch (error) {
    console.error('CMS Page GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/cms/pages/[id]
 * Update a specific CMS page
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
    const validatedData = UpdatePageSchema.parse(body);

    const supabase = await maybeServiceClient(request);

    // Check if page exists
    const { data: existingPage } = await supabase
      .from('cms_pages')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingPage) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Check if slug is being changed and if it conflicts
    if (validatedData.slug) {
      const { data: slugConflict } = await supabase
        .from('cms_pages')
        .select('id')
        .eq('slug', validatedData.slug)
        .neq('id', id)
        .single();

      if (slugConflict) {
        return NextResponse.json({ error: 'Page with this slug already exists' }, { status: 400 });
      }
    }

    // Update page
    const updateData = {
      ...validatedData,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    };

    // Set published_at if page is being activated
    if (validatedData.is_active === true) {
      const { data: currentPage } = await supabase
        .from('cms_pages')
        .select('published_at')
        .eq('id', id)
        .single();
      
      if (!currentPage?.published_at) {
        updateData.published_at = new Date().toISOString();
      }
    }

    const { data: updatedPage, error } = await supabase
      .from('cms_pages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating CMS page:', error);
      return NextResponse.json({ error: 'Failed to update page' }, { status: 500 });
    }

    return NextResponse.json(updatedPage);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    
    console.error('CMS Page PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/cms/pages/[id]
 * Delete a specific CMS page
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

    // Check if page exists
    const { data: existingPage } = await supabase
      .from('cms_pages')
      .select('id, slug')
      .eq('id', id)
      .single();

    if (!existingPage) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Delete page (cascade will handle related records)
    const { error } = await supabase
      .from('cms_pages')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting CMS page:', error);
      return NextResponse.json({ error: 'Failed to delete page' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Page deleted successfully' });

  } catch (error) {
    console.error('CMS Page DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
