import { createClient } from "@/app/lib/supabase/server";

export interface UnifiedRegistration {
  id: string;
  tracking_id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  dimension_status: any;
  badge_path?: string;
  created_at: string;
  updated_at: string;
  form_type: string;
  form_name: string;
  core_data: any;
  extra_data: any;
  pricing_data: any;
}

export interface RegistrationFilters {
  form_filter?: string;
  status_filter?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface UnifiedResponse {
  registrations: UnifiedRegistration[];
  pagination: PaginationInfo;
  form_types: Array<{ form_key: string; name: string }>;
}

export class UnifiedRegistrationService {
  private supabase: any;

  constructor() {
    this.supabase = null; // Will be initialized when needed
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient();
    }
    return this.supabase;
  }

  /**
   * Get unified registrations with filtering and pagination
   */
  async getRegistrations(filters: RegistrationFilters = {}): Promise<UnifiedResponse> {
    try {
      const supabase = await this.getSupabase();
      
      const {
        form_filter = "all",
        status_filter = "all",
        search = "",
        page = 1,
        limit = 50,
      } = filters;

      const offset = (page - 1) * limit;

      // Build the unified query using the view
      let query = supabase
        .from("admin_registrations_unified")
        .select("*");

      // Apply filters
      if (form_filter !== "all") {
        if (form_filter === "traditional") {
          query = query.eq("form_type", "traditional");
        } else {
          query = query.eq("form_type", form_filter);
        }
      }

      if (status_filter !== "all") {
        query = query.eq("status", status_filter);
      }

      if (search) {
        query = query.or(`tracking_id.ilike.%${search}%,name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      // Add ordering and pagination
      query = query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: registrations, error: queryError } = await query;

      if (queryError) {
        console.error("Error fetching unified registrations:", queryError);
        throw new Error("Failed to fetch registrations");
      }

      // Get total count
      let countQuery = supabase
        .from("admin_registrations_unified")
        .select("*", { count: "exact", head: true });

      // Apply same filters for count
      if (form_filter !== "all") {
        if (form_filter === "traditional") {
          countQuery = countQuery.eq("form_type", "traditional");
        } else {
          countQuery = countQuery.eq("form_type", form_filter);
        }
      }

      if (status_filter !== "all") {
        countQuery = countQuery.eq("status", status_filter);
      }

      if (search) {
        countQuery = countQuery.or(`tracking_id.ilike.%${search}%,name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { count, error: countError } = await countQuery;

      if (countError) {
        console.error("Error getting count:", countError);
      }

      const total = count || 0;

      // Get available form types for filter dropdown
      const { data: formTypes, error: formTypesError } = await supabase
        .from("form_types")
        .select("form_key, name")
        .eq("is_active", true)
        .order("name");

      if (formTypesError) {
        console.error("Error fetching form types:", formTypesError);
      }

      return {
        registrations: registrations || [],
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
        },
        form_types: [
          { form_key: "traditional", name: "YEC Day Registration" },
          ...(formTypes || []),
        ],
      };
    } catch (error) {
      console.error("Error in UnifiedRegistrationService:", error);
      throw error;
    }
  }

  /**
   * Get a single registration by ID and form type
   */
  async getRegistrationById(id: string, formType: string): Promise<UnifiedRegistration | null> {
    try {
      const supabase = await this.getSupabase();
      
      const { data, error } = await supabase
        .from("admin_registrations_unified")
        .select("*")
        .eq("id", id)
        .eq("form_type", formType)
        .single();

      if (error) {
        console.error("Error fetching registration:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in getRegistrationById:", error);
      return null;
    }
  }

  /**
   * Get registration statistics
   */
  async getRegistrationStats(): Promise<{
    total_registrations: number;
    by_status: Record<string, number>;
    by_form_type: Record<string, number>;
    recent_registrations: number;
  }> {
    try {
      const supabase = await this.getSupabase();

      // Get total count
      const { count: total, error: totalError } = await supabase
        .from("admin_registrations_unified")
        .select("*", { count: "exact", head: true });

      if (totalError) {
        console.error("Error getting total count:", totalError);
      }

      // Get status breakdown
      const { data: statusData, error: statusError } = await supabase
        .from("admin_registrations_unified")
        .select("status")
        .not("status", "is", null);

      if (statusError) {
        console.error("Error getting status breakdown:", statusError);
      }

      const byStatus: Record<string, number> = {};
      statusData?.forEach((item: any) => {
        byStatus[item.status] = (byStatus[item.status] || 0) + 1;
      });

      // Get form type breakdown
      const { data: formTypeData, error: formTypeError } = await supabase
        .from("admin_registrations_unified")
        .select("form_type");

      if (formTypeError) {
        console.error("Error getting form type breakdown:", formTypeError);
      }

      const byFormType: Record<string, number> = {};
      formTypeData?.forEach((item: any) => {
        byFormType[item.form_type] = (byFormType[item.form_type] || 0) + 1;
      });

      // Get recent registrations (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count: recent, error: recentError } = await supabase
        .from("admin_registrations_unified")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString());

      if (recentError) {
        console.error("Error getting recent registrations:", recentError);
      }

      return {
        total_registrations: total || 0,
        by_status: byStatus,
        by_form_type: byFormType,
        recent_registrations: recent || 0,
      };
    } catch (error) {
      console.error("Error in getRegistrationStats:", error);
      throw error;
    }
  }

  /**
   * Update registration status
   */
  async updateRegistrationStatus(
    id: string,
    formType: string,
    status: string,
    dimensionStatus?: any
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();

      if (formType === "traditional") {
        // Update traditional registration
        const { error } = await supabase
          .from("registrations")
          .update({
            status,
            dimension_status: dimensionStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (error) {
          console.error("Error updating traditional registration:", error);
          return false;
        }
      } else {
        // Update form registration
        const { error } = await supabase
          .from("form_registrations")
          .update({
            status,
            dimension_status: dimensionStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (error) {
          console.error("Error updating form registration:", error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("Error in updateRegistrationStatus:", error);
      return false;
    }
  }

  /**
   * Get registration details for review
   */
  async getRegistrationForReview(id: string, formType: string): Promise<{
    registration: UnifiedRegistration;
    form_config?: any;
    approval_workflow?: string;
  } | null> {
    try {
      const registration = await this.getRegistrationById(id, formType);
      if (!registration) {
        return null;
      }

      let formConfig = null;
      let approvalWorkflow = null;

      if (formType !== "traditional") {
        // Get form configuration for new forms
        const supabase = await this.getSupabase();
        const { data: formTypeData, error: formError } = await supabase
          .from("form_types")
          .select("config")
          .eq("form_key", formType)
          .single();

        if (!formError && formTypeData) {
          formConfig = formTypeData.config;
          approvalWorkflow = formConfig.approval_workflow;
        }
      }

      return {
        registration,
        form_config: formConfig,
        approval_workflow: approvalWorkflow,
      };
    } catch (error) {
      console.error("Error in getRegistrationForReview:", error);
      return null;
    }
  }
}

// Export singleton instance
export const unifiedRegistrationService = new UnifiedRegistrationService();
