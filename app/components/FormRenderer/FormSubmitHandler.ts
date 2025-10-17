import { formRegistrationService } from "../../lib/form-system/formRegistrationService";
import { formTrackingIdService } from "../../lib/form-system/formTrackingIdService";
import { CoreRegistrationData } from "../../types/form-system";

export interface FormSubmissionData {
  formKey: string;
  formData: Record<string, any>;
  pricingData?: any;
}

export interface FormSubmissionResult {
  success: boolean;
  registrationId?: string;
  trackingId?: string;
  message?: string;
  error?: string;
}

export class FormSubmitHandler {
  /**
   * Submit a form registration
   */
  async submitForm(data: FormSubmissionData): Promise<FormSubmissionResult> {
    try {
      const { formKey, formData, pricingData } = data;

      // Generate tracking ID
      const trackingResult = await formTrackingIdService.generateTrackingId(
        formKey,
        formData,
      );

      // Prepare core data (common fields)
      const coreData = this.extractCoreData(formData);

      // Prepare extra data (form-specific fields)
      const extraData = this.extractExtraData(formData);

      // Create form registration
      const registration = await formRegistrationService.create({
        form_key: formKey,
        tracking_id: trackingResult.tracking_id,
        sequence_number: trackingResult.sequence_number,
        core_data: coreData as CoreRegistrationData,
        extra_data: extraData,
        pricing_data: pricingData || {},
        status: "waiting_for_review",
        dimension_status: this.initializeDimensionStatus(formKey),
        badge_path: undefined,
        import_job_id: undefined,
      });

      return {
        success: true,
        registrationId: registration.id,
        trackingId: registration.tracking_id,
        message: "Registration submitted successfully",
      };
    } catch (error) {
      console.error("Form submission error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to submit form",
      };
    }
  }

  /**
   * Extract core data from form data
   */
  private extractCoreData(formData: Record<string, any>): Record<string, any> {
    const coreFields = ["name", "email", "phone", "organization", "company"];
    const coreData: Record<string, any> = {};

    coreFields.forEach((field) => {
      if (formData[field] !== undefined) {
        coreData[field] = formData[field];
      }
    });

    return coreData;
  }

  /**
   * Extract extra data (form-specific fields)
   */
  private extractExtraData(formData: Record<string, any>): Record<string, any> {
    const coreFields = ["name", "email", "phone", "organization", "company"];
    const extraData: Record<string, any> = {};

    Object.keys(formData).forEach((key) => {
      if (!coreFields.includes(key) && formData[key] !== undefined) {
        extraData[key] = formData[key];
      }
    });

    return extraData;
  }

  /**
   * Initialize dimension status based on form's approval workflow
   */
  private initializeDimensionStatus(_formKey: string): Record<string, any> {
    // This would typically be fetched from the form configuration
    // For now, we'll use a default structure
    return {
      payment: { status: "pending", notes: "" },
      profile: { status: "pending", notes: "" },
      tcc: { status: "pending", notes: "" },
    };
  }

  /**
   * Validate form data before submission
   */
  async validateSubmission(data: FormSubmissionData): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Check if form exists
      const response = await fetch(`/api/cms/form-types/${data.formKey}`);
      if (!response.ok) {
        errors.push("Form not found");
        return { valid: false, errors };
      }

      // Additional validation can be added here
      // For example, checking for required fields, format validation, etc.

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (_error) {
      errors.push("Validation failed");
      return { valid: false, errors };
    }
  }

  /**
   * Get submission status
   */
  async getSubmissionStatus(registrationId: string): Promise<{
    status: string;
    trackingId: string;
    submittedAt: string;
  } | null> {
    try {
      const registration =
        await formRegistrationService.getById(registrationId);
      if (!registration) {
        return null;
      }

      return {
        status: registration.status,
        trackingId: registration.tracking_id,
        submittedAt: registration.created_at,
      };
    } catch (error) {
      console.error("Error getting submission status:", error);
      return null;
    }
  }
}
