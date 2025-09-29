import { getSupabaseServiceClient } from "../supabase-server";

/**
 * Check-in processor for handling check-in operations
 */
export class CheckinProcessor {
  private supabase = getSupabaseServiceClient();

  /**
   * Process a check-in request
   */
  async processCheckin(data: {
    registration_id: string;
    checkin_event_id: string;
    checked_in_by: string;
    location?: string;
    notes?: string;
    metadata?: Record<string, any>;
  }) {
    try {
      // Check for duplicate check-in
      const { data: existingCheckin } = await this.supabase
        .from("user_checkins")
        .select("id, checkin_time")
        .eq("registration_id", data.registration_id)
        .eq("checkin_event_id", data.checkin_event_id)
        .single();

      if (existingCheckin) {
        return {
          success: false,
          error: "User has already checked in to this event",
          checkin_time: existingCheckin.checkin_time,
        };
      }

      // Verify registration exists and is approved
      const { data: registration } = await this.supabase
        .from("registrations")
        .select("first_name, last_name, email, phone, status")
        .eq("registration_id", data.registration_id)
        .single();

      if (!registration) {
        return {
          success: false,
          error: "Registration not found",
        };
      }

      if (registration.status !== "approved") {
        return {
          success: false,
          error: "Registration not approved",
          registration_status: registration.status,
        };
      }

      // Verify event exists and is active
      const { data: event } = await this.supabase
        .from("checkin_events")
        .select("name, location, is_active")
        .eq("id", data.checkin_event_id)
        .single();

      if (!event) {
        return {
          success: false,
          error: "Event not found",
        };
      }

      if (!event.is_active) {
        return {
          success: false,
          error: "Event is not active",
        };
      }

      // Create check-in record
      const { data: checkin, error } = await this.supabase
        .from("user_checkins")
        .insert({
          registration_id: data.registration_id,
          checkin_event_id: data.checkin_event_id,
          checked_in_by: data.checked_in_by,
          location: data.location || event.location,
          notes: data.notes,
          metadata: data.metadata,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        success: true,
        checkin_id: checkin.id,
        user_info: {
          registration_id: data.registration_id,
          full_name: `${registration.first_name} ${registration.last_name}`,
          email: registration.email,
          phone: registration.phone,
        },
        event_info: {
          name: event.name,
          location: data.location || event.location,
        },
        checkin_time: checkin.checkin_time,
      };
    } catch (error) {
      console.error("Error processing check-in:", error);
      return {
        success: false,
        error: "Internal server error",
      };
    }
  }

  /**
   * Get user's check-in history
   */
  async getUserCheckinHistory(registrationId: string) {
    try {
      const { data: checkins, error } = await this.supabase
        .from("user_checkins")
        .select(
          `
          id,
          checkin_time,
          location,
          notes,
          metadata,
          checkin_events!inner(
            name,
            event_types!inner(name, description)
          ),
          admin_users!inner(
            email
          )
        `,
        )
        .eq("registration_id", registrationId)
        .order("checkin_time", { ascending: false });

      if (error) {
        throw error;
      }

      return {
        success: true,
        checkins: checkins || [],
      };
    } catch (error) {
      console.error("Error fetching user check-in history:", error);
      return {
        success: false,
        error: "Internal server error",
      };
    }
  }

  /**
   * Get attendance statistics
   */
  async getAttendanceStats() {
    try {
      // Get total users count
      const { count: totalUsers } = await this.supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved");

      // Get checked-in users count
      const { count: checkedInUsers } = await this.supabase
        .from("user_checkins")
        .select("*", { count: "exact", head: true });

      // Get attendance by event type
      const { data: attendanceByEvent } = await this.supabase.from(
        "user_checkins",
      ).select(`
          checkin_events!inner(
            event_types!inner(name)
          )
        `);

      // Process attendance by event type
      const eventTypeStats: Record<string, number> = {};
      if (attendanceByEvent) {
        attendanceByEvent.forEach((checkin: any) => {
          const eventType = checkin.checkin_events?.event_types?.name;
          if (eventType) {
            eventTypeStats[eventType] = (eventTypeStats[eventType] || 0) + 1;
          }
        });
      }

      return {
        success: true,
        stats: {
          total_users: totalUsers || 0,
          checked_in_users: checkedInUsers || 0,
          attendance_rate: totalUsers
            ? (((checkedInUsers || 0) / totalUsers) * 100).toFixed(2)
            : 0,
          by_event_type: Object.entries(eventTypeStats).map(
            ([event_type, count]) => ({
              event_type,
              count,
            }),
          ),
        },
      };
    } catch (error) {
      console.error("Error fetching attendance statistics:", error);
      return {
        success: false,
        error: "Internal server error",
      };
    }
  }

  /**
   * Get recent check-ins
   */
  async getRecentCheckins(limit: number = 50) {
    try {
      const { data: checkins, error } = await this.supabase
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
            email
          ),
          checkin_events!inner(
            name
          ),
          admin_users!inner(
            email
          )
        `,
        )
        .order("checkin_time", { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return {
        success: true,
        checkins: checkins || [],
      };
    } catch (error) {
      console.error("Error fetching recent check-ins:", error);
      return {
        success: false,
        error: "Internal server error",
      };
    }
  }
}
