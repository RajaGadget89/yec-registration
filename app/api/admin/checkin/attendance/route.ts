import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '../../../../lib/supabase-server';
import { getCurrentUser } from '../../../../lib/auth-utils.server';
import { isCheckinSystemEnabled } from '../../../../lib/features';
import { logAccess } from '../../../../lib/audit/auditClient';

/**
 * GET /api/admin/checkin/attendance
 * Get attendance statistics and recent check-ins
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = `attendance_stats_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

    // Log access
    await logAccess({
      action: 'checkin.attendance.stats',
      method: 'GET',
      resource: '/api/admin/checkin/attendance',
      result: 'attempting',
      request_id: requestId,
      src_ip: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || undefined,
      latency_ms: Date.now() - startTime,
      meta: { 
        actor: user.email
      }
    });

    const supabase = getSupabaseServiceClient();

    // Get total approved users count (3-dimension approval passed)
    const { count: totalUsers } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');

    // Get total check-ins count
    const { count: totalCheckins } = await supabase
      .from('user_checkins')
      .select('*', { count: 'exact', head: true });

    // Get unique users who have checked in at least once
    const { data: uniqueCheckins } = await supabase
      .from('user_checkins')
      .select('registration_id');
    
    const uniqueCheckedInUsers = uniqueCheckins ? new Set(uniqueCheckins.map(c => c.registration_id)).size : 0;

    // Get First-Sight Badge Distribution (fallback to event type name if business_rule_category doesn't exist)
    let firstSightBadgesIssued = 0;
    try {
      // Try to get badges using business_rule_category first
      const { count: badgesByCategory } = await supabase
        .from('user_checkins')
        .select(`
          id,
          checkin_events!inner(
            event_types!inner(
              name,
              business_rule_category
            )
          )
        `, { count: 'exact', head: true })
        .eq('checkin_events.event_types.business_rule_category', 'ONE_TIME_ONLY');
      
      firstSightBadgesIssued = badgesByCategory || 0;
    } catch (error) {
      // Fallback: Get badges by event type name
      console.log('business_rule_category not available, falling back to event type name');
      const { count: badgesByName } = await supabase
        .from('user_checkins')
        .select(`
          id,
          checkin_events!inner(
            event_types!inner(name)
          )
        `, { count: 'exact', head: true })
        .eq('checkin_events.event_types.name', 'first_sight');
      
      firstSightBadgesIssued = badgesByName || 0;
    }

    // Get attendance by event type with enhanced data (handle missing business_rule_category)
    let attendanceByEvent = null;
    let eventTypeStats: Record<string, { count: number; unique_users: number; business_rule: string }> = {};
    
    try {
      // Try to get data with business_rule_category
      const { data: attendanceData } = await supabase
        .from('user_checkins')
        .select(`
          registration_id,
          checkin_events!inner(
            name,
            event_types!inner(
              name,
              business_rule_category
            )
          )
        `);
      
      attendanceByEvent = attendanceData;
    } catch (error) {
      // Fallback: Get data without business_rule_category
      console.log('business_rule_category not available, using fallback query');
      const { data: attendanceData } = await supabase
        .from('user_checkins')
        .select(`
          registration_id,
          checkin_events!inner(
            name,
            event_types!inner(name)
          )
        `);
      
      attendanceByEvent = attendanceData;
    }

    // Process attendance by event type with enhanced statistics
    if (attendanceByEvent) {
      attendanceByEvent.forEach((checkin: any) => {
        const eventType = checkin.checkin_events?.event_types?.name;
        const businessRule = checkin.checkin_events?.event_types?.business_rule_category || 'UNKNOWN';
        if (eventType) {
          if (!eventTypeStats[eventType]) {
            eventTypeStats[eventType] = { count: 0, unique_users: new Set(), business_rule: businessRule };
          }
          eventTypeStats[eventType].count++;
          eventTypeStats[eventType].unique_users.add(checkin.registration_id);
        }
      });
    }

    // Convert Set to count for unique users
    Object.keys(eventTypeStats).forEach(eventType => {
      eventTypeStats[eventType].unique_users = (eventTypeStats[eventType].unique_users as Set<string>).size;
    });

    // Get recent check-ins
    const { data: recentCheckins } = await supabase
      .from('user_checkins')
      .select(`
        id,
        checkin_time,
        location,
        notes,
        registrations!inner(
          registration_id,
          first_name,
          last_name,
          email
        ),
        checkin_events!inner(
          name
        ),
        admin_users!inner(
          email
        )
      `)
      .order('checkin_time', { ascending: false })
      .limit(50);

    // Format recent check-ins
    const formattedRecentCheckins = recentCheckins?.map((checkin: any) => ({
      id: checkin.id,
      user_name: `${checkin.registrations.first_name} ${checkin.registrations.last_name}`,
      user_email: checkin.registrations.email,
      event_name: checkin.checkin_events.name,
      checkin_time: checkin.checkin_time,
      location: checkin.location,
      notes: checkin.notes,
      checked_by: checkin.admin_users.email,
    })) || [];

    // Get attendance statistics using utility function
    const { data: stats, error: statsError } = await supabase
      .rpc('get_attendance_stats');

    if (statsError) {
      console.warn('Error calling get_attendance_stats function:', statsError);
    }

    // Calculate enhanced attendance metrics
    const overallAttendanceRate = totalUsers ? ((uniqueCheckedInUsers || 0) / totalUsers * 100).toFixed(2) : '0';
    const firstSightAttendanceRate = totalUsers ? ((firstSightBadgesIssued || 0) / totalUsers * 100).toFixed(2) : '0';
    const eventParticipationRate = totalUsers ? ((totalCheckins || 0) / totalUsers * 100).toFixed(2) : '0';

    const response = {
      // Core metrics
      stats: {
        total_approved_users: totalUsers || 0,
        first_sight_badges_issued: firstSightBadgesIssued || 0,
        unique_attendees: uniqueCheckedInUsers || 0,
        total_checkins: totalCheckins || 0,
        overall_attendance_rate: parseFloat(overallAttendanceRate),
        first_sight_attendance_rate: parseFloat(firstSightAttendanceRate),
        event_participation_rate: parseFloat(eventParticipationRate),
        // Event breakdown with enhanced data
        event_participation: Object.entries(eventTypeStats).map(([event_type, data]) => ({
          event_type,
          checkin_count: data.count,
          unique_users: data.unique_users,
          business_rule: data.business_rule
        })),
        // Badge distribution status
        badge_distribution: {
          total_eligible: totalUsers || 0,
          badges_issued: firstSightBadgesIssued || 0,
          pending_issue: Math.max(0, (totalUsers || 0) - (firstSightBadgesIssued || 0)),
          completion_rate: totalUsers ? (((firstSightBadgesIssued || 0) / totalUsers) * 100).toFixed(2) : 0
        }
      },
      recent_checkins: formattedRecentCheckins,
      utility_stats: stats?.[0] || null
    };

    // Log successful access
    await logAccess({
      action: 'checkin.attendance.stats',
      method: 'GET',
      resource: '/api/admin/checkin/attendance',
      result: 'success',
      request_id: requestId,
      src_ip: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || undefined,
      latency_ms: Date.now() - startTime,
      meta: { 
        actor: user.email,
        total_approved_users: totalUsers || 0,
        first_sight_badges_issued: firstSightBadgesIssued || 0,
        unique_attendees: uniqueCheckedInUsers || 0,
        total_checkins: totalCheckins || 0
      }
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching attendance data:', error);

    // Log error
    await logAccess({
      action: 'checkin.attendance.stats',
      method: 'GET',
      resource: '/api/admin/checkin/attendance',
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


