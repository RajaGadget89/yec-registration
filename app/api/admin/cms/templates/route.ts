/**
 * CMS Templates API - Content Templates Management
 * Handles CRUD operations for content templates with authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { withTemplateManagementGuard } from '../../../../lib/cms-api-guard';
import { getCurrentUserFromRequest } from '../../../../lib/auth-utils.server';
import { maybeServiceClient } from '../../../../lib/supabase/server';
import { z } from 'zod';

// Validation schemas
const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['news', 'activity_card', 'banner', 'page_section']),
  template_data: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    content: z.any().optional(),
    layout: z.string().optional(),
    styling: z.any().optional(),
    metadata: z.any().optional()
  }),
  is_active: z.boolean().default(true)
});

const UpdateTemplateSchema = CreateTemplateSchema.partial();

/**
 * GET /api/admin/cms/templates
 * Get all content templates with filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and permissions
    const guardResponse = await withTemplateManagementGuard(request);
    if (guardResponse) return guardResponse;

    const supabase = await maybeServiceClient(request);
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const type = searchParams.get('type');
    const is_active = searchParams.get('is_active');
    const search = searchParams.get('search');
    
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('cms_templates')
      .select(`
        id,
        name,
        type,
        template_data,
        is_active,
        created_at,
        created_by
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }
    if (is_active !== null) {
      query = query.eq('is_active', is_active === 'true');
    }
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: templates, error, count } = await query;

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    return NextResponse.json({
      templates: templates || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Templates GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/cms/templates
 * Create a new content template
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and permissions
    const guardResponse = await withTemplateManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = CreateTemplateSchema.parse(body);

    const supabase = await maybeServiceClient(request);

    // Check if template with same name and type already exists
    const { data: existingTemplate } = await supabase
      .from('cms_templates')
      .select('id')
      .eq('name', validatedData.name)
      .eq('type', validatedData.type)
      .single();

    if (existingTemplate) {
      return NextResponse.json({ error: 'Template with this name and type already exists' }, { status: 400 });
    }

    // Create new template
    const { data: newTemplate, error } = await supabase
      .from('cms_templates')
      .insert({
        ...validatedData,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    return NextResponse.json(newTemplate, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    
    console.error('Templates POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
