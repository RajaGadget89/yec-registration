'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import TopMenuBar from '../components/TopMenuBar';
import Footer from '../components/Footer';
import { FormData, formSchema } from '../components/RegistrationForm/FormSchema';

export default function PreviewPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData | null>(null);
  const [pdpaConsent, setPdpaConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load form data from localStorage on component mount
  useEffect(() => {
    const storedData = localStorage.getItem('yecRegistrationData');
    if (!storedData) {
      router.push('/');
      return;
    }

    try {
      const parsedData = JSON.parse(storedData);
      
      // Validate that parsedData is an object
      if (typeof parsedData !== 'object' || parsedData === null) {
        console.error('Invalid form data structure:', parsedData);
        router.push('/');
        return;
      }

      // Ensure all expected fields exist with proper defaults
      const validatedData = { ...parsedData };
      
      // Set default values for missing fields to prevent rendering errors
      formSchema.forEach(field => {
        if (!(field.id in validatedData)) {
          validatedData[field.id] = '';
        }
      });

      setFormData(validatedData);
    } catch (err) {
      console.error('Error parsing stored form data:', err);
      router.push('/');
    }
  }, [router]);

  // Get field label from schema
  const getFieldLabel = (fieldId: string): string => {
    // First check if it's a main field
    const field = formSchema.find(f => f.id === fieldId);
    if (field) {
      return field.label;
    }
    
    // Check if it's an extraField
    for (const schemaField of formSchema) {
      if (schemaField.extraField && schemaField.extraField.id === fieldId) {
        return schemaField.extraField.label;
      }
      if (schemaField.roommatePhoneField && schemaField.roommatePhoneField.id === fieldId) {
        return schemaField.roommatePhoneField.label;
      }
    }
    
    // Fallback to fieldId if not found
    return fieldId;
  };

  // Get option label for select fields
  const getOptionLabel = (fieldId: string, value: string): string => {
    const field = formSchema.find(f => f.id === fieldId);
    if (!field?.options) return value;
    
    const option = field.options.find(opt => opt.value === value);
    return option?.label || value;
  };

  // Handle edit button click
  const handleEdit = () => {
    if (formData) {
          // Save current form data to sessionStorage for edit mode
    try {
      // Convert base64 data URLs to regular file metadata for edit mode
      const editData = { ...formData };
      const fileFields = ['profileImage', 'chamberCard', 'paymentSlip'];
      
      fileFields.forEach(fieldId => {
        if (editData[fieldId] && typeof editData[fieldId] === 'object' && 'dataUrl' in editData[fieldId]) {
          // Keep the dataUrl for image display in edit mode
          // The FormField component will handle showing the image
        }
      });
      
      sessionStorage.setItem('yecEditData', JSON.stringify(editData));
      // Redirect to home page with edit parameter and form section anchor
      window.location.href = '/?edit=true#form';
    } catch (err) {
      console.error('Error saving form data for edit:', err);
      // Fallback to home page
      router.push('/');
    }
    } else {
      // If no form data, just go to home page
      router.push('/');
    }
  };

  // Handle submit button click
  const handleSubmit = async () => {
    if (!pdpaConsent) {
      setError('กรุณายอมรับเงื่อนไขการเก็บข้อมูลส่วนบุคคล (PDPA)');
      return;
    }

    if (!formData) {
      setError('ไม่พบข้อมูลการลงทะเบียน');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        // Clear localStorage after successful submission
        localStorage.removeItem('yecRegistrationData');
        router.push(`/success?id=${result.registrationId}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'เกิดข้อผิดพลาดในการส่งข้อมูล');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการส่งข้อมูล');
      console.error('Submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render field value based on type
  const renderFieldValue = (fieldId: string, value: any) => {
    if (!value) return <span className="text-gray-400">ไม่ระบุ</span>;

    const field = formSchema.find(f => f.id === fieldId);
    
    // Handle File objects (upload fields)
    if (field?.type === 'upload') {
      if (value instanceof File) {
        return (
          <div className="mt-2">
            <div className="w-full h-48 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center">
              <Image
                src={URL.createObjectURL(value)}
                alt={field.label}
                width={200}
                height={200}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        );
      } else if (value && typeof value === 'object' && 'name' in value) {
        // Handle file metadata from localStorage
        if ('dataUrl' in value) {
          // Show actual image if we have base64 data
          return (
            <div className="mt-2">
              <div className="w-full h-48 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center">
                <Image
                  src={value.dataUrl}
                  alt={field.label}
                  width={200}
                  height={200}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                <p className="text-xs text-gray-600">{value.name}</p>
                <p className="text-xs text-gray-500">
                  {(value.size / 1024 / 1024).toFixed(2)} MB • {value.type}
                </p>
              </div>
            </div>
          );
        } else {
          // Show file info only if no image data
          return (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span className="text-sm text-gray-700">{value.name}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {(value.size / 1024 / 1024).toFixed(2)} MB • {value.type}
              </p>
            </div>
          );
        }
      }
    }

    // Handle select fields
    if (field?.type === 'select') {
      return <span>{getOptionLabel(fieldId, value)}</span>;
    }

    // Handle objects and arrays - convert to string
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return <span>{value.join(', ')}</span>;
      }
      // For plain objects, try to get a meaningful string representation
      const objectKeys = Object.keys(value);
      if (objectKeys.length === 0) {
        return <span className="text-gray-400">ไม่ระบุ</span>;
      }
      // If it's a simple object with one key, show the value
      if (objectKeys.length === 1) {
        const key = objectKeys[0];
        const objectValue = value[key];
        if (typeof objectValue === 'string' || typeof objectValue === 'number') {
          return <span>{objectValue}</span>;
        }
      }
      // For complex objects, show a generic message
      return <span className="text-gray-400">ข้อมูลไม่สามารถแสดงได้</span>;
    }

    // Handle primitive values
    return <span>{String(value)}</span>;
  };

  // Group fields for better layout
  const personalFields = ['title', 'firstName', 'lastName', 'nickname', 'phone', 'lineId', 'email'];
  const businessFields = ['companyName', 'businessType'];
  const accommodationFields = ['roomType'];
  const uploadFields = ['profileImage', 'chamberCard', 'paymentSlip'];
  const otherFields = ['yecProvince', 'travelType'];

  // Helper function to check if businessTypeOther should be shown
  const shouldShowBusinessTypeOther = () => {
    const businessType = getFieldValue('businessType');
    return businessType === 'other';
  };

  // Helper function to check if roommateInfo should be shown
  const shouldShowRoommateInfo = () => {
    const roomType = getFieldValue('roomType');
    return roomType === 'double';
  };

  // Helper function to check if roommatePhone should be shown
  const shouldShowRoommatePhone = () => {
    const roomType = getFieldValue('roomType');
    return roomType === 'double';
  };

  // Helper function to safely get field value
  const getFieldValue = (fieldId: string) => {
    return formData?.[fieldId] || '';
  };

  if (!formData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopMenuBar />
        <div className="pt-20 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yec-primary mx-auto mb-4"></div>
            <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopMenuBar />
      
      <main className="pt-20 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-yec-primary mb-4">
              ตรวจสอบข้อมูลการลงทะเบียน
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนยืนยันการลงทะเบียน
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Form Data Display */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Personal Information */}
              <div>
                <h2 className="text-xl font-semibold text-yec-primary mb-4 border-b border-gray-200 pb-2">
                  ข้อมูลส่วนตัว
                </h2>
                <div className="space-y-4">
                  {personalFields.map(fieldId => (
                    <div key={fieldId} className="flex flex-col">
                      <label className="text-sm font-medium text-gray-700 mb-1">
                        {getFieldLabel(fieldId)}
                      </label>
                      <div className="text-gray-900">
                        {renderFieldValue(fieldId, getFieldValue(fieldId))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Business Information */}
              <div>
                <h2 className="text-xl font-semibold text-yec-primary mb-4 border-b border-gray-200 pb-2">
                  ข้อมูลธุรกิจ
                </h2>
                <div className="space-y-4">
                  {businessFields.map(fieldId => (
                    <div key={fieldId} className="flex flex-col">
                      <label className="text-sm font-medium text-gray-700 mb-1">
                        {getFieldLabel(fieldId)}
                      </label>
                      <div className="text-gray-900">
                        {renderFieldValue(fieldId, getFieldValue(fieldId))}
                      </div>
                    </div>
                  ))}
                  
                  {/* Conditionally show businessTypeOther field */}
                  {shouldShowBusinessTypeOther() && (
                    <div className="flex flex-col">
                      <label className="text-sm font-medium text-gray-700 mb-1">
                        {getFieldLabel('businessTypeOther')}
                      </label>
                      <div className="text-gray-900">
                        {renderFieldValue('businessTypeOther', getFieldValue('businessTypeOther'))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Accommodation Information */}
              <div>
                <h2 className="text-xl font-semibold text-yec-primary mb-4 border-b border-gray-200 pb-2">
                  ข้อมูลที่พัก
                </h2>
                <div className="space-y-4">
                  {accommodationFields.map(fieldId => (
                    <div key={fieldId} className="flex flex-col">
                      <label className="text-sm font-medium text-gray-700 mb-1">
                        {getFieldLabel(fieldId)}
                      </label>
                      <div className="text-gray-900">
                        {renderFieldValue(fieldId, getFieldValue(fieldId))}
                      </div>
                    </div>
                  ))}
                  
                  {/* Conditionally show roommateInfo field */}
                  {shouldShowRoommateInfo() && (
                    <div className="flex flex-col">
                      <label className="text-sm font-medium text-gray-700 mb-1">
                        {getFieldLabel('roommateInfo')}
                      </label>
                      <div className="text-gray-900">
                        {renderFieldValue('roommateInfo', getFieldValue('roommateInfo'))}
                      </div>
                    </div>
                  )}
                  
                  {/* Conditionally show roommatePhone field */}
                  {shouldShowRoommatePhone() && (
                    <div className="flex flex-col">
                      <label className="text-sm font-medium text-gray-700 mb-1">
                        {getFieldLabel('roommatePhone')}
                      </label>
                      <div className="text-gray-900">
                        {renderFieldValue('roommatePhone', getFieldValue('roommatePhone'))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Other Information */}
              <div>
                <h2 className="text-xl font-semibold text-yec-primary mb-4 border-b border-gray-200 pb-2">
                  ข้อมูลอื่นๆ
                </h2>
                <div className="space-y-4">
                  {otherFields.map(fieldId => (
                    <div key={fieldId} className="flex flex-col">
                      <label className="text-sm font-medium text-gray-700 mb-1">
                        {getFieldLabel(fieldId)}
                      </label>
                      <div className="text-gray-900">
                        {renderFieldValue(fieldId, getFieldValue(fieldId))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Upload Fields - Full Width */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-yec-primary mb-4 border-b border-gray-200 pb-2">
                เอกสารแนบ
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {uploadFields.map(fieldId => (
                  <div key={fieldId} className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-2">
                      {getFieldLabel(fieldId)}
                    </label>
                    <div className="text-gray-900">
                      {renderFieldValue(fieldId, getFieldValue(fieldId))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PDPA Consent */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="pdpa-consent"
                checked={pdpaConsent}
                onChange={(e) => setPdpaConsent(e.target.checked)}
                className="mt-1 h-4 w-4 text-yec-primary border-gray-300 rounded focus:ring-yec-primary focus:ring-2"
              />
              <div className="flex-1">
                <label htmlFor="pdpa-consent" className="text-sm font-medium text-gray-700 mb-2 block">
                  การยินยอมการเก็บข้อมูลส่วนบุคคล (PDPA)
                </label>
                <p className="text-sm text-gray-600 leading-relaxed">
                  ข้าพเจ้ายินยอมให้เก็บ ใช้ และเปิดเผยข้อมูลส่วนบุคคลของข้าพเจ้าเพื่อวัตถุประสงค์ในการลงทะเบียนและเข้าร่วมงาน YEC Day ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleEdit}
              disabled={isSubmitting}
              className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              แก้ไขข้อมูล
            </button>
            <button
              onClick={handleSubmit}
              disabled={!pdpaConsent || isSubmitting}
              className="px-8 py-3 bg-yec-primary hover:bg-yec-accent text-white font-semibold rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>กำลังส่งข้อมูล...</span>
                </div>
              ) : (
                'ยืนยันการลงทะเบียน'
              )}
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
} 