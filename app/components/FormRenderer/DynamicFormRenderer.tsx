"use client";

import { useState, useEffect, useCallback } from "react";
import { FormType, FormField } from "../../types/form-system";
import FormFieldRenderer from "./FormFieldRenderer";
import { FormValidation } from "./FormValidation";
import { FormSubmitHandler } from "./FormSubmitHandler";

interface DynamicFormRendererProps {
  formKey: string;
  onSubmit?: (data: any) => void;
  onError?: (error: string) => void;
  className?: string;
}

export default function DynamicFormRenderer({
  formKey,
  onSubmit,
  onError,
  className = "",
}: DynamicFormRendererProps) {
  const [formType, setFormType] = useState<FormType | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadFormType = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/cms/form-types/${formKey}`);
      if (!response.ok) {
        throw new Error("Failed to load form configuration");
      }
      const formType = await response.json();
      setFormType(formType);
    } catch (error) {
      console.error("Error loading form type:", error);
      onError?.(error instanceof Error ? error.message : "Failed to load form");
    } finally {
      setLoading(false);
    }
  }, [formKey, onError]);

  // Load form configuration
  useEffect(() => {
    loadFormType();
  }, [formKey, loadFormType]);

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));

    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors((prev) => ({ ...prev, [fieldId]: "" }));
    }
  };

  const validateForm = (): boolean => {
    if (!formType) return false;

    const newErrors: Record<string, string> = {};

    formType.config.fields.forEach((field) => {
      const error = FormValidation.validateField(field, formData[field.id]);
      if (error) {
        newErrors[field.id] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formType) return;

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      // Calculate pricing if needed
      let pricingData = null;
      if (formType.config.pricing_config) {
        const pricingResponse = await fetch("/api/form-pricing/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            form_key: formKey,
            data: formData,
          }),
        });

        if (pricingResponse.ok) {
          pricingData = await pricingResponse.json();
        }
      }

      // Submit form
      const submitHandler = new FormSubmitHandler();
      const result = await submitHandler.submitForm({
        formKey,
        formData,
        pricingData,
      });

      onSubmit?.(result);
    } catch (error) {
      console.error("Form submission error:", error);
      onError?.(
        error instanceof Error ? error.message : "Failed to submit form",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const shouldShowField = (field: FormField): boolean => {
    if (!field.depends_on) return true;

    const dependentValue = formData[field.depends_on.field];
    return dependentValue === field.depends_on.value;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!formType) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Form not found</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Form Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {formType.name}
        </h2>
        {formType.description && (
          <p className="text-gray-600">{formType.description}</p>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {formType.config.fields.map((field) => {
          if (!shouldShowField(field)) return null;

          return (
            <div key={field.id} className="space-y-2">
              <FormFieldRenderer
                field={field}
                value={formData[field.id] || ""}
                onChange={(value) => handleFieldChange(field.id, value)}
                error={errors[field.id]}
              />
            </div>
          );
        })}

        {/* Submit Button */}
        <div className="pt-6">
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit Registration"}
          </button>
        </div>
      </form>

      {/* Form Info */}
      <div className="text-center text-sm text-gray-500">
        <p>Form Key: {formKey}</p>
        <p>Fields: {formType.config.fields.length}</p>
        <p>Approval Workflow: {formType.config.approval_workflow}</p>
      </div>
    </div>
  );
}
