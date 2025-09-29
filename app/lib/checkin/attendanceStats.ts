import { getSupabaseServiceClient } from "../supabase-server";

/**
 * Attendance statistics utility functions
 */
export class AttendanceStats {
  private supabase = getSupabaseServiceClient();

  /**
   * Get comprehensive attendance statistics with enhanced metrics
   */
  async getAttendanceStats() {
    try {
      // Get total approved users count (3-dimension approval passed)
      const { count: totalUsers } = await this.supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved");

      // Get total check-ins count
      const { count: totalCheckins } = await this.supabase
        .from("user_checkins")
        .select("*", { count: "exact", head: true });

      // Get unique users who have checked in at least once
      const { data: uniqueCheckins } = await this.supabase
        .from("user_checkins")
        .select("registration_id");

      const uniqueCheckedInUsers = uniqueCheckins
        ? new Set(uniqueCheckins.map((c) => c.registration_id)).size
        : 0;

      // Get First-Sight Badge Distribution (fallback to event type name if business_rule_category doesn't exist)
      let firstSightBadgesIssued = 0;
      try {
        // Try to get badges using business_rule_category first
        const { count: badgesByCategory } = await this.supabase
          .from("user_checkins")
          .select(
            `
            id,
            checkin_events!inner(
              event_types!inner(
                name,
                business_rule_category
              )
            )
          `,
            { count: "exact", head: true },
          )
          .eq(
            "checkin_events.event_types.business_rule_category",
            "ONE_TIME_ONLY",
          );

        firstSightBadgesIssued = badgesByCategory || 0;
      } catch (_error) {
        // Fallback: Get badges by event type name
        console.log(
          "business_rule_category not available, falling back to event type name",
        );
        const { count: badgesByName } = await this.supabase
          .from("user_checkins")
          .select(
            `
            id,
            checkin_events!inner(
              event_types!inner(name)
            )
          `,
            { count: "exact", head: true },
          )
          .eq("checkin_events.event_types.name", "first_sight");

        firstSightBadgesIssued = badgesByName || 0;
      }

      // Get attendance by event type with enhanced data (handle missing business_rule_category)
      let attendanceByEvent = null;
      const eventTypeStats: Record<
        string,
        { count: number; unique_users: Set<string>; business_rule: string }
      > = {};

      try {
        // Try to get data with business_rule_category
        const { data: attendanceData } = await this.supabase.from(
          "user_checkins",
        ).select(`
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
      } catch (_error) {
        // Fallback: Get data without business_rule_category
        console.log(
          "business_rule_category not available, using fallback query",
        );
        const { data: attendanceData } = await this.supabase.from(
          "user_checkins",
        ).select(`
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
          const businessRule =
            checkin.checkin_events?.event_types?.business_rule_category ||
            "UNKNOWN";
          if (eventType) {
            if (!eventTypeStats[eventType]) {
              eventTypeStats[eventType] = {
                count: 0,
                unique_users: new Set(),
                business_rule: businessRule,
              };
            }
            eventTypeStats[eventType].count++;
            eventTypeStats[eventType].unique_users.add(checkin.registration_id);
          }
        });
      }

      // Convert Set to count for unique users
      const finalEventTypeStats: Record<
        string,
        { count: number; unique_users: number; business_rule: string }
      > = {};
      Object.keys(eventTypeStats).forEach((eventType) => {
        finalEventTypeStats[eventType] = {
          count: eventTypeStats[eventType].count,
          unique_users: eventTypeStats[eventType].unique_users.size,
          business_rule: eventTypeStats[eventType].business_rule,
        };
      });

      // Calculate enhanced attendance metrics
      const overallAttendanceRate = totalUsers
        ? (((uniqueCheckedInUsers || 0) / totalUsers) * 100).toFixed(2)
        : "0";
      const firstSightAttendanceRate = totalUsers
        ? (((firstSightBadgesIssued || 0) / totalUsers) * 100).toFixed(2)
        : "0";
      const eventParticipationRate = totalUsers
        ? (((totalCheckins || 0) / totalUsers) * 100).toFixed(2)
        : "0";

      return {
        // Core metrics
        total_approved_users: totalUsers || 0,
        first_sight_badges_issued: firstSightBadgesIssued || 0,
        unique_attendees: uniqueCheckedInUsers || 0,
        total_checkins: totalCheckins || 0,
        overall_attendance_rate: parseFloat(overallAttendanceRate),
        first_sight_attendance_rate: parseFloat(firstSightAttendanceRate),
        event_participation_rate: parseFloat(eventParticipationRate),
        // Event breakdown with enhanced data
        event_participation: Object.entries(finalEventTypeStats).map(
          ([event_type, data]) => ({
            event_type,
            checkin_count: data.count,
            unique_users: data.unique_users,
            business_rule: data.business_rule,
          }),
        ),
        // Badge distribution status
        badge_distribution: {
          total_eligible: totalUsers || 0,
          badges_issued: firstSightBadgesIssued || 0,
          pending_issue: Math.max(
            0,
            (totalUsers || 0) - (firstSightBadgesIssued || 0),
          ),
          completion_rate: totalUsers
            ? (((firstSightBadgesIssued || 0) / totalUsers) * 100).toFixed(2)
            : 0,
        },
      };
    } catch (error) {
      console.error("Error fetching attendance statistics:", error);
      throw error;
    }
  }

  /**
   * Get attendance by date range
   */
  async getAttendanceByDateRange(startDate: string, endDate: string) {
    try {
      const { data: checkins, error } = await this.supabase
        .from("user_checkins")
        .select(
          `
          checkin_time,
          checkin_events!inner(
            name,
            event_types!inner(name)
          )
        `,
        )
        .gte("checkin_time", startDate)
        .lte("checkin_time", endDate)
        .order("checkin_time", { ascending: true });

      if (error) {
        throw error;
      }

      // Group by date
      const dailyStats: Record<string, number> = {};
      if (checkins) {
        checkins.forEach((checkin: any) => {
          const date = checkin.checkin_time.split("T")[0];
          dailyStats[date] = (dailyStats[date] || 0) + 1;
        });
      }

      return {
        daily_stats: Object.entries(dailyStats).map(([date, count]) => ({
          date,
          count,
        })),
        total_checkins: checkins?.length || 0,
      };
    } catch (error) {
      console.error("Error fetching attendance by date range:", error);
      throw error;
    }
  }

  /**
   * Get attendance by event type
   */
  async getAttendanceByEventType() {
    try {
      const { data: checkins, error } = await this.supabase.from(
        "user_checkins",
      ).select(`
          checkin_events!inner(
            name,
            event_types!inner(name, description)
          )
        `);

      if (error) {
        throw error;
      }

      // Group by event type
      const eventTypeStats: Record<
        string,
        { count: number; events: string[] }
      > = {};
      if (checkins) {
        checkins.forEach((checkin: any) => {
          const eventType = checkin.checkin_events?.event_types?.name;
          const eventName = checkin.checkin_events?.name;

          if (eventType) {
            if (!eventTypeStats[eventType]) {
              eventTypeStats[eventType] = { count: 0, events: [] };
            }
            eventTypeStats[eventType].count++;
            if (
              eventName &&
              !eventTypeStats[eventType].events.includes(eventName)
            ) {
              eventTypeStats[eventType].events.push(eventName);
            }
          }
        });
      }

      return Object.entries(eventTypeStats).map(([event_type, data]) => ({
        event_type,
        count: data.count,
        events: data.events,
      }));
    } catch (error) {
      console.error("Error fetching attendance by event type:", error);
      throw error;
    }
  }

  /**
   * Get user attendance summary
   */
  async getUserAttendanceSummary(registrationId: string) {
    try {
      const { data: checkins, error } = await this.supabase
        .from("user_checkins")
        .select(
          `
          checkin_time,
          checkin_events!inner(
            name,
            event_types!inner(name)
          )
        `,
        )
        .eq("registration_id", registrationId)
        .order("checkin_time", { ascending: true });

      if (error) {
        throw error;
      }

      // Group by event type
      const eventTypeCounts: Record<string, number> = {};
      if (checkins) {
        checkins.forEach((checkin: any) => {
          const eventType = checkin.checkin_events?.event_types?.name;
          if (eventType) {
            eventTypeCounts[eventType] = (eventTypeCounts[eventType] || 0) + 1;
          }
        });
      }

      return {
        total_checkins: checkins?.length || 0,
        first_checkin: checkins?.[0]?.checkin_time,
        last_checkin: checkins?.[checkins.length - 1]?.checkin_time,
        by_event_type: Object.entries(eventTypeCounts).map(
          ([event_type, count]) => ({
            event_type,
            count,
          }),
        ),
      };
    } catch (error) {
      console.error("Error fetching user attendance summary:", error);
      throw error;
    }
  }

  /**
   * Get top attendees
   */
  async getTopAttendees(limit: number = 10) {
    try {
      const { data: checkins, error } = await this.supabase.from(
        "user_checkins",
      ).select(`
          registration_id,
          registrations!inner(
            first_name,
            last_name,
            email
          )
        `);

      if (error) {
        throw error;
      }

      // Count check-ins per user
      const userCounts: Record<string, { count: number; user: any }> = {};
      if (checkins) {
        checkins.forEach((checkin: any) => {
          const registrationId = checkin.registration_id;
          if (!userCounts[registrationId]) {
            userCounts[registrationId] = {
              count: 0,
              user: checkin.registrations,
            };
          }
          userCounts[registrationId].count++;
        });
      }

      // Sort by count and return top attendees
      return Object.entries(userCounts)
        .map(([registrationId, data]) => ({
          registration_id: registrationId,
          full_name: `${data.user.first_name} ${data.user.last_name}`,
          email: data.user.email,
          checkin_count: data.count,
        }))
        .sort((a, b) => b.checkin_count - a.checkin_count)
        .slice(0, limit);
    } catch (error) {
      console.error("Error fetching top attendees:", error);
      throw error;
    }
  }

  /**
   * Get First-Sight Badge Distribution status
   * This is the key metric for tracking how many users received new badge cards
   */
  async getFirstSightBadgeDistribution() {
    try {
      // Get total eligible users (approved registrations)
      const { count: totalEligible } = await this.supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved");

      // Get users who have received First-Sight badges (fallback to event type name if business_rule_category doesn't exist)
      let badgesIssued = 0;
      try {
        // Try to get badges using business_rule_category first
        const { count: badgesByCategory } = await this.supabase
          .from("user_checkins")
          .select(
            `
            id,
            checkin_events!inner(
              event_types!inner(
                business_rule_category
              )
            )
          `,
            { count: "exact", head: true },
          )
          .eq(
            "checkin_events.event_types.business_rule_category",
            "ONE_TIME_ONLY",
          );

        badgesIssued = badgesByCategory || 0;
      } catch (_error) {
        // Fallback: Get badges by event type name
        console.log(
          "business_rule_category not available, falling back to event type name",
        );
        const { count: badgesByName } = await this.supabase
          .from("user_checkins")
          .select(
            `
            id,
            checkin_events!inner(
              event_types!inner(name)
            )
          `,
            { count: "exact", head: true },
          )
          .eq("checkin_events.event_types.name", "first_sight");

        badgesIssued = badgesByName || 0;
      }

      // Get detailed list of users who received badges (handle missing business_rule_category)
      let badgeRecipients = null;
      try {
        // Try to get recipients using business_rule_category first
        const { data: recipientsByCategory } = await this.supabase
          .from("user_checkins")
          .select(
            `
            id,
            checkin_time,
            location,
            notes,
            registrations!inner(
              registration_id,
              first_name,
              last_name,
              email,
              company_name
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
          `,
          )
          .eq(
            "checkin_events.event_types.business_rule_category",
            "ONE_TIME_ONLY",
          )
          .order("checkin_time", { ascending: false });

        badgeRecipients = recipientsByCategory;
      } catch (_error) {
        // Fallback: Get recipients by event type name
        console.log(
          "business_rule_category not available, falling back to event type name for recipients",
        );
        const { data: recipientsByName } = await this.supabase
          .from("user_checkins")
          .select(
            `
            id,
            checkin_time,
            location,
            notes,
            registrations!inner(
              registration_id,
              first_name,
              last_name,
              email,
              company_name
            ),
            checkin_events!inner(
              name,
              event_types!inner(name)
            ),
            admin_users!inner(
              email
            )
          `,
          )
          .eq("checkin_events.event_types.name", "first_sight")
          .order("checkin_time", { ascending: false });

        badgeRecipients = recipientsByName;
      }

      // Get users who haven't received badges yet
      const { data: pendingUsers } = await this.supabase
        .from("registrations")
        .select(
          `
          registration_id,
          first_name,
          last_name,
          email,
          company_name,
          created_at
        `,
        )
        .eq("status", "approved")
        .not(
          "registration_id",
          "in",
          badgeRecipients?.map((r: any) => r.registrations.registration_id) ||
            [],
        );

      return {
        total_eligible: totalEligible || 0,
        badges_issued: badgesIssued || 0,
        pending_issue: (totalEligible || 0) - (badgesIssued || 0),
        completion_rate: totalEligible
          ? (((badgesIssued || 0) / totalEligible) * 100).toFixed(2)
          : 0,
        badge_recipients:
          badgeRecipients?.map((recipient: any) => ({
            registration_id: recipient.registrations.registration_id,
            full_name: `${recipient.registrations.first_name} ${recipient.registrations.last_name}`,
            email: recipient.registrations.email,
            company_name: recipient.registrations.company_name,
            event_name: recipient.checkin_events.name,
            checkin_time: recipient.checkin_time,
            location: recipient.location,
            checked_by: recipient.admin_users.email,
          })) || [],
        pending_users:
          pendingUsers?.map((user: any) => ({
            registration_id: user.registration_id,
            full_name: `${user.first_name} ${user.last_name}`,
            email: user.email,
            company_name: user.company_name,
            registered_at: user.created_at,
          })) || [],
      };
    } catch (error) {
      console.error("Error fetching First-Sight badge distribution:", error);
      throw error;
    }
  }
}
