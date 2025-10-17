import { getSupabaseServerClient } from "../supabase/server";
import { EventFactory } from "../events/eventFactory";
import { EventService } from "../events/eventService";
import { audit } from "../audit";

export interface FormCheckinPoint {
  id: string;
  form_key: string;
  checkin_event_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CheckinEvent {
  id: string;
  name: string;
  description?: string;
  event_date: string;
  location?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormCheckinConfig {
  form_key: string;
  form_name: string;
  checkin_points: FormCheckinPoint[];
  available_events: CheckinEvent[];
}

export interface CheckinResult {
  success: boolean;
  registration?: any;
  form_type?: string;
  message: string;
  error?: string;
}

export class FormCheckinService {
  private supabase: any;

  constructor() {
    this.supabase = null; // Will be initialized when needed
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await getSupabaseServerClient();
    }
    return this.supabase;
  }

  /**
   * Get check-in configuration for a form
   */
  async getFormCheckinConfig(
    formKey: string,
  ): Promise<FormCheckinConfig | null> {
    try {
      const supabase = await this.getSupabase();

      // Get form type
      const { data: formType, error: formError } = await supabase
        .from("form_types")
        .select("form_key, name")
        .eq("form_key", formKey)
        .eq("is_active", true)
        .single();

      if (formError || !formType) {
        return null;
      }

      // Get check-in points for this form
      const { data: checkinPoints, error: pointsError } = await supabase
        .from("form_checkin_points")
        .select("*")
        .eq("form_key", formKey)
        .eq("is_active", true);

      if (pointsError) {
        console.error("Error fetching check-in points:", pointsError);
      }

      // Get available check-in events
      const { data: availableEvents, error: eventsError } = await supabase
        .from("checkin_events")
        .select("*")
        .eq("is_active", true)
        .order("event_date", { ascending: true });

      if (eventsError) {
        console.error("Error fetching check-in events:", eventsError);
      }

      return {
        form_key: formKey,
        form_name: formType.name,
        checkin_points: checkinPoints || [],
        available_events: availableEvents || [],
      };
    } catch (error) {
      console.error("Error getting form check-in config:", error);
      return null;
    }
  }

  /**
   * Add check-in point to a form
   */
  async addCheckinPoint(
    formKey: string,
    checkinEventId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const supabase = await this.getSupabase();

      // Check if check-in point already exists
      const { data: existing, error: _checkError } = await supabase
        .from("form_checkin_points")
        .select("id")
        .eq("form_key", formKey)
        .eq("checkin_event_id", checkinEventId)
        .single();

      if (existing) {
        return {
          success: false,
          message: "Check-in point already exists for this form and event",
        };
      }

      // Create new check-in point
      const { error: insertError } = await supabase
        .from("form_checkin_points")
        .insert({
          form_key: formKey,
          checkin_event_id: checkinEventId,
          is_active: true,
        });

      if (insertError) {
        console.error("Error creating check-in point:", insertError);
        return {
          success: false,
          message: "Failed to create check-in point",
        };
      }

      // Log audit event
      await audit.logEvent({
        action: "form_checkin_point_added",
        resource: "form_checkin_events",
        resource_id: checkinEventId,
        actor_id: "system",
        actor_role: "system",
        result: "success",
        correlation_id: crypto.randomUUID(),
        meta: {
          form_key: formKey,
          checkin_event_id: checkinEventId,
        },
      });

      return {
        success: true,
        message: "Check-in point added successfully",
      };
    } catch (error) {
      console.error("Error adding check-in point:", error);
      return {
        success: false,
        message: "Error adding check-in point",
      };
    }
  }

