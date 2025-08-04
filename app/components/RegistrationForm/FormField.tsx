'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
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
  // Ensure required is always a boolean - memoized to prevent infinite re-renders
  const normalizedField = useMemo(() => ({
    ...field,
    required: !!field.required
  }), [field]);
  
  const [validation, setValidation] = useState<any>(null);
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [displayValue, setDisplayValue] = useState<string>('');

  // Validate field on value change
  useEffect(() => {
    const result = validateField(normalizedField, value, formData);
    setValidation(result);
  }, [normalizedField, value, formData]);

  // Handle file preview
  useEffect(() => {
    if (normalizedField.type === 'upload') {
      if (value instanceof File) {
        const url = URL.createObjectURL(value);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
      } else if (value && typeof value === 'object' && 'dataUrl' in value) {
        // Handle base64 data URL from localStorage
        setPreviewUrl(value.dataUrl);
        return () => setPreviewUrl(null);
      } else {
        setPreviewUrl(null);
      }
    } else {
      setPreviewUrl(null);
    }
  }, [normalizedField.type, value]);

  // Handle phone number formatting
  useEffect(() => {
    if (normalizedField.type === 'tel' && value) {
      const digits = value.replace(/\D/g, '');
      setDisplayValue(formatThaiPhoneNumber(digits));
    } else if (normalizedField.type === 'tel') {
      setDisplayValue('');
    }
  }, [normalizedField.type, value]);

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

  const getAutoCompleteValue = (fieldId: string): string => {
    const autoCompleteMap: { [key: string]: string } = {
      // Personal information
      'firstName': 'given-name',
      'lastName': 'family-name',
      'nickname': 'given-name', // Changed from 'nickname' to 'given-name' (standard HTML value)
      'email': 'email',
      'phone': 'tel',
      'lineId': 'username',
      
      // Address information
      'address': 'street-address',
      'province': 'address-level1',
      'district': 'address-level2',
      'subDistrict': 'address-level3',
      'postalCode': 'postal-code',
      
      // Organization information
      'organizationName': 'organization',
      'organizationType': 'organization-title',
      'position': 'organization-title',
      
      // Default fallback
      'default': 'off'
    };
    
    return autoCompleteMap[fieldId] || 'off';
  };



  const renderValidationMessage = () => {
    if (!validation) {
      const isConditionallyRequired = shouldFieldBeRequired(normalizedField, formData);
      if (normalizedField.required || isConditionallyRequired) {
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
    switch (normalizedField.type) {
      case 'upload':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor={normalizedField.id}
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
            {/* Show file info for metadata objects (from localStorage) */}
            {value && typeof value === 'object' && 'name' in value && !(value instanceof File) && !('dataUrl' in value) && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="text-sm text-blue-800 font-medium">{value.name}</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  {(value.size / 1024 / 1024).toFixed(2)} MB • {value.type}
                </p>
                <p className="text-xs text-blue-500 mt-1">
                  ไฟล์นี้ถูกอัปโหลดแล้ว กรุณาอัปโหลดใหม่หากต้องการเปลี่ยน
                </p>
              </div>
            )}
            {renderValidationMessage()}
          </div>
        );

      case 'select':
        return (
          <div className="space-y-1">
            <select
              id={normalizedField.id}
              name={normalizedField.id}
              value={value || ''}
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

      case 'tel':
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
              id={normalizedField.id}
              name={normalizedField.id}
              autoComplete="email"
              value={value || ''}
              onChange={handleInputChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={normalizedField.placeholder}
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
              id={normalizedField.id}
              name={normalizedField.id}
              autoComplete={getAutoCompleteValue(normalizedField.id)}
              value={value || ''}
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
      <label htmlFor={normalizedField.id} className="block text-sm font-medium text-gray-700">
        {normalizedField.label}
        {normalizedField.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {renderField()}

      {/* Render extra field if needed */}
      {normalizedField.extraField && shouldShowExtraField(normalizedField, formData) && (
        <div className="mt-4 pl-4 border-l-2 border-blue-200">
                      <label htmlFor={normalizedField.extraField.id} className="block text-sm font-medium text-gray-700">
              {normalizedField.extraField.label}
              {(normalizedField.extraField.type === 'tel' || shouldFieldBeRequired({ id: normalizedField.extraField.id } as any, formData)) && <span className="text-red-500 ml-1">*</span>}
            </label>
          
                      {normalizedField.extraField.type === 'tel' ? (
            <div className="space-y-1">
              <input
                type="tel"
                id={normalizedField.extraField.id}
                name={normalizedField.extraField.id}
                autoComplete="tel"
                value={formData[normalizedField.extraField.id] ? formatThaiPhoneNumber(formData[normalizedField.extraField.id]) : ''}
                onChange={(e) => handleExtraPhoneChange(normalizedField.extraField!.id, e)}
                placeholder="0812345678"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
              {formData[normalizedField.extraField.id] && (
                <div className="flex items-center space-x-2">
                  {formData[normalizedField.extraField.id].length === 10 && !validateThaiPhoneNumber(formData[normalizedField.extraField.id]) ? (
                    <span className="text-sm text-green-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      เบอร์โทรศัพท์ถูกต้อง
                    </span>
                  ) : validateThaiPhoneNumber(formData[normalizedField.extraField.id]) ? (
                    <span className="text-sm text-red-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {validateThaiPhoneNumber(formData[normalizedField.extraField.id])}
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
                autoComplete={getAutoCompleteValue(normalizedField.extraField.id)}
                value={formData[normalizedField.extraField.id] || ''}
                onChange={(e) => onExtraFieldChange?.(normalizedField.extraField!.id, e.target.value)}
                placeholder={`กรุณากรอก${normalizedField.extraField.label}`}
                maxLength={normalizedField.extraField.validation?.maxLength}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${getBorderColor()}`}
              />
              {renderExtraFieldValidationMessage(normalizedField.extraField, formData[normalizedField.extraField.id])}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 