import { getSupabaseServiceClient } from "../supabase-server";
import { EventService } from "../events/eventService";
import { EventFactory } from "../events/eventFactory";
import {
  FormRegistration,
  FormRegistrationService,
  UnifiedRegistration,
} from "../../types/form-system";

/**
 * Form Registration Service
 * Handles CRUD operations for form registrations with event integration
 */
export class FormRegistrationServiceImpl implements FormRegistrationService {
  private supabase = getSupabaseServiceClient();

  /**
   * Create a new form registration
   */
  async create(
    registration: Omit<FormRegistration, "id" | "created_at" | "updated_at">,
  ): Promise<FormRegistration> {
    const { data, error } = await this.supabase
      .from("form_registrations")
      .insert({
        form_key: registration.form_key,
        tracking_id: registration.tracking_id,
        sequence_number: registration.sequence_number,
        core_data: registration.core_data,
        extra_data: registration.extra_data,
        pricing_data: registration.pricing_data,
        status: registration.status,
        dimension_status: registration.dimension_status,
        badge_path: registration.badge_path,
        import_job_id: registration.import_job_id,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create form registration: ${error.message}`);
    }

    const formRegistration = data as FormRegistration;

    // Emit domain event
    try {
      const event = EventFactory.createRegistrationSubmitted(
        formRegistration as any, // Cast to match existing event structure
        formRegistration.pricing_data.total_amount,
        formRegistration.form_key,
      );
      await EventService.emit(event);
    } catch (eventError) {
      console.error("Failed to emit registration submitted event:", eventError);
      // Don't fail the registration if event emission fails
    }

    return formRegistration;
  }

  /**
   * Get form registration by ID
   */
  async getById(id: string): Promise<FormRegistration | null> {
    const { data, error } = await this.supabase
      .from("form_registrations")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw new Error(`Failed to get form registration: ${error.message}`);
    }

    return data as FormRegistration;
  }

  /**
   * Get form registration by tracking ID
   */
  async getByTrackingId(trackingId: string): Promise<FormRegistration | null> {
    const { data, error } = await this.supabase
      .from("form_registrations")
      .select("*")
      .eq("tracking_id", trackingId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw new Error(`Failed to get form registration: ${error.message}`);
    }

    return data as FormRegistration;
  }

  /**
   * Update form registration
   */
  async update(
    id: string,
    updates: Partial<FormRegistration>,
  ): Promise<FormRegistration> {
    const { data, error } = await this.supabase
      .from("form_registrations")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update form registration: ${error.message}`);
    }

    return data as FormRegistration;
  }

  /**
   * Delete form registration
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("form_registrations")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to delete form registration: ${error.message}`);
    }
  }

  /**
   * List registrations by form key
   */
  async listByFormKey(
    formKey: string,
    status?: string,
  ): Promise<FormRegistration[]> {
    let query = this.supabase
      .from("form_registrations")
      .select("*")
      .eq("form_key", formKey)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list form registrations: ${error.message}`);
    }

    return data as FormRegistration[];
  }

  /**
   * List unified registrations (both form and traditional)
   */
  async listUnified(filters?: {
    form_key?: string;
    status?: string;
    source_type?: "multi-form" | "legacy";
  }): Promise<UnifiedRegistration[]> {
    // Use the unified view
    let query = this.supabase
      .from("admin_registrations_unified")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.form_key) {
      query = query.eq("form_key", filters.form_key);
    }

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    if (filters?.source_type) {
      query = query.eq("source_type", filters.source_type);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list unified registrations: ${error.message}`);
    }

    return data as UnifiedRegistration[];
  }

  /**
   * Update registration status
   */
  async updateStatus(
    id: string,
    status: string,
    reason?: string,
  ): Promise<FormRegistration> {
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (reason) {
      updates.rejected_reason = reason;
    }

    const { data, error } = await this.supabase
      .from("form_registrations")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update registration status: ${error.message}`);
    }

    return data as FormRegistration;
  }

  /**
   * Update dimension status
   */
  async updateDimensionStatus(
    id: string,
    dimension: string,
    status: "pending" | "needs_update" | "passed" | "rejected",
    notes?: string,
  ): Promise<FormRegistration> {
    // Get current dimension status
    const { data: current, error: fetchError } = await this.supabase
      .from("form_registrations")
      .select("dimension_status")
      .eq("id", id)
      .single();

    if (fetchError) {
      throw new Error(
        `Failed to get current dimension status: ${fetchError.message}`,
      );
    }

    const dimensionStatus = current.dimension_status || {};
    dimensionStatus[dimension] = { status, notes };

    const { data, error } = await this.supabase
      .from("form_registrations")
      .update({
        dimension_status: dimensionStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update dimension status: ${error.message}`);
    }

    return data as FormRegistration;
  }

  /**
   * Check if all required dimensions are passed for approval
   */
  async canApprove(id: string, requiredDimensions: string[]): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("form_registrations")
      .select("dimension_status")
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(`Failed to get dimension status: ${error.message}`);
    }

    const dimensionStatus = data.dimension_status || {};

    return requiredDimensions.every(
      (dimension) => dimensionStatus[dimension]?.status === "passed",
    );
  }

  /**
   * Get registration statistics
   */
  async getStatistics(formKey?: string): Promise<{
    total: number;
    by_status: Record<string, number>;
    by_form: Record<string, number>;
  }> {
    let query = this.supabase
      .from("admin_registrations_unified")
      .select("status, form_key, source_type");

    if (formKey) {
      query = query.eq("form_key", formKey);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(
        `Failed to get registration statistics: ${error.message}`,
      );
    }

    const stats = {
      total: data.length,
      by_status: {} as Record<string, number>,
      by_form: {} as Record<string, number>,
    };

    data.forEach((item: any) => {
      // Count by status
      stats.by_status[item.status] = (stats.by_status[item.status] || 0) + 1;

      // Count by form
      const formLabel =
        item.source_type === "legacy" ? "YEC Day (Traditional)" : item.form_key;
      stats.by_form[formLabel] = (stats.by_form[formLabel] || 0) + 1;
    });

    return stats;
  }
}

// Export singleton instance
export const formRegistrationService = new FormRegistrationServiceImpl();