  /**
   * Remove check-in point from a form
   */
  async removeCheckinPoint(
    formKey: string,
    checkinEventId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const supabase = await this.getSupabase();

      // Deactivate check-in point
      const { error: updateError } = await supabase
        .from("form_checkin_points")
        .update({ is_active: false })
        .eq("form_key", formKey)
        .eq("checkin_event_id", checkinEventId);

      if (updateError) {
        console.error("Error removing check-in point:", updateError);
        return {
          success: false,
          message: "Failed to remove check-in point",
        };
      }

      // Log audit event
      await audit.logEvent({
        action: "form_checkin_point_removed",
        resource: "form_checkin_events",
        resource_id: checkinEventId,
        actor_id: "system",
        actor_role: "system",
        result: "success",
        correlation_id: crypto.randomUUID(),
        meta: {
          form_key: formKey,
          checkin_event_id: checkinEventId,
        },
      });

      return {
        success: true,
        message: "Check-in point removed successfully",
      };
    } catch (error) {
      console.error("Error removing check-in point:", error);
      return {
        success: false,
        message: "Error removing check-in point",
      };
    }
  }

  /**
   * Check-in a registration by tracking ID
   */
  async checkinRegistration(
    trackingId: string,
    checkinEventId: string,
    checkerId: string,
  ): Promise<CheckinResult> {
    try {
      const supabase = await this.getSupabase();

      // First, try to find in form_registrations
      const { data: formRegistration, error: formError } = await supabase
        .from("form_registrations")
        .select("*")
        .eq("tracking_id", trackingId)
        .eq("is_active", true)
        .single();

      if (formRegistration && !formError) {
        // Check if this form has the check-in point configured
        const { data: checkinPoint, error: pointError } = await supabase
          .from("form_checkin_points")
          .select("*")
          .eq("form_key", formRegistration.form_key)
          .eq("checkin_event_id", checkinEventId)
          .eq("is_active", true)
          .single();

        if (pointError || !checkinPoint) {
          return {
            success: false,
            message: "Check-in point not configured for this form",
            error: "Form not configured for this check-in event",
          };
        }

        // Check if already checked in
        const { data: existingCheckin, error: checkinError } = await supabase
          .from("form_checkins")
          .select("*")
          .eq("registration_id", formRegistration.id)
          .eq("checkin_event_id", checkinEventId)
          .single();

        if (existingCheckin && !checkinError) {
          return {
            success: false,
            message: "Registration already checked in for this event",
            error: "Already checked in",
          };
        }

        // Create check-in record
        const { error: insertError } = await supabase
          .from("form_checkins")
          .insert({
            registration_id: formRegistration.id,
            form_key: formRegistration.form_key,
            checkin_event_id: checkinEventId,
            checked_in_by: checkerId,
            checked_in_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error("Error creating form check-in:", insertError);
          return {
            success: false,
            message: "Failed to record check-in",
            error: "Database error",
          };
        }

        // Emit check-in event
        await EventService.emit(
          EventFactory.createCheckinCompleted({
            applicationId: formRegistration.id,
            checkinEventId: checkinEventId,
            correlationId: crypto.randomUUID(),
          }),
        );

        return {
          success: true,
          registration: formRegistration,
          form_type: "form_registration",
          message: "Successfully checked in",
        };
      }

      // If not found in form_registrations, try traditional registrations
      const { data: traditionalRegistration, error: traditionalError } =
        await supabase
          .from("registrations")
          .select("*")
          .eq("tracking_id", trackingId)
          .eq("is_active", true)
          .single();

      if (traditionalRegistration && !traditionalError) {
        // Check if already checked in for traditional system
        const { data: existingCheckin, error: checkinError } = await supabase
          .from("checkins")
          .select("*")
          .eq("registration_id", traditionalRegistration.id)
          .eq("checkin_event_id", checkinEventId)
          .single();

        if (existingCheckin && !checkinError) {
          return {
            success: false,
            message: "Registration already checked in for this event",
            error: "Already checked in",
          };
        }

        // Create traditional check-in record
        const { error: insertError } = await supabase.from("checkins").insert({
          registration_id: traditionalRegistration.id,
          checkin_event_id: checkinEventId,
          checked_in_by: checkerId,
          checked_in_at: new Date().toISOString(),
        });

        if (insertError) {
          console.error("Error creating traditional check-in:", insertError);
          return {
            success: false,
            message: "Failed to record check-in",
            error: "Database error",
          };
        }

        // Emit check-in event
        await EventService.emit(
          EventFactory.createCheckinCompleted({
            applicationId: traditionalRegistration.id,
            checkinEventId: checkinEventId,
            correlationId: crypto.randomUUID(),
          }),
        );

        return {
          success: true,
          registration: traditionalRegistration,
          form_type: "traditional",
          message: "Successfully checked in",
        };
      }

      return {
        success: false,
        message: "Registration not found",
        error: "Invalid tracking ID",
      };
    } catch (error) {
      console.error("Error checking in registration:", error);
      return {
        success: false,
        message: "Error checking in registration",
        error: "System error",
      };
    }
  }

  /**
   * Get check-in statistics for a form
   */
  async getCheckinStats(formKey: string): Promise<{
    total_registrations: number;
    checked_in: number;
    not_checked_in: number;
    checkin_rate: number;
    by_event: Record<string, { total: number; checked_in: number }>;
  }> {
    try {
      const supabase = await this.getSupabase();

      // Get total registrations for the form
      const { count: totalRegistrations, error: totalError } = await supabase
        .from("form_registrations")
        .select("*", { count: "exact", head: true })
        .eq("form_key", formKey)
        .eq("is_active", true);

      if (totalError) {
        console.error("Error getting total registrations:", totalError);
      }

      // Get check-in points for this form
      const { data: checkinPoints, error: pointsError } = await supabase
        .from("form_checkin_points")
        .select("checkin_event_id")
        .eq("form_key", formKey)
        .eq("is_active", true);

      if (pointsError) {
        console.error("Error getting check-in points:", pointsError);
      }

      const eventIds = checkinPoints?.map((p: any) => p.checkin_event_id) || [];
      let checkedIn = 0;
      const byEvent: Record<string, { total: number; checked_in: number }> = {};

      // Get check-in statistics for each event
      for (const eventId of eventIds) {
        const { count: eventCheckedIn, error: eventError } = await supabase
          .from("form_checkins")
          .select("*", { count: "exact", head: true })
          .eq("form_key", formKey)
          .eq("checkin_event_id", eventId);

        if (!eventError) {
          checkedIn += eventCheckedIn || 0;
          byEvent[eventId] = {
            total: totalRegistrations || 0,
            checked_in: eventCheckedIn || 0,
          };
        }
      }

      const total = totalRegistrations || 0;
      const notCheckedIn = total - checkedIn;
      const checkinRate =
        total > 0 ? Math.round((checkedIn / total) * 100 * 100) / 100 : 0;

      return {
        total_registrations: total,
        checked_in: checkedIn,
        not_checked_in: notCheckedIn,
        checkin_rate: checkinRate,
        by_event: byEvent,
      };
    } catch (error) {
      console.error("Error getting check-in stats:", error);
      return {
        total_registrations: 0,
        checked_in: 0,
        not_checked_in: 0,
        checkin_rate: 0,
        by_event: {},
      };
    }
  }

  /**
   * Get all form check-in configurations
   */
  async getAllFormCheckinConfigs(): Promise<FormCheckinConfig[]> {
    try {
      const supabase = await this.getSupabase();

      // Get all forms
      const { data: forms, error: formsError } = await supabase
        .from("form_types")
        .select("form_key, name")
        .eq("is_active", true);

      if (formsError) {
        console.error("Error fetching forms:", formsError);
        return [];
      }

      // Get configurations for each form
      const configs = await Promise.all(
        forms.map(async (form: any) => {
          const config = await this.getFormCheckinConfig(form.form_key);
          return config;
        }),
      );

      return configs.filter((config) => config !== null) as FormCheckinConfig[];
    } catch (error) {
      console.error("Error getting all form check-in configs:", error);
      return [];
    }
  }
}

// Export singleton instance
export const formCheckinService = new FormCheckinService();
