"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { FormField as FormFieldType } from "./FormSchema";
import {
  validateField,
  getFieldBorderColor,
  shouldShowExtraField,
  shouldFieldBeRequired,
  validateThaiPhoneNumber,
  formatThaiPhoneNumber,
} from "./formValidation";

interface FormFieldProps {
  field: FormFieldType;
  value: any;
  onChange: (value: any) => void;
  formData: { [key: string]: any };
  onExtraFieldChange?: (fieldId: string, value: any) => void;
}

// Searchable Dropdown Component for Provinces
function SearchableProvinceDropdown({
  field,
  value,
  onChange,
  setIsFocused,
  getBorderColor,
}: {
  field: FormFieldType;
  value: any;
  onChange: (value: any) => void;
  setIsFocused: (focused: boolean) => void;
  getBorderColor: () => string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter provinces based on search term
  const filteredOptions = useMemo(() => {
    if (!field.options) return [];

    if (!searchTerm.trim()) {
      return field.options;
    }

    return field.options.filter(
      (option) =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        option.value.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [field.options, searchTerm]);

  // Get selected option label
  const selectedOption = useMemo(() => {
    return field.options?.find((option) => option.value === value);
  }, [field.options, value]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        setIsOpen(false);
        setSearchTerm("");
        setHighlightedIndex(-1);
        break;
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          onChange(filteredOptions[highlightedIndex].value);
          setIsOpen(false);
          setSearchTerm("");
          setHighlightedIndex(-1);
        }
        break;
    }
  };

  // Handle option selection
  const handleOptionSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm("");
    setHighlightedIndex(-1);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset highlighted index when search term changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchTerm]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main Button */}
      <button
        type="button"
        id={field.id}
        name={field.id}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
          }
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`w-full px-3 py-2 text-left border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${getBorderColor()} bg-white`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center justify-between">
          <span className={selectedOption ? "text-gray-900" : "text-gray-500"}>
            {selectedOption ? selectedOption.label : `กรุณาเลือก${field.label}`}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={searchInputRef}
                id={`${field.id}-search`}
                name={`${field.id}-search`}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาจังหวัด..."
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={handleKeyDown}
                aria-label="ค้นหาจังหวัด"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                ไม่พบจังหวัดที่ค้นหา
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleOptionSelect(option.value)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors ${
                    index === highlightedIndex ? "bg-blue-50" : ""
                  } ${option.value === value ? "bg-blue-100 text-blue-900" : "text-gray-900"}`}
                >
                  <div className="flex items-center">
                    {option.value === value && (
                      <svg
                        className="w-4 h-4 mr-2 text-blue-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    <span
                      className={option.value === value ? "font-medium" : ""}
                    >
                      {option.label}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Results Count */}
          {searchTerm && (
            <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-100 bg-gray-50">
              พบ {filteredOptions.length} จังหวัด
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FormField({
  field,
  value,
  onChange,
  formData,
  onExtraFieldChange,
}: FormFieldProps) {
  // Ensure required is always a boolean - memoized to prevent infinite re-renders
  const normalizedField = useMemo(
    () => ({
      ...field,
      required: !!field.required,
    }),
    [field],
  );

  const [validation, setValidation] = useState<any>(null);
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [displayValue, setDisplayValue] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);

  // Validate field on value change
  useEffect(() => {
    const result = validateField(normalizedField, value, formData);
    setValidation(result);
  }, [normalizedField, value, formData]);

  // Handle file preview
  useEffect(() => {
    if (normalizedField.type === "upload") {
      if (typeof window !== "undefined" && value instanceof File) {
        // Handle new File objects
        if (typeof window !== "undefined") {
          const url = URL.createObjectURL(value);
          setPreviewUrl(url);
          return () => URL.revokeObjectURL(url);
        }
      } else if (value && typeof value === "object" && "dataUrl" in value) {
        // Handle base64 data URL from localStorage (old format)
        setPreviewUrl(value.dataUrl);
        return () => setPreviewUrl(null);
      } else if (typeof value === "string" && value.startsWith("http")) {
        // Handle Supabase URLs (new format)
        setPreviewUrl(value);
        return () => setPreviewUrl(null);
      } else {
        setPreviewUrl(null);
      }
    } else {
      setPreviewUrl(null);
    }
    return undefined;
  }, [normalizedField.type, value]);

  // Handle phone number formatting
  useEffect(() => {
    if (normalizedField.type === "tel" && value) {
      const digits = value.replace(/\D/g, "");
      setDisplayValue(formatThaiPhoneNumber(digits));
    } else if (normalizedField.type === "tel") {
      setDisplayValue("");
    }
  }, [normalizedField.type, value]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    // Enhanced file validation with immediate feedback
    const maxSizeInMB = normalizedField.validation?.maxFileSize || 10;
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

    if (file.size > maxSizeInBytes) {
      // Show immediate error feedback
      const fileSizeInMB = (file.size / 1024 / 1024).toFixed(2);
      const maxSizeFormatted = maxSizeInMB.toFixed(0);

      // Create a custom error message
      const errorMessage = `ไฟล์มีขนาดใหญ่เกินไป (${fileSizeInMB} MB) ขนาดสูงสุดที่อนุญาต: ${maxSizeFormatted} MB`;

      // Set validation state immediately
      setValidation({
        isValid: false,
        message: errorMessage,
        status: "invalid",
      });

      // Clear the file input
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // File is valid, proceed with normal flow
    onChange(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      validateAndSetFile(file);
    }
  };

  const handleInputChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    onChange(event.target.value);
  };

  const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target.value;
    const digits = input.replace(/\D/g, "");

    // Limit to 10 digits
    if (digits.length <= 10) {
      onChange(digits);
    }
  };

  const handleExtraPhoneChange = (
    fieldId: string,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const input = event.target.value;
    const digits = input.replace(/\D/g, "");

    // Limit to 10 digits
    if (digits.length <= 10) {
      onExtraFieldChange?.(fieldId, digits);
    }
  };

  const getBorderColor = () => {
    if (isFocused) return "border-blue-500";
    if (validation) return getFieldBorderColor(validation.status);
    return "border-gray-300";
  };

  const getAutoCompleteValue = (fieldId: string): string => {
    const autoCompleteMap: { [key: string]: string } = {
      // Personal information
      firstName: "given-name",
      lastName: "family-name",
      nickname: "given-name", // Changed from 'nickname' to 'given-name' (standard HTML value)
      email: "email",
      phone: "tel",
      lineId: "username",

      // Address information
      address: "street-address",
      province: "address-level1",
      district: "address-level2",
      subDistrict: "address-level3",
      postalCode: "postal-code",

      // Organization information
      organizationName: "organization",
      organizationType: "organization-title",
      position: "organization-title",

      // Default fallback
      default: "off",
    };

    return autoCompleteMap[fieldId] || "off";
  };

  const renderValidationMessage = () => {
    if (!validation) {
      const isConditionallyRequired = shouldFieldBeRequired(
        normalizedField,
        formData,
      );
      if (normalizedField.required || isConditionallyRequired) {
        return (
          <span className="text-sm text-gray-500 flex items-center">
            <svg
              className="w-4 h-4 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            กรุณากรอก{field.label}
          </span>
        );
      }
      return null;
    }

    if (validation.status === "valid") {
      return (
        <span className="text-sm text-green-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          {field.label}ถูกต้อง
        </span>
      );
    }

    if (validation.status === "invalid") {
      return (
        <span className="text-sm text-red-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {validation.message}
        </span>
      );
    }

    if (validation.status === "partial") {
      return (
        <span className="text-sm text-yellow-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          กรุณากรอก{field.label}ให้ครบถ้วน
        </span>
      );
    }

    return null;
  };

  const renderExtraFieldValidationMessage = (extraField: any, value: any) => {
    // Create a temporary field object for validation
    const tempField = {
      ...extraField,
      required: shouldFieldBeRequired({ id: extraField.id } as any, formData),
    };

    const validation = validateField(tempField, value, formData);

    if (!validation) {
      const isConditionallyRequired = shouldFieldBeRequired(
        { id: extraField.id } as any,
        formData,
      );
      if (isConditionallyRequired) {
        return (
          <span className="text-sm text-gray-500 flex items-center">
            <svg
              className="w-4 h-4 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            กรุณากรอก{extraField.label}
          </span>
        );
      }
      return null;
    }

    if (validation.status === "valid") {
      return (
        <span className="text-sm text-green-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          {extraField.label}ถูกต้อง
        </span>
      );
    }

    if (validation.status === "invalid") {
      return (
        <span className="text-sm text-red-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {validation.message}
        </span>
      );
    }

    if (validation.status === "partial") {
      return (
        <span className="text-sm text-yellow-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          กรุณากรอก{extraField.label}ให้ครบถ้วน
        </span>
      );
    }

    return null;
  };

  const renderField = () => {
    switch (normalizedField.type) {
      case "upload":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor={normalizedField.id}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  isDragOver
                    ? "border-blue-500 bg-blue-50"
                    : `${getBorderColor().replace("border-", "border-dashed-")} bg-gray-50 hover:bg-gray-100`
                }`}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg
                    className="w-8 h-8 mb-4 text-gray-500"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 20 16"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                    />
                  </svg>
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">คลิกเพื่ออัปโหลด</span>{" "}
                    หรือลากไฟล์มาวาง
                  </p>
                  <p className="text-xs text-gray-500">
                    JPG, JPEG, PNG (สูงสุด{" "}
                    {normalizedField.validation?.maxFileSize || 10}MB)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  id={normalizedField.id}
                  name={normalizedField.id}
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleFileChange}
                />
              </label>
            </div>
            {previewUrl && (
              <div className="relative">
                <div className="w-full h-48 bg-gray-50 rounded-lg border border-gray-200 shadow-sm overflow-hidden flex items-center justify-center">
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    width={200}
                    height={200}
                    className="w-full h-full object-contain"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onChange(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  ×
                </button>
              </div>
            )}
            {typeof window !== "undefined" && value instanceof File && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  ไฟล์ที่เลือก: {value.name} (
                  {(value.size / 1024 / 1024).toFixed(2)} MB)
                </p>
                {/* File size progress indicator */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      value.size >
                      (normalizedField.validation?.maxFileSize || 10) *
                        1024 *
                        1024 *
                        0.9
                        ? "bg-red-500"
                        : value.size >
                            (normalizedField.validation?.maxFileSize || 10) *
                              1024 *
                              1024 *
                              0.7
                          ? "bg-yellow-500"
                          : "bg-green-500"
                    }`}
                    style={{
                      width: `${Math.min((value.size / ((normalizedField.validation?.maxFileSize || 10) * 1024 * 1024)) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500">
                  ใช้พื้นที่ {(value.size / 1024 / 1024).toFixed(2)} MB จาก{" "}
                  {normalizedField.validation?.maxFileSize || 10} MB
                </p>
                {value.size >
                  (normalizedField.validation?.maxFileSize || 10) *
                    1024 *
                    1024 *
                    0.8 && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800">
                      💡 เคล็ดลับ: ไฟล์ขนาดใหญ่จะใช้เวลาอัปโหลดนานขึ้น
                      ลองลดขนาดภาพหรือใช้ไฟล์ที่มีความละเอียดต่ำลง
                    </p>
                  </div>
                )}
              </div>
            )}
            {/* Show file info for metadata objects (from localStorage) */}
            {value &&
              typeof value === "object" &&
              "name" in value &&
              !(typeof window !== "undefined" && value instanceof File) &&
              !("dataUrl" in value) && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                      />
                    </svg>
                    <span className="text-sm text-blue-800 font-medium">
                      {value.name}
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    {(value.size / 1024 / 1024).toFixed(2)} MB • {value.type}
                  </p>
                  <p className="text-xs text-blue-500 mt-1">
                    ไฟล์นี้ถูกอัปโหลดแล้ว กรุณาอัปโหลดใหม่หากต้องการเปลี่ยน
                  </p>
                </div>
              )}
            {/* Show file info for Supabase URLs */}
            {typeof value === "string" && value.startsWith("http") && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-sm text-green-800 font-medium">
                    ไฟล์อัปโหลดแล้ว
                  </span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  ไฟล์ถูกอัปโหลดไปยังเซิร์ฟเวอร์แล้ว
                </p>
                <p className="text-xs text-green-500 mt-1">
                  กรุณาอัปโหลดใหม่หากต้องการเปลี่ยน
                </p>
              </div>
            )}
            {renderValidationMessage()}
          </div>
        );

      case "select":
        return (
          <div className="space-y-1">
            <select
              id={normalizedField.id}
              name={normalizedField.id}
              value={value || ""}
              onChange={handleInputChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${getBorderColor()}`}
            >
              <option value="">กรุณาเลือก{normalizedField.label}</option>
              {normalizedField.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {renderValidationMessage()}
          </div>
        );

      case "tel":
        const phoneValidation = value ? validateThaiPhoneNumber(value) : null;
        const isPhoneValid = value && value.length === 10 && !phoneValidation;

        return (
          <div className="space-y-1">
            <input
              type="tel"
              id={normalizedField.id}
              name={normalizedField.id}
              autoComplete="tel"
              value={displayValue}
              onChange={handlePhoneChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={normalizedField.placeholder || "0812345678"}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${getBorderColor()}`}
            />
            {value && (
              <div className="flex items-center space-x-2">
                {isPhoneValid ? (
                  <span className="text-sm text-green-600 flex items-center">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    เบอร์โทรศัพท์ถูกต้อง
                  </span>
                ) : phoneValidation ? (
                  <span className="text-sm text-red-600 flex items-center">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {phoneValidation}
                  </span>
                ) : (
                  <span className="text-sm text-gray-500">
                    กรุณากรอกเบอร์โทรศัพท์ 10 หลัก
                  </span>
                )}
              </div>
            )}
          </div>
        );

      case "email":
        return (
          <div className="space-y-1">
            <input
              type="email"
              id={normalizedField.id}
              name={normalizedField.id}
              autoComplete="email"
              value={value || ""}
              onChange={handleInputChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={normalizedField.placeholder}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${getBorderColor()}`}
            />
            {renderValidationMessage()}
          </div>
        );

      case "province":
        return (
          <SearchableProvinceDropdown
            field={normalizedField}
            value={value}
            onChange={onChange}
            setIsFocused={setIsFocused}
            getBorderColor={getBorderColor}
          />
        );

      default:
        return (
          <div className="space-y-1">
            <input
              type="text"
              id={normalizedField.id}
              name={normalizedField.id}
              autoComplete={getAutoCompleteValue(normalizedField.id)}
              value={value || ""}
              onChange={handleInputChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={normalizedField.placeholder}
              maxLength={normalizedField.validation?.maxLength}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${getBorderColor()}`}
            />
            {renderValidationMessage()}
          </div>
        );
    }
  };

  return (
    <div className="space-y-2">
      <label
        htmlFor={normalizedField.id}
        className="block text-sm font-medium text-gray-700"
      >
        {normalizedField.label}
        {normalizedField.required && (
          <span className="text-red-500 ml-1">*</span>
        )}
      </label>

      {renderField()}

      {/* Render extra field if needed */}
      {normalizedField.extraField &&
        shouldShowExtraField(normalizedField, formData) && (
          <div className="mt-4 pl-4 border-l-2 border-blue-200">
            <label
              htmlFor={normalizedField.extraField.id}
              className="block text-sm font-medium text-gray-700"
            >
              {normalizedField.extraField.label}
              {(normalizedField.extraField.type === "tel" ||
                shouldFieldBeRequired(
                  { id: normalizedField.extraField.id } as any,
                  formData,
                )) && <span className="text-red-500 ml-1">*</span>}
            </label>

            {normalizedField.extraField.type === "tel" ? (
              <div className="space-y-1">
                <input
                  type="tel"
                  id={normalizedField.extraField.id}
                  name={normalizedField.extraField.id}
                  autoComplete="tel"
                  value={
                    formData[normalizedField.extraField.id]
                      ? formatThaiPhoneNumber(
                          formData[normalizedField.extraField.id],
                        )
                      : ""
                  }
                  onChange={(e) =>
                    handleExtraPhoneChange(normalizedField.extraField!.id, e)
                  }
                  placeholder="0812345678"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
                {formData[normalizedField.extraField.id] && (
                  <div className="flex items-center space-x-2">
                    {formData[normalizedField.extraField.id].length === 10 &&
                    !validateThaiPhoneNumber(
                      formData[normalizedField.extraField.id],
                    ) ? (
                      <span className="text-sm text-green-600 flex items-center">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        เบอร์โทรศัพท์ถูกต้อง
                      </span>
                    ) : validateThaiPhoneNumber(
                        formData[normalizedField.extraField.id],
                      ) ? (
                      <span className="text-sm text-red-600 flex items-center">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {validateThaiPhoneNumber(
                          formData[normalizedField.extraField.id],
                        )}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">
                        กรุณากรอกเบอร์โทรศัพท์ 10 หลัก
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <input
                  type="text"
                  id={normalizedField.extraField.id}
                  name={normalizedField.extraField.id}
                  autoComplete={getAutoCompleteValue(
                    normalizedField.extraField.id,
                  )}
                  value={formData[normalizedField.extraField.id] || ""}
                  onChange={(e) =>
                    onExtraFieldChange?.(
                      normalizedField.extraField!.id,
                      e.target.value,
                    )
                  }
                  placeholder={`กรุณากรอก${normalizedField.extraField.label}`}
                  maxLength={normalizedField.extraField.validation?.maxLength}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${getBorderColor()}`}
                />
                {renderExtraFieldValidationMessage(
                  normalizedField.extraField,
                  formData[normalizedField.extraField.id],
                )}
              </div>
            )}
          </div>
        )}
    </div>
  );
}
