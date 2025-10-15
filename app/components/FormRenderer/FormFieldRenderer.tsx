"use client";

import { FormField } from "../../types/form-system";

interface FormFieldRendererProps {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

export default function FormFieldRenderer({ 
  field, 
  value, 
  onChange, 
  error 
}: FormFieldRendererProps) {
  const baseClasses = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    error ? "border-red-300" : "border-gray-300"
  }`;

  const renderField = () => {
    switch (field.type) {
      case "text":
      case "email":
      case "tel":
      case "number":
        return (
          <input
            type={field.type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={baseClasses}
            required={field.required}
          />
        );

      case "textarea":
        return (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className={baseClasses}
            required={field.required}
          />
        );

      case "select":
        return (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={baseClasses}
            required={field.required}
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
                  name={field.id}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => onChange(e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  required={field.required}
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
                  name={field.id}
                  value={option.value}
                  checked={Array.isArray(value) ? value.includes(option.value) : false}
                  onChange={(e) => {
                    const currentValues = Array.isArray(value) ? value : [];
                    if (e.target.checked) {
                      onChange([...currentValues, option.value]);
                    } else {
                      onChange(currentValues.filter(v => v !== option.value));
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
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={baseClasses}
            required={field.required}
          />
        );

      case "file":
        return (
          <div className="space-y-2">
            <input
              type="file"
              onChange={(e) => onChange(e.target.files?.[0])}
              accept={field.validation?.file_types?.join(",")}
              className={baseClasses}
              required={field.required}
            />
            {field.validation?.file_types && (
              <p className="text-xs text-gray-500">
                Allowed types: {field.validation.file_types.join(", ")}
              </p>
            )}
            {field.validation?.max_file_size && (
              <p className="text-xs text-gray-500">
                Max size: {field.validation.max_file_size}MB
              </p>
            )}
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={baseClasses}
            required={field.required}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {renderField()}
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      
      {field.validation && (
        <div className="text-xs text-gray-500">
          {field.validation.min_length && (
            <span>Min: {field.validation.min_length} chars</span>
          )}
          {field.validation.max_length && (
            <span className="ml-2">Max: {field.validation.max_length} chars</span>
          )}
          {field.validation.pattern && (
            <span className="ml-2">Pattern: {field.validation.pattern}</span>
          )}
        </div>
      )}
    </div>
  );
}
