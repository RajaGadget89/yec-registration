"use client";

import { useState } from "react";
import { X, Eye } from "lucide-react";
import { FormType, FormField } from "../../../../types/form-system";

interface FormPreviewProps {
  form: FormType;
  onClose: () => void;
}

export default function FormPreview({ form, onClose }: FormPreviewProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => ({ ...prev, [fieldId]: "" }));
    }
  };

  const validateField = (field: FormField, value: any): string | null => {
    if (field.required && (!value || value === "")) {
      return `${field.label} is required`;
    }

    if (value && field.validation) {
      if (field.validation.min_length && value.length < field.validation.min_length) {
        return `${field.label} must be at least ${field.validation.min_length} characters`;
      }
      
      if (field.validation.max_length && value.length > field.validation.max_length) {
        return `${field.label} must be no more than ${field.validation.max_length} characters`;
      }
      
      if (field.validation.pattern) {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(value)) {
          return `${field.label} format is invalid`;
        }
      }
    }

    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    
    // Validate all fields
    form.config.fields.forEach(field => {
      const error = validateField(field, formData[field.id]);
      if (error) {
        newErrors[field.id] = error;
      }
    });
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      alert("Form validation passed! (This is just a preview)");
    }
  };

  const renderField = (field: FormField) => {
    const fieldId = field.id;
    const value = formData[fieldId] || "";
    const error = errors[fieldId];

    const baseClasses = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      error ? "border-red-300" : "border-gray-300"
    }`;

    switch (field.type) {
      case "text":
      case "email":
      case "tel":
      case "number":
        return (
          <input
            type={field.type}
            id={fieldId}
            value={value}
            onChange={(e) => handleFieldChange(fieldId, e.target.value)}
            placeholder={field.placeholder}
            className={baseClasses}
          />
        );

      case "textarea":
        return (
          <textarea
            id={fieldId}
            value={value}
            onChange={(e) => handleFieldChange(fieldId, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className={baseClasses}
          />
        );

      case "select":
        return (
          <select
            id={fieldId}
            value={value}
            onChange={(e) => handleFieldChange(fieldId, e.target.value)}
            className={baseClasses}
          >
            <option value="">Select an option</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case "radio":
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label key={option.value} className="flex items-center">
                <input
                  type="radio"
                  name={fieldId}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => handleFieldChange(fieldId, e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-900">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case "checkbox":
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  name={fieldId}
                  value={option.value}
                  checked={Array.isArray(value) ? value.includes(option.value) : false}
                  onChange={(e) => {
                    const currentValues = Array.isArray(value) ? value : [];
                    if (e.target.checked) {
                      handleFieldChange(fieldId, [...currentValues, option.value]);
                    } else {
                      handleFieldChange(fieldId, currentValues.filter(v => v !== option.value));
                    }
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-900">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case "date":
        return (
          <input
            type="date"
            id={fieldId}
            value={value}
            onChange={(e) => handleFieldChange(fieldId, e.target.value)}
            className={baseClasses}
          />
        );

      case "file":
        return (
          <input
            type="file"
            id={fieldId}
            onChange={(e) => handleFieldChange(fieldId, e.target.files?.[0])}
            accept={field.validation?.file_types?.join(",")}
            className={baseClasses}
          />
        );

      default:
        return (
          <input
            type="text"
            id={fieldId}
            value={value}
            onChange={(e) => handleFieldChange(fieldId, e.target.value)}
            placeholder={field.placeholder}
            className={baseClasses}
          />
        );
    }
  };

  const shouldShowField = (field: FormField): boolean => {
    if (!field.depends_on) return true;
    
    const dependentValue = formData[field.depends_on.field];
    return dependentValue === field.depends_on.value;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center">
            <Eye className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Form Preview</h3>
            <span className="ml-2 text-sm text-gray-500">({form.name})</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{form.name}</h2>
            {form.description && (
              <p className="text-gray-600">{form.description}</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {form.config.fields.map((field) => {
              if (!shouldShowField(field)) return null;

              return (
                <div key={field.id} className="space-y-2">
                  <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  
                  {renderField(field)}
                  
                  {errors[field.id] && (
                    <p className="text-sm text-red-600">{errors[field.id]}</p>
                  )}
                  
                  {field.validation && (
                    <div className="text-xs text-gray-500">
                      {field.validation.min_length && (
                        <span>Min: {field.validation.min_length} chars</span>
                      )}
                      {field.validation.max_length && (
                        <span className="ml-2">Max: {field.validation.max_length} chars</span>
                      )}
                      {field.validation.file_types && (
                        <span className="ml-2">Types: {field.validation.file_types.join(", ")}</span>
                      )}
                      {field.validation.max_file_size && (
                        <span className="ml-2">Max size: {field.validation.max_file_size}MB</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="pt-6 border-t border-gray-200">
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Submit Registration
              </button>
            </div>
          </form>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Form Configuration Summary:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>Form Key:</strong> {form.form_key}</li>
              <li>• <strong>Fields:</strong> {form.config.fields.length}</li>
              <li>• <strong>Approval Workflow:</strong> {form.config.approval_workflow}</li>
              <li>• <strong>Tracking ID Format:</strong> {form.config.tracking_id_format.prefix}-XXXXXX</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
