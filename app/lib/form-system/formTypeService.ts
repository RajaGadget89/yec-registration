import { getSupabaseServiceClient } from "../supabase-server";
import { FormType, FormTypeService } from "../../types/form-system";

/**
 * Form Type Service
 * Handles CRUD operations for form types (form templates)
 */
export class FormTypeServiceImpl implements FormTypeService {
  private supabase = getSupabaseServiceClient();

  /**
   * Create a new form type
   */
  async create(formType: Omit<FormType, 'id' | 'created_at' | 'updated_at'>): Promise<FormType> {
    const { data, error } = await this.supabase
      .from('form_types')
      .insert({
        form_key: formType.form_key,
        name: formType.name,
        description: formType.description,
        config: formType.config,
        is_active: formType.is_active
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
      .from('form_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
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
      .from('form_types')
      .select('*')
      .eq('form_key', formKey)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
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
      .from('form_types')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
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
      .from('form_types')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete form type: ${error.message}`);
    }
  }

  /**
   * List form types
   */
  async list(active?: boolean): Promise<FormType[]> {
    let query = this.supabase
      .from('form_types')
      .select('*')
      .order('created_at', { ascending: false });

    if (active !== undefined) {
      query = query.eq('is_active', active);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list form types: ${error.message}`);
    }

    return data as FormType[];
  }

  /**
   * Validate form configuration
   */
  validateConfig(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!config.fields || !Array.isArray(config.fields)) {
      errors.push('Fields configuration is required and must be an array');
    }

    if (!config.approval_workflow) {
      errors.push('Approval workflow is required');
    } else if (!['payment_only', 'payment_profile', 'full_3d'].includes(config.approval_workflow)) {
      errors.push('Invalid approval workflow template');
    }

    if (!config.tracking_id_format) {
      errors.push('Tracking ID format is required');
    } else {
      if (!config.tracking_id_format.prefix) {
        errors.push('Tracking ID format must include a prefix');
      }
      if (!config.tracking_id_format.sequence_start || config.tracking_id_format.sequence_start < 1) {
        errors.push('Tracking ID format must include a valid sequence start');
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
      errors
    };
  }

  /**
   * Get approval dimensions for a form
   */
  getApprovalDimensions(approvalWorkflow: string): string[] {
    switch (approvalWorkflow) {
      case 'payment_only':
        return ['payment'];
      case 'payment_profile':
        return ['payment', 'profile'];
      case 'full_3d':
        return ['payment', 'profile', 'tcc'];
      default:
        return ['payment', 'profile', 'tcc'];
    }
  }
}

// Export singleton instance
export const formTypeService = new FormTypeServiceImpl();
