import { FormField } from "../../types/form-system";

export class FormValidation {
  /**
   * Validate a single field
   */
  static validateField(field: FormField, value: any): string | null {
    // Check required field
    if (field.required && (!value || value === "" || (Array.isArray(value) && value.length === 0))) {
      return `${field.label} is required`;
    }

    // Skip validation if no value and not required
    if (!value || value === "") {
      return null;
    }

    // Validate based on field type
    switch (field.type) {
      case "email":
        return this.validateEmail(value);
      case "tel":
        return this.validatePhone(value);
      case "number":
        return this.validateNumber(value);
      case "file":
        return this.validateFile(field, value);
      default:
        return this.validateText(field, value);
    }
  }

  /**
   * Validate email format
   */
  private static validateEmail(value: string): string | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return "Please enter a valid email address";
    }
    return null;
  }

  /**
   * Validate phone number format
   */
  private static validatePhone(value: string): string | null {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, "");
    
    // Check if it's a valid Thai phone number (10 digits starting with 0)
    if (digits.length === 10 && digits.startsWith("0")) {
      return null;
    }
    
    // Check if it's a valid international format
    if (digits.length >= 10 && digits.length <= 15) {
      return null;
    }
    
    return "Please enter a valid phone number";
  }

  /**
   * Validate number format
   */
  private static validateNumber(value: string | number): string | null {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) {
      return "Please enter a valid number";
    }
    return null;
  }

  /**
   * Validate text fields
   */
  private static validateText(field: FormField, value: string): string | null {
    if (!field.validation) return null;

    const validation = field.validation;

    // Check minimum length
    if (validation.min_length && value.length < validation.min_length) {
      return `${field.label} must be at least ${validation.min_length} characters`;
    }

    // Check maximum length
    if (validation.max_length && value.length > validation.max_length) {
      return `${field.label} must be no more than ${validation.max_length} characters`;
    }

    // Check pattern
    if (validation.pattern) {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        return `${field.label} format is invalid`;
      }
    }

    return null;
  }

  /**
   * Validate file upload
   */
  private static validateFile(field: FormField, file: File): string | null {
    if (!field.validation) return null;

    const validation = field.validation;

    // Check file type
    if (validation.file_types && validation.file_types.length > 0) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const allowedTypes = validation.file_types.map(type => type.toLowerCase());
      
      if (!fileExtension || !allowedTypes.includes(fileExtension)) {
        return `File type must be one of: ${validation.file_types.join(", ")}`;
      }
    }

    // Check file size
    if (validation.max_file_size) {
      const maxSizeBytes = validation.max_file_size * 1024 * 1024; // Convert MB to bytes
      if (file.size > maxSizeBytes) {
        return `File size must be less than ${validation.max_file_size}MB`;
      }
    }

    return null;
  }

  /**
   * Validate entire form
   */
  static validateForm(fields: FormField[], formData: Record<string, any>): Record<string, string> {
    const errors: Record<string, string> = {};

    fields.forEach(field => {
      const error = this.validateField(field, formData[field.id]);
      if (error) {
        errors[field.id] = error;
      }
    });

    return errors;
  }

  /**
   * Check if form is valid
   */
  static isFormValid(fields: FormField[], formData: Record<string, any>): boolean {
    const errors = this.validateForm(fields, formData);
    return Object.keys(errors).length === 0;
  }

  /**
   * Get validation summary
   */
  static getValidationSummary(fields: FormField[], formData: Record<string, any>): {
    valid: boolean;
    errors: Record<string, string>;
    errorCount: number;
    requiredFields: string[];
    missingRequired: string[];
  } {
    const errors = this.validateForm(fields, formData);
    const requiredFields = fields.filter(f => f.required).map(f => f.id);
    const missingRequired = requiredFields.filter(fieldId => {
      const value = formData[fieldId];
      return !value || value === "" || (Array.isArray(value) && value.length === 0);
    });

    return {
      valid: Object.keys(errors).length === 0,
      errors,
      errorCount: Object.keys(errors).length,
      requiredFields,
      missingRequired
    };
  }
}
