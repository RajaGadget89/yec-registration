import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '../../../../lib/supabase-server';
import { getCurrentUser } from '../../../../lib/auth-utils.server';
import { isCheckinSystemEnabled } from '../../../../lib/features';
import { logAccess } from '../../../../lib/audit/auditClient';

interface AttendanceFilters {
  search?: string;
  eventType?: string;
  dateFrom?: string;
  dateTo?: string;
  province?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * GET /api/admin/checkin/attendance-filtered
 * Get filtered and paginated attendance data
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = `attendance_filtered_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Check feature flag
    if (!isCheckinSystemEnabled()) {
      return NextResponse.json(
        { error: 'Feature not available' },
        { status: 404 }
      );
    }

    // Check authentication
    const user = await getCurrentUser();
    if (!user || !user.is_active) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check authorization (admin, super_admin, or checker_admin)
    if (!['admin', 'super_admin', 'checker_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const filters: AttendanceFilters = {
      search: searchParams.get('search') || undefined,
      eventType: searchParams.get('eventType') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      province: searchParams.get('province') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: Math.min(parseInt(searchParams.get('pageSize') || '20'), 100),
      sortBy: searchParams.get('sortBy') || 'checkin_time',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
    };

    // Log access
    await logAccess({
      action: 'checkin.attendance.filtered',
      method: 'GET',
      resource: '/api/admin/checkin/attendance-filtered',
      result: 'attempting',
      request_id: requestId,
      src_ip: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || undefined,
      latency_ms: Date.now() - startTime,
      meta: { 
        actor: user.email,
        filters: filters
      }
    });

    const supabase = getSupabaseServiceClient();

    // Build the main query for check-ins with filters
    let query = supabase
      .from('user_checkins')
      .select(`
        id,
        checkin_time,
        location,
        notes,
        registration_id,
        registrations!inner(
          registration_id,
          first_name,
          last_name,
          email,
          phone,
          company_name,
          yec_province,
          status
        ),
        checkin_events!inner(
          name,
          event_types!inner(
            name,
            business_rule_category
          )
        ),
        admin_users!inner(
          email
        )
      `);

    // Apply filters
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.or(`registrations.first_name.ilike.${searchTerm},registrations.last_name.ilike.${searchTerm},registrations.email.ilike.${searchTerm},registrations.company_name.ilike.${searchTerm}`);
    }

    if (filters.eventType) {
      query = query.eq('checkin_events.event_types.name', filters.eventType);
    }

    if (filters.dateFrom) {
      query = query.gte('checkin_time', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('checkin_time', filters.dateTo + 'T23:59:59');
    }


    if (filters.province) {
      query = query.eq('registrations.yec_province', filters.province);
    }

    // Apply sorting
    const columnMapping: { [key: string]: string } = {
      checkin_time: 'checkin_time',
      user_name: 'registrations.first_name',
      event_name: 'checkin_events.name',
      location: 'location',
      status: 'registrations.status'
    };

    const dbColumn = columnMapping[filters.sortBy || 'checkin_time'] || 'checkin_time';
    query = query.order(dbColumn, { ascending: filters.sortOrder === 'asc' });

    // Apply pagination
    const from = ((filters.page || 1) - 1) * (filters.pageSize || 20);
    const to = from + (filters.pageSize || 20) - 1;
    query = query.range(from, to);

    // Execute query
    const { data: checkins, error, count } = await query;

    if (error) {
      console.error('Error fetching filtered attendance data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch attendance data' },
        { status: 500 }
      );
    }

    // Get unique event types for filter options
    const { data: eventTypes } = await supabase
      .from('event_types')
      .select('name, business_rule_category')
      .order('name');

    // Get unique provinces for filter options
    const { data: provinces } = await supabase
      .from('registrations')
      .select('yec_province')
      .eq('status', 'approved')
      .not('yec_province', 'is', null);

    const uniqueProvinces = [...new Set(provinces?.map(p => p.yec_province) || [])].sort();

    // Format the response
    const formattedCheckins = checkins?.map((checkin: any) => ({
      id: checkin.id,
      checkin_time: checkin.checkin_time,
      location: checkin.location,
      notes: checkin.notes,
      user_name: `${checkin.registrations.first_name} ${checkin.registrations.last_name}`,
      user_email: checkin.registrations.email,
      user_phone: checkin.registrations.phone,
      company_name: checkin.registrations.company_name,
      province: checkin.registrations.yec_province,
      status: checkin.registrations.status,
      event_name: checkin.checkin_events.name,
      event_type: checkin.checkin_events.event_types.name,
      business_rule: checkin.checkin_events.event_types.business_rule_category,
      checked_by: checkin.admin_users.email
    })) || [];

    const response = {
      checkins: formattedCheckins,
      pagination: {
        page: filters.page || 1,
        pageSize: filters.pageSize || 20,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / (filters.pageSize || 20))
      },
      filters: {
        eventTypes: eventTypes || [],
        provinces: uniqueProvinces
      }
    };

    // Log successful access
    await logAccess({
      action: 'checkin.attendance.filtered',
      method: 'GET',
      resource: '/api/admin/checkin/attendance-filtered',
      result: 'success',
      request_id: requestId,
      src_ip: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || undefined,
      latency_ms: Date.now() - startTime,
      meta: { 
        actor: user.email,
        total_results: count || 0,
        page: filters.page || 1
      }
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in attendance filtered API:', error);

    // Log error
    await logAccess({
      action: 'checkin.attendance.filtered',
      method: 'GET',
      resource: '/api/admin/checkin/attendance-filtered',
      result: 'error',
      request_id: requestId,
      src_ip: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || undefined,
      latency_ms: Date.now() - startTime,
      meta: {
        error: error instanceof Error ? error.message : 'Unknown error',
        actor: 'unknown'
      }
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
