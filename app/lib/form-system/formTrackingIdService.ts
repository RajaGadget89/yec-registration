import { getSupabaseServiceClient } from "../supabase-server";
import { FormTrackingIdService } from "../../types/form-system";

/**
 * Form Tracking ID Service
 * Handles generation of tracking IDs for form registrations
 */
export class FormTrackingIdServiceImpl implements FormTrackingIdService {
  private supabase = getSupabaseServiceClient();

  /**
   * Generate a sequential tracking ID for a form
   */
  async generateTrackingId(formKey: string, payload?: any): Promise<{ tracking_id: string; sequence_number: number }> {
    try {
      const { data, error } = await this.supabase.rpc('form_seq_generate', {
        p_form_key: formKey,
        p_payload: payload || {}
      });

      if (error) {
        throw new Error(`Failed to generate tracking ID: ${error.message}`);
      }

      return {
        tracking_id: data.tracking_id,
        sequence_number: data.sequence_number
      };
    } catch (error) {
      console.error('Error generating tracking ID:', error);
      throw new Error(`Failed to generate tracking ID for form ${formKey}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a batch tracking ID for a form
   */
  async generateBatchTrackingId(formKey: string, payload?: any): Promise<{ tracking_id: string; sequence_number: number }> {
    try {
      const { data, error } = await this.supabase.rpc('form_batch_generate', {
        p_form_key: formKey,
        p_payload: payload || {}
      });

      if (error) {
        throw new Error(`Failed to generate batch tracking ID: ${error.message}`);
      }

      return {
        tracking_id: data.tracking_id,
        sequence_number: data.sequence_number
      };
    } catch (error) {
      console.error('Error generating batch tracking ID:', error);
      throw new Error(`Failed to generate batch tracking ID for form ${formKey}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate tracking ID format
   */
  validateTrackingId(trackingId: string, expectedPrefix: string): boolean {
    // Check if tracking ID starts with expected prefix
    if (!trackingId.startsWith(expectedPrefix)) {
      return false;
    }

    // Check format: PREFIX-NUMBER (e.g., SEM-000001)
    const pattern = new RegExp(`^${expectedPrefix}-\\d{6}$`);
    return pattern.test(trackingId);
  }

  /**
   * Parse tracking ID to extract components
   */
  parseTrackingId(trackingId: string): { prefix: string; sequence: number } | null {
    const match = trackingId.match(/^([A-Z]+)-(\d+)$/);
    if (!match) {
      return null;
    }

    return {
      prefix: match[1],
      sequence: parseInt(match[2], 10)
    };
  }

  /**
   * Get current counter for a form
   */
  async getCurrentCounter(formKey: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('form_batch_counters')
      .select('counter')
      .eq('form_key', formKey)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return 0; // No counter exists yet
      }
      throw new Error(`Failed to get current counter: ${error.message}`);
    }

    return data.counter;
  }

  /**
   * Reset counter for a form (use with caution)
   */
  async resetCounter(formKey: string): Promise<void> {
    const { error } = await this.supabase
      .from('form_batch_counters')
      .delete()
      .eq('form_key', formKey);

    if (error) {
      throw new Error(`Failed to reset counter: ${error.message}`);
    }
  }

  /**
   * Get tracking ID statistics for a form
   */
  async getTrackingIdStats(formKey: string): Promise<{
    total_generated: number;
    last_generated: string | null;
    next_sequence: number;
  }> {
    // Get current counter
    const currentCounter = await this.getCurrentCounter(formKey);

    // Get last generated tracking ID
    const { data: lastRegistration, error: lastError } = await this.supabase
      .from('form_registrations')
      .select('tracking_id, created_at')
      .eq('form_key', formKey)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastError && lastError.code !== 'PGRST116') {
      throw new Error(`Failed to get last tracking ID: ${lastError.message}`);
    }

    return {
      total_generated: currentCounter,
      last_generated: lastRegistration?.tracking_id || null,
      next_sequence: currentCounter + 1
    };
  }

  /**
   * Check if tracking ID is unique
   */
  async isTrackingIdUnique(trackingId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('form_registrations')
      .select('id')
      .eq('tracking_id', trackingId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return true; // Not found, so it's unique
      }
      throw new Error(`Failed to check tracking ID uniqueness: ${error.message}`);
    }

    return false; // Found, so it's not unique
  }

  /**
   * Generate preview tracking IDs for testing
   */
  async generatePreviewIds(formKey: string, count: number = 5): Promise<string[]> {
    const previewIds: string[] = [];
    const currentCounter = await this.getCurrentCounter(formKey);

    for (let i = 1; i <= count; i++) {
      const sequence = currentCounter + i;
      const trackingId = `${formKey}-${sequence.toString().padStart(6, '0')}`;
      previewIds.push(trackingId);
    }

    return previewIds;
  }

  /**
   * Validate form key format
   */
  validateFormKey(formKey: string): boolean {
    // Form key should be lowercase, alphanumeric with hyphens
    const pattern = /^[a-z0-9-]+$/;
    return pattern.test(formKey) && formKey.length >= 3 && formKey.length <= 50;
  }

  /**
   * Sanitize form key for tracking ID generation
   */
  sanitizeFormKey(formKey: string): string {
    return formKey
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

// Export singleton instance
export const formTrackingIdService = new FormTrackingIdServiceImpl();
