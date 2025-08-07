'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import TopMenuBar from '../components/TopMenuBar';
import Footer from '../components/Footer';
import Modal from '../components/Modal';
import FadeInStagger from '../components/animations/FadeInStagger';
import SlideUp from '../components/animations/SlideUp';
import { FormData, formSchema } from '../components/RegistrationForm/FormSchema';

export default function PreviewPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData | null>(null);
  const [pdpaConsent, setPdpaConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load form data from localStorage on component mount
  useEffect(() => {
    console.log('Preview page mounted - Loading form data'); // Debug log
    
    const storedData = localStorage.getItem('yecRegistrationData');
    if (!storedData) {
      console.log('No stored data found, redirecting to home'); // Debug log
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

      console.log('Form data loaded successfully:', validatedData); // Debug log
      console.log('Hotel choice:', validatedData.hotelChoice); // Debug hotel choice
      console.log('Room type:', validatedData.roomType); // Debug room type
      console.log('External hotel name:', validatedData.external_hotel_name); // Debug external hotel
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
  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Edit button clicked - Starting edit process'); // Debug log
    
    if (formData) {
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
        
        // Store edit data in sessionStorage
        sessionStorage.setItem('yecEditData', JSON.stringify(editData));
        console.log('Edit data stored in sessionStorage'); // Debug log
        
        // Clear any existing localStorage data to prevent conflicts
        localStorage.removeItem('yecRegistrationData');
        
        // Use router.push for better navigation control
        router.push('/?edit=true#form');
        
        console.log('Navigation to edit mode initiated'); // Debug log
      } catch (err) {
        console.error('Error saving form data for edit:', err);
        // Fallback to home page
        router.push('/');
      }
    } else {
      console.log('No form data found, navigating to home page'); // Debug log
      // If no form data, just go to home page
      router.push('/');
    }
  };

  // Handle submit button click
  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Submit button clicked, PDPA consent:', pdpaConsent); // Debug log
    
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
      console.log('Making API call to /api/register'); // Debug log
      
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      console.log('API response status:', response.status); // Debug log

      if (response.ok) {
        const result = await response.json();
        console.log('Registration successful, result:', result); // Debug log
        
        // Clear localStorage after successful submission
        localStorage.removeItem('yecRegistrationData');
        
        // Add fade transition effect
        const mainElement = document.querySelector('main');
        if (mainElement) {
          mainElement.style.transition = 'opacity 0.5s ease-out';
          mainElement.style.opacity = '0';
        }
        
        // Navigate to success page after fade with badge URL and email status if available
        setTimeout(() => {
          let successUrl = `/success?id=${result.registrationId}`;
          
          if (result.badgeUrl) {
            successUrl += `&badgeUrl=${encodeURIComponent(result.badgeUrl)}`;
          }
          
          if (result.emailSent !== undefined) {
            successUrl += `&email=${result.emailSent}`;
          }
          
          router.push(successUrl);
        }, 500);
      } else {
        const errorData = await response.json();
        console.error('API error response:', errorData); // Debug log
        throw new Error(errorData.message || 'เกิดข้อผิดพลาดในการส่งข้อมูล');
      }
    } catch (err) {
      console.error('Submission error:', err);
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการส่งข้อมูล');
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
      if (typeof window !== 'undefined' && value instanceof File) {
        return (
          <div className="mt-2">
            <div className="w-full h-48 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden flex items-center justify-center">
              <Image
                src={typeof window !== 'undefined' ? URL.createObjectURL(value) : ''}
                alt={field.label}
                width={200}
                height={200}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        );
      } else if (typeof value === 'string' && value.startsWith('http')) {
        // New format: URL from Supabase
        return (
          <div className="mt-2">
            <div className="w-full h-48 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden flex items-center justify-center">
              <Image
                src={value}
                alt={field.label}
                width={200}
                height={200}
                className="w-full h-full object-contain"
                onError={(e) => {
                  console.error('Failed to load image from URL:', value);
                  e.currentTarget.style.display = 'none';
                  const errorDiv = document.createElement('div');
                  errorDiv.className = 'flex items-center justify-center w-full h-full text-red-500 text-sm';
                  errorDiv.innerHTML = 'ไม่สามารถโหลดรูปภาพได้';
                  e.currentTarget.parentElement?.appendChild(errorDiv);
                }}
              />
            </div>
            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
              <p className="text-xs text-gray-600 dark:text-gray-400">ไฟล์อัปโหลดแล้ว</p>
            </div>
          </div>
        );
      } else if (value && typeof value === 'object' && 'name' in value) {
        // Old format: file metadata from localStorage (backward compatibility)
        if ('dataUrl' in value) {
          // Show actual image if we have base64 data
          return (
            <div className="mt-2">
              <div className="w-full h-48 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden flex items-center justify-center">
                <Image
                  src={value.dataUrl}
                  alt={field.label}
                  width={200}
                  height={200}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                <p className="text-xs text-gray-600 dark:text-gray-400">{value.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {(value.size / 1024 / 1024).toFixed(2)} MB • {value.type}
                </p>
              </div>
            </div>
          );
        } else {
          // Show file info only if no image data
          return (
            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span className="text-sm text-gray-700 dark:text-gray-300">{value.name}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
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
  const uploadFields = ['profileImage', 'chamberCard', 'paymentSlip'];
  const otherFields = ['yecProvince', 'travelType'];

  // Helper function to check if businessTypeOther should be shown
  const shouldShowBusinessTypeOther = () => {
    const businessType = getFieldValue('businessType');
    return businessType === 'other';
  };

  // Helper function to check if roommateInfo should be shown
  const shouldShowRoommateInfo = () => {
    const hotelChoice = getFieldValue('hotelChoice');
    const roomType = getFieldValue('roomType');
    return hotelChoice === 'in-quota' && roomType === 'double';
  };

  // Helper function to check if roommatePhone should be shown
  const shouldShowRoommatePhone = () => {
    const hotelChoice = getFieldValue('hotelChoice');
    const roomType = getFieldValue('roomType');
    return hotelChoice === 'in-quota' && roomType === 'double';
  };

  // Helper function to safely get field value
  const getFieldValue = (fieldId: string) => {
    return formData?.[fieldId] || '';
  };

  if (!formData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <TopMenuBar />
        <div className="pt-24 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yec-primary mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <TopMenuBar />
      
      <main className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <FadeInStagger delay={100} className="text-center mb-8">
            <div className="bg-gradient-to-r from-yec-primary/10 to-yec-accent/10 dark:from-yec-primary/20 dark:to-yec-accent/20 rounded-2xl p-8 border border-yec-primary/20 dark:border-yec-primary/30">
              <div className="flex items-center justify-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-yec-primary/20 dark:bg-yec-primary/30 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-yec-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-yec-primary">
                  ตรวจสอบข้อมูลการลงทะเบียน
                </h1>
              </div>
              <p className="text-lg text-gray-700 dark:text-gray-300 max-w-2xl mx-auto font-medium">
                กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนยืนยันการลงทะเบียน
              </p>
              <div className="w-24 h-1 bg-gradient-to-r from-yec-primary to-yec-accent mx-auto mt-4 rounded-full"></div>
            </div>
          </FadeInStagger>

          {/* Error Modal */}
          <Modal
            isOpen={!!error}
            onClose={() => setError(null)}
            title="เกิดข้อผิดพลาด"
          >
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 mb-4">
                <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-gray-700 dark:text-gray-300">{error}</p>
            </div>
          </Modal>

          {/* Form Data Display */}
          <FadeInStagger delay={50} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden mb-8">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-yec-primary/5 to-yec-accent/5 dark:from-yec-primary/10 dark:to-yec-accent/10 px-8 py-6 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-yec-primary/10 dark:bg-yec-primary/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-yec-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    ข้อมูลการลงทะเบียน
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนยืนยัน
                  </p>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-8">
              <div className="flex flex-col lg:flex-row gap-8">
                
                {/* Left Column */}
                <div className="flex-1 space-y-8">
                  {/* Personal Information */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 border border-gray-100 dark:border-gray-600">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        ข้อมูลส่วนตัว
                      </h3>
                    </div>
                    <div className="space-y-5">
                      {personalFields.map(fieldId => (
                        <div key={fieldId} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-600">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">
                                {getFieldLabel(fieldId)}
                              </label>
                              <div className="text-base font-medium text-gray-900 dark:text-white">
                                {renderFieldValue(fieldId, getFieldValue(fieldId))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Other Information */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 border border-gray-100 dark:border-gray-600">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        ข้อมูลอื่นๆ
                      </h3>
                    </div>
                    <div className="space-y-5">
                      {otherFields.map(fieldId => (
                        <div key={fieldId} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-600">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">
                                {getFieldLabel(fieldId)}
                              </label>
                              <div className="text-base font-medium text-gray-900 dark:text-white">
                                {renderFieldValue(fieldId, getFieldValue(fieldId))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="flex-1 space-y-8">
                  {/* Business Information */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 border border-gray-100 dark:border-gray-600">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        ข้อมูลธุรกิจ
                      </h3>
                    </div>
                    <div className="space-y-5">
                      {businessFields.map(fieldId => (
                        <div key={fieldId} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-600">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">
                                {getFieldLabel(fieldId)}
                              </label>
                              <div className="text-base font-medium text-gray-900 dark:text-white">
                                {renderFieldValue(fieldId, getFieldValue(fieldId))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Conditionally show businessTypeOther field */}
                      {shouldShowBusinessTypeOther() && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-600">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">
                                {getFieldLabel('businessTypeOther')}
                              </label>
                              <div className="text-base font-medium text-gray-900 dark:text-white">
                                {renderFieldValue('businessTypeOther', getFieldValue('businessTypeOther'))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Accommodation Information */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 border border-gray-100 dark:border-gray-600">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        ข้อมูลที่พัก
                      </h3>
                    </div>
                    <div className="space-y-5">
                      {/* Hotel Choice - Always shown */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-600">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">
                              {getFieldLabel('hotelChoice')}
                            </label>
                            <div className="text-base font-medium text-gray-900 dark:text-white">
                              {renderFieldValue('hotelChoice', getFieldValue('hotelChoice'))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Room Type - Only shown when hotelChoice is 'in-quota' */}
                      {getFieldValue('hotelChoice') === 'in-quota' && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-600">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">
                                {getFieldLabel('roomType')}
                              </label>
                              <div className="text-base font-medium text-gray-900 dark:text-white">
                                {renderFieldValue('roomType', getFieldValue('roomType'))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* External Hotel Name - Only shown when hotelChoice is 'out-of-quota' */}
                      {getFieldValue('hotelChoice') === 'out-of-quota' && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-600">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">
                                {getFieldLabel('external_hotel_name')}
                              </label>
                              <div className="text-base font-medium text-gray-900 dark:text-white">
                                {renderFieldValue('external_hotel_name', getFieldValue('external_hotel_name'))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Conditionally show roommateInfo field */}
                      {shouldShowRoommateInfo() && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-600">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">
                                {getFieldLabel('roommateInfo')}
                              </label>
                              <div className="text-base font-medium text-gray-900 dark:text-white">
                                {renderFieldValue('roommateInfo', getFieldValue('roommateInfo'))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Conditionally show roommatePhone field */}
                      {shouldShowRoommatePhone() && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-600">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">
                                {getFieldLabel('roommatePhone')}
                              </label>
                              <div className="text-base font-medium text-gray-900 dark:text-white">
                                {renderFieldValue('roommatePhone', getFieldValue('roommatePhone'))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Fields - Full Width */}
              <div className="mt-8">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 border border-gray-100 dark:border-gray-600">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      เอกสารแนบ
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {uploadFields.map(fieldId => (
                      <div key={fieldId} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-600">
                        <div className="flex flex-col">
                          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 block">
                            {getFieldLabel(fieldId)}
                          </label>
                          <div className="text-gray-900 dark:text-white">
                            {renderFieldValue(fieldId, getFieldValue(fieldId))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeInStagger>

          {/* PDPA Consent - Enhanced */}
          <SlideUp delay={200} className="bg-gradient-to-r from-yec-primary/5 to-yec-accent/5 dark:from-yec-primary/10 dark:to-yec-accent/10 border-2 border-yec-primary/20 dark:border-yec-primary/30 rounded-xl shadow-lg p-8 mb-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-yec-primary/10 dark:bg-yec-primary/20 rounded-full mb-4">
                <svg className="w-8 h-8 text-yec-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-yec-primary mb-2">
                การยินยอมการเก็บข้อมูลส่วนบุคคล (PDPA)
              </h3>
              <div className="w-24 h-1 bg-yec-accent mx-auto rounded-full"></div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-600">
              <p className="text-lg text-gray-800 dark:text-gray-200 leading-relaxed text-center font-medium">
                ข้าพเจ้ายินยอมให้เก็บ ใช้ และเปิดเผยข้อมูลส่วนบุคคลของข้าพเจ้าเพื่อวัตถุประสงค์ในการลงทะเบียนและเข้าร่วมงาน YEC Day ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
              </p>
            </div>
            
            <div className="flex items-center justify-center space-x-4">
              <input
                type="checkbox"
                id="pdpa-consent"
                name="pdpa-consent"
                checked={pdpaConsent}
                onChange={(e) => setPdpaConsent(e.target.checked)}
                className="h-6 w-6 text-yec-primary border-gray-300 dark:border-gray-600 rounded focus:ring-yec-primary focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 min-h-[44px] min-w-[44px]"
                aria-describedby="pdpa-description"
              />
              <label htmlFor="pdpa-consent" className="text-lg font-semibold text-yec-primary cursor-pointer select-none">
                ข้าพเจ้ายอมรับและยินยอม
              </label>
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-red-600 dark:text-red-400">*</span> 
                การยอมรับข้อตกลงนี้เป็นเงื่อนไขที่จำเป็นสำหรับการลงทะเบียน
              </p>
            </div>
          </SlideUp>

          {/* Action Buttons - Enhanced */}
          <div 
            className="flex flex-col sm:flex-row gap-6 justify-center items-center"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            {/* Edit Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleEdit(e);
              }}
              disabled={isSubmitting}
              className="group relative px-10 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-yec-primary/30 focus:ring-offset-2 min-h-[56px] min-w-[180px] border-2 border-gray-200 dark:border-gray-600 hover:border-yec-primary/30 hover:shadow-lg hover:-translate-y-1 active:translate-y-0 active:shadow-md pointer-events-auto"
              aria-label="แก้ไขข้อมูลการลงทะเบียน"
              type="button"
            >
              {/* Button Background Animation */}
              <div className="absolute inset-0 bg-gradient-to-r from-yec-primary/5 to-yec-accent/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              
              {/* Button Content */}
              <div className="relative flex items-center justify-center space-x-2 pointer-events-none">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-yec-primary transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="text-lg">แก้ไขข้อมูล</span>
              </div>
              
              {/* Hover Effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"></div>
            </button>

            {/* Submit Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSubmit(e);
              }}
              disabled={!pdpaConsent || isSubmitting}
              className="group relative px-10 py-4 bg-gradient-to-r from-yec-primary to-yec-accent hover:from-yec-accent hover:to-yec-primary text-white font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-yec-accent/30 focus:ring-offset-2 min-h-[56px] min-w-[200px] shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0 active:shadow-md pointer-events-auto"
              aria-label="ยืนยันการลงทะเบียน"
              type="button"
            >
              {/* Button Background Animation */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              
              {/* Button Content */}
              <div className="relative flex items-center justify-center space-x-2 pointer-events-none">
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span className="text-lg">กำลังส่งข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-white group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-lg">ยืนยันการลงทะเบียน</span>
                  </>
                )}
              </div>
              
              {/* Hover Effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"></div>
              
              {/* Pulse Animation for Attention */}
              {!isSubmitting && pdpaConsent && (
                <div className="absolute inset-0 rounded-xl bg-yec-accent/30 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              )}
            </button>
          </div>

          {/* Button Status Indicators */}
          <div className="mt-6 text-center space-y-2">
            {!pdpaConsent && (
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center justify-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span>กรุณายอมรับเงื่อนไข PDPA ก่อนยืนยันการลงทะเบียน</span>
              </p>
            )}
            {isSubmitting && (
              <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center justify-center space-x-1">
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>กำลังประมวลผลข้อมูล กรุณารอสักครู่...</span>
              </p>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
} 