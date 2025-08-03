'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { FormField as FormFieldType } from './FormSchema';
import { validateField, getFieldBorderColor, getFieldTextColor, shouldShowExtraField } from './formValidation';

interface FormFieldProps {
  field: FormFieldType;
  value: any;
  onChange: (value: any) => void;
  formData: { [key: string]: any };
  onExtraFieldChange?: (fieldId: string, value: any) => void;
}

export default function FormField({ field, value, onChange, formData, onExtraFieldChange }: FormFieldProps) {
  const [validation, setValidation] = useState<any>(null);
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Validate field on value change
  useEffect(() => {
    const result = validateField(field, value, formData);
    setValidation(result);
  }, [field, value, formData]);

  // Handle file preview
  useEffect(() => {
    if (field.type === 'upload' && value instanceof File) {
      const url = URL.createObjectURL(value);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [field.type, value]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onChange(file);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  const getBorderColor = () => {
    if (isFocused) return 'border-blue-500';
    if (validation) return getFieldBorderColor(validation.status);
    return 'border-gray-300';
  };

  const getTextColor = () => {
    if (validation) return getFieldTextColor(validation.status);
    return 'text-gray-600';
  };

  const renderField = () => {
    switch (field.type) {
      case 'upload':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor={field.id}
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                  </svg>
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">คลิกเพื่ออัปโหลด</span> หรือลากไฟล์มาวาง
                  </p>
                  <p className="text-xs text-gray-500">JPG, JPEG, PNG (สูงสุด 10MB)</p>
                </div>
                <input
                  ref={fileInputRef}
                  id={field.id}
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleFileChange}
                />
              </label>
            </div>
            {previewUrl && (
              <div className="relative">
                <Image
                  src={previewUrl}
                  alt="Preview"
                  width={400}
                  height={192}
                  className="w-full h-48 object-cover rounded-lg border"
                />
                <button
                  type="button"
                  onClick={() => {
                    onChange(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  ×
                </button>
              </div>
            )}
            {value && (
              <p className="text-sm text-gray-600">
                ไฟล์ที่เลือก: {value.name} ({(value.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
        );

      case 'select':
        return (
          <select
            id={field.id}
            value={value || ''}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${getBorderColor()}`}
          >
            <option value="">กรุณาเลือก{field.label}</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'tel':
        return (
          <input
            type="tel"
            id={field.id}
            value={value || ''}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={field.placeholder}
            maxLength={10}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${getBorderColor()}`}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            id={field.id}
            value={value || ''}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={field.placeholder}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${getBorderColor()}`}
          />
        );

      default:
        return (
          <input
            type="text"
            id={field.id}
            value={value || ''}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={field.placeholder}
            maxLength={field.validation?.maxLength}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${getBorderColor()}`}
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
      
      {validation && validation.message && (
        <p className={`text-sm ${getTextColor()}`}>
          {validation.message}
        </p>
      )}

      {/* Render extra field if needed */}
      {field.extraField && shouldShowExtraField(field, formData) && (
        <div className="mt-4 pl-4 border-l-2 border-blue-200">
          <label htmlFor={field.extraField.id} className="block text-sm font-medium text-gray-700">
            {field.extraField.label}
            {field.extraField.type === 'tel' && <span className="text-red-500 ml-1">*</span>}
          </label>
          
          {field.extraField.type === 'tel' ? (
            <input
              type="tel"
              id={field.extraField.id}
              value={formData[field.extraField.id] || ''}
              onChange={(e) => onExtraFieldChange?.(field.extraField!.id, e.target.value)}
              placeholder="0812345678"
              maxLength={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          ) : (
            <input
              type="text"
              id={field.extraField.id}
              value={formData[field.extraField.id] || ''}
              onChange={(e) => onExtraFieldChange?.(field.extraField!.id, e.target.value)}
              placeholder={`กรุณากรอก${field.extraField.label}`}
              maxLength={field.extraField.validation?.maxLength}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          )}
        </div>
      )}
    </div>
  );
} 