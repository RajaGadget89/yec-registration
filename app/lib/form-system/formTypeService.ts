// Form Type Service
import { getSupabaseServiceClient } from "../supabase-server";
import { FormType } from "../../types/form-system";

/**
 * Form Type Service
 * Handles CRUD operations for form types (form templates)
 */
export class FormTypeServiceImpl {
  private supabase = getSupabaseServiceClient();

  /**
   * Create a new form type
   */
  async create(
    formType: Omit<FormType, "id" | "created_at" | "updated_at">,
  ): Promise<FormType> {
    const { data, error } = await this.supabase
      .from("form_types")
      .insert({
        form_key: formType.form_key,
        name: formType.name,
        description: formType.description,
        config: formType.config,
        is_active: formType.is_active,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create form type: ${error.message}`);
    }

    return data as FormType;
  }

  /**
   * Get form type by ID
   */
  async getById(id: string): Promise<FormType | null> {
    const { data, error } = await this.supabase
      .from("form_types")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw new Error(`Failed to get form type: ${error.message}`);
    }

    return data as FormType;
  }

  /**
   * Get form type by form key
   */
  async getByFormKey(formKey: string): Promise<FormType | null> {
    const { data, error } = await this.supabase
      .from("form_types")
      .select("*")
      .eq("form_key", formKey)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw new Error(`Failed to get form type: ${error.message}`);
    }

    return data as FormType;
  }

  /**
   * Update form type
   */
  async update(id: string, updates: Partial<FormType>): Promise<FormType> {
    const { data, error } = await this.supabase
      .from("form_types")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update form type: ${error.message}`);
    }

    return data as FormType;
  }

  /**
   * Delete form type
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("form_types")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to delete form type: ${error.message}`);
    }
  }

  /**
   * List form types with pagination and filtering
   */
  async list(
    options: {
      active?: boolean;
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
    } = {},
  ): Promise<{
    formTypes: FormType[];
    total: number;
    totalPages: number;
  }> {
    const {
      active,
      page = 1,
      limit = 10,
      search = "",
      status = "all",
    } = options;
    const offset = (page - 1) * limit;

    let query = this.supabase
      .from("form_types")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    // Apply filters
    if (active !== undefined) {
      query = query.eq("is_active", active);
    }

    if (status !== "all") {
      query = query.eq("is_active", status === "active");
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,form_key.ilike.%${search}%,description.ilike.%${search}%`,
      );
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list form types: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      formTypes: data as FormType[],
      total,
      totalPages,
    };
  }

  /**
   * Validate form configuration
   */
  validateConfig(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!config.fields || !Array.isArray(config.fields)) {
      errors.push("Fields configuration is required and must be an array");
    }

    if (!config.approval_workflow) {
      errors.push("Approval workflow is required");
    } else if (
      !["payment_only", "payment_profile", "full_3d"].includes(
        config.approval_workflow,
      )
    ) {
      errors.push("Invalid approval workflow template");
    }

    // Tracking ID settings are owned by Super Admin → Tracking ID Management.
    // Make this optional here so CMS Form Builder can create forms without it.
    if (config.tracking_id_format) {
      if (
        config.tracking_id_format.sequence_start !== undefined &&
        config.tracking_id_format.sequence_start < 1
      ) {
        errors.push("Tracking ID sequence start must be a positive number");
      }
    }

    // Validate fields if present
    if (config.fields && Array.isArray(config.fields)) {
      config.fields.forEach((field: any, index: number) => {
        if (!field.id) {
          errors.push(`Field ${index} must have an ID`);
        }
        if (!field.type) {
          errors.push(`Field ${index} must have a type`);
        }
        if (!field.label) {
          errors.push(`Field ${index} must have a label`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get approval dimensions for a form
   */
  getApprovalDimensions(approvalWorkflow: string): string[] {
    switch (approvalWorkflow) {
      case "payment_only":
        return ["payment"];
      case "payment_profile":
        return ["payment", "profile"];
      case "full_3d":
        return ["payment", "profile", "tcc"];
      default:
        return ["payment", "profile", "tcc"];
    }
  }
}

// Export singleton instance
export const formTypeService = new FormTypeServiceImpl();
