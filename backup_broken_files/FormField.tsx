"use client";

import { useState } from "react";

interface FormFieldType {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    pattern?: RegExp | string;
    message?: string;
    minLength?: number;
    maxLength?: number;
    fileTypes?: string[];
    maxFileSize?: number;
    customValidation?: (value: any) => string | null;
  };
  accept?: string;
  multiple?: boolean;
}

interface FormFieldProps {
  field: FormFieldType;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  formData?: { [key: string]: any };
  onExtraFieldChange?: (fieldId: string, value: any) => void;
}

export default function FormField({
  field,
  value,
  onChange,
  error,
  onExtraFieldChange,
}: FormFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColor = () => {
    if (error) return "border-red-500 focus:border-red-500";
    if (isFocused) return "border-blue-500 focus:border-blue-500";
    return "border-gray-300 focus:border-blue-500";
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Handle extra field changes if needed
    if (onExtraFieldChange) {
      onExtraFieldChange(field.id, newValue);
    }
  };

  const renderField = () => {
    switch (field.type) {
      case "select":
        return (
          <select
            id={field.id}
            value={value || ""}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`w-full p-3 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${getBorderColor()} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
            required={field.required}
          >
            <option value="">
              {field.placeholder || "Select an option..."}
            </option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case "textarea":
        return (
          <textarea
            id={field.id}
            value={value || ""}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={field.placeholder}
            className={`w-full p-3 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${getBorderColor()} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 resize-vertical min-h-[100px]`}
            required={field.required}
          />
        );

      case "email":
        return (
          <input
            id={field.id}
            type="email"
            value={value || ""}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={field.placeholder}
            className={`w-full p-3 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${getBorderColor()} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
            required={field.required}
            pattern={
              typeof field.validation?.pattern === "string"
                ? field.validation.pattern
                : undefined
            }
          />
        );

      case "tel":
        return (
          <input
            id={field.id}
            type="tel"
            value={value || ""}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={field.placeholder}
            className={`w-full p-3 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${getBorderColor()} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
            required={field.required}
            pattern={
              typeof field.validation?.pattern === "string"
                ? field.validation.pattern
                : undefined
            }
          />
        );

      case "number":
        return (
          <input
            id={field.id}
            type="number"
            value={value || ""}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={field.placeholder}
            className={`w-full p-3 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${getBorderColor()} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
            required={field.required}
            min="0"
          />
        );

      case "upload": {
        const inputId = field.id;
        const accept =
          field.accept ||
          (field.validation?.fileTypes
            ? field.validation.fileTypes.join(",")
            : "*/*");
        const multiple = Boolean(field.multiple);

        return (
          <input
            id={inputId}
            name={inputId}
            type="file"
            data-testid={`input-file-${inputId}`}
            accept={accept}
            multiple={multiple}
            onChange={(e) => {
              const files = e.currentTarget.files
                ? Array.from(e.currentTarget.files)
                : [];
              // Pass File[] upward; parent form state may store as File | File[] | undefined
              onChange(multiple ? files : (files[0] ?? null));
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`w-full p-3 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${getBorderColor()} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100`}
            required={field.required}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? `${inputId}-error` : undefined}
          />
        );
      }

      case "province":
        return (
          <select
            id={field.id}
            value={value || ""}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`w-full p-3 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${getBorderColor()} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
            required={field.required}
          >
            <option value="">{field.placeholder || "เลือกจังหวัด..."}</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <input
            id={field.id}
            type={field.type}
            value={value || ""}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={field.placeholder}
            className={`w-full p-3 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${getBorderColor()} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
            required={field.required}
            pattern={
              typeof field.validation?.pattern === "string"
                ? field.validation.pattern
                : undefined
            }
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <label
        htmlFor={field.id}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {renderField()}

      {error && (
        <p
          id={`${field.id}-error`}
          className="text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}

      {field.validation?.message && !error && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {field.validation.message}
        </p>
      )}
    </div>
  );
}
