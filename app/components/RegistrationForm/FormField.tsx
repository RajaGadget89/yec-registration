'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { FormField as FormFieldType } from './FormSchema';
import { validateField, getFieldBorderColor, shouldShowExtraField, shouldFieldBeRequired, validateThaiPhoneNumber, formatThaiPhoneNumber } from './formValidation';

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
  const [displayValue, setDisplayValue] = useState<string>('');

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

  // Handle phone number formatting
  useEffect(() => {
    if (field.type === 'tel' && value) {
      const digits = value.replace(/\D/g, '');
      setDisplayValue(formatThaiPhoneNumber(digits));
    } else if (field.type === 'tel') {
      setDisplayValue('');
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

  const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target.value;
    const digits = input.replace(/\D/g, '');
    
    // Limit to 10 digits
    if (digits.length <= 10) {
      onChange(digits);
    }
  };

  const handleExtraPhoneChange = (fieldId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target.value;
    const digits = input.replace(/\D/g, '');
    
    // Limit to 10 digits
    if (digits.length <= 10) {
      onExtraFieldChange?.(fieldId, digits);
    }
  };

  const getBorderColor = () => {
    if (isFocused) return 'border-blue-500';
    if (validation) return getFieldBorderColor(validation.status);
    return 'border-gray-300';
  };



  const renderValidationMessage = () => {
    if (!validation) {
      const isConditionallyRequired = shouldFieldBeRequired(field, formData);
      if (field.required || isConditionallyRequired) {
        return (
          <span className="text-sm text-gray-500 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            กรุณากรอก{field.label}
          </span>
        );
      }
      return null;
    }

    if (validation.status === 'valid') {
      return (
        <span className="text-sm text-green-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          {field.label}ถูกต้อง
        </span>
      );
    }

    if (validation.status === 'invalid') {
      return (
        <span className="text-sm text-red-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {validation.message}
        </span>
      );
    }

    if (validation.status === 'partial') {
      return (
        <span className="text-sm text-yellow-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
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
      const isConditionallyRequired = shouldFieldBeRequired({ id: extraField.id } as any, formData);
      if (isConditionallyRequired) {
        return (
          <span className="text-sm text-gray-500 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            กรุณากรอก{extraField.label}
          </span>
        );
      }
      return null;
    }

    if (validation.status === 'valid') {
      return (
        <span className="text-sm text-green-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          {extraField.label}ถูกต้อง
        </span>
      );
    }

    if (validation.status === 'invalid') {
      return (
        <span className="text-sm text-red-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {validation.message}
        </span>
      );
    }

    if (validation.status === 'partial') {
      return (
        <span className="text-sm text-yellow-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          กรุณากรอก{extraField.label}ให้ครบถ้วน
        </span>
      );
    }

    return null;
  };

  const renderField = () => {
    switch (field.type) {
      case 'upload':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor={field.id}
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors ${getBorderColor().replace('border-', 'border-dashed-')}`}
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
                  width={800}
                  height={600}
                  className="w-full h-auto max-h-96 object-contain rounded-lg border border-gray-200 shadow-sm"
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
            {renderValidationMessage()}
          </div>
        );

      case 'select':
        return (
          <div className="space-y-1">
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
            {renderValidationMessage()}
          </div>
        );

      case 'tel':
        const phoneValidation = value ? validateThaiPhoneNumber(value) : null;
        const isPhoneValid = value && value.length === 10 && !phoneValidation;
        
        return (
          <div className="space-y-1">
            <input
              type="tel"
              id={field.id}
              value={displayValue}
              onChange={handlePhoneChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={field.placeholder || "0812345678"}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${getBorderColor()}`}
            />
            {value && (
              <div className="flex items-center space-x-2">
                {isPhoneValid ? (
                  <span className="text-sm text-green-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    เบอร์โทรศัพท์ถูกต้อง
                  </span>
                ) : phoneValidation ? (
                  <span className="text-sm text-red-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
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

      case 'email':
        return (
          <div className="space-y-1">
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
            {renderValidationMessage()}
          </div>
        );

      default:
        return (
          <div className="space-y-1">
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
            {renderValidationMessage()}
          </div>
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

      {/* Render extra field if needed */}
      {field.extraField && shouldShowExtraField(field, formData) && (
        <div className="mt-4 pl-4 border-l-2 border-blue-200">
          <label htmlFor={field.extraField.id} className="block text-sm font-medium text-gray-700">
            {field.extraField.label}
            {(field.extraField.type === 'tel' || shouldFieldBeRequired({ id: field.extraField.id } as any, formData)) && <span className="text-red-500 ml-1">*</span>}
          </label>
          
          {field.extraField.type === 'tel' ? (
            <div className="space-y-1">
              <input
                type="tel"
                id={field.extraField.id}
                value={formData[field.extraField.id] ? formatThaiPhoneNumber(formData[field.extraField.id]) : ''}
                onChange={(e) => handleExtraPhoneChange(field.extraField!.id, e)}
                placeholder="0812345678"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
              {formData[field.extraField.id] && (
                <div className="flex items-center space-x-2">
                  {formData[field.extraField.id].length === 10 && !validateThaiPhoneNumber(formData[field.extraField.id]) ? (
                    <span className="text-sm text-green-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      เบอร์โทรศัพท์ถูกต้อง
                    </span>
                  ) : validateThaiPhoneNumber(formData[field.extraField.id]) ? (
                    <span className="text-sm text-red-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {validateThaiPhoneNumber(formData[field.extraField.id])}
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
                id={field.extraField.id}
                value={formData[field.extraField.id] || ''}
                onChange={(e) => onExtraFieldChange?.(field.extraField!.id, e.target.value)}
                placeholder={`กรุณากรอก${field.extraField.label}`}
                maxLength={field.extraField.validation?.maxLength}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${getBorderColor()}`}
              />
              {renderExtraFieldValidationMessage(field.extraField, formData[field.extraField.id])}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 