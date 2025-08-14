'use client';

import { useState, useEffect } from 'react';
import { formSchema, initialFormData, FormData } from './FormSchema';
import { validateForm, shouldShowExtraField, calculateFormProgress } from './formValidation';
import FormField from './FormField';
import { uploadFileToSupabase } from '../../lib/uploadFileToSupabase';

export default function RegistrationForm() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [fileProcessingProgress, setFileProcessingProgress] = useState(0);

  // Load existing form data only in edit mode
  useEffect(() => {
    // Check if we're in edit mode via URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const isEditMode = urlParams.get('edit') === 'true';

    // Clean up any stale localStorage data on fresh page loads
    if (!isEditMode) {
      localStorage.removeItem('yecRegistrationData');
    }

    if (isEditMode) {
      try {
        const storedData = sessionStorage.getItem('yecEditData');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          if (parsedData && typeof parsedData === 'object') {
            // Merge with initial data to ensure all fields exist
            const mergedData = { ...initialFormData, ...parsedData };

            // Handle file fields - preserve URLs or metadata for display
            const fileFields = ['profileImage', 'chamberCard', 'paymentSlip'];
            fileFields.forEach(fieldId => {
              if (mergedData[fieldId]) {
                if (typeof mergedData[fieldId] === 'string' && mergedData[fieldId].startsWith('http')) {
                  // New format: URL from Supabase - keep as is
                  // The FormField component will handle displaying the image
                  console.log(`Edit mode: Preserving Supabase URL for ${fieldId}:`, mergedData[fieldId]);
                } else if (typeof mergedData[fieldId] === 'object' && 'name' in mergedData[fieldId]) {
                  // Old format: file metadata - keep for display purposes
                  // The FormField component will handle showing the file info
                  console.log(`Edit mode: Preserving file metadata for ${fieldId}:`, mergedData[fieldId]);
                } else {
                  // Clear invalid data
                  console.log(`Edit mode: Clearing invalid data for ${fieldId}:`, mergedData[fieldId]);
                  mergedData[fieldId] = null;
                }
              }
            });

            setFormData(mergedData);
            setIsEditing(true);

            // Clean up sessionStorage after loading
            sessionStorage.removeItem('yecEditData');

            // Remove edit parameter from URL without page reload
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('edit');
            window.history.replaceState({}, '', newUrl.toString());
          }
        }
      } catch (err) {
        console.error('Error loading stored form data:', err);
        // Continue with initial form data if there's an error
      }
    }

    // Cleanup function to clear any stale data
    return () => {
      // Clear any remaining edit data when component unmounts
      sessionStorage.removeItem('yecEditData');
    };
  }, []);

  // Validate form on data change
  useEffect(() => {
    const { errors: validationErrors } = validateForm(formData, formSchema);
    setErrors(validationErrors);
  }, [formData]);

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [fieldId]: value,
      };

      // Clear dependent fields when hotel choice changes
      if (fieldId === 'hotelChoice') {
        if (value === 'out-of-quota') {
          // Clear room type and roommate fields when switching to out-of-quota
          newData.roomType = '';
          newData.roommateInfo = '';
          newData.roommatePhone = '';
        } else if (value === 'in-quota') {
          // Clear external hotel name when switching to in-quota
          newData.external_hotel_name = '';
        }
      }

      // Clear roommate fields when room type changes from double to something else
      if (fieldId === 'roomType' && value !== 'double') {
        newData.roommateInfo = '';
        newData.roommatePhone = '';
      }

      return newData;
    });
  };

  const handleExtraFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { isValid, errors: validationErrors } = validateForm(formData, formSchema);

    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setIsProcessingFiles(true);

    try {
      // Handle File objects for upload fields
      const uploadFields = ['profileImage', 'chamberCard', 'paymentSlip'];
      const filesToProcess = uploadFields.filter(fieldId => typeof window !== 'undefined' && formData[fieldId] instanceof File);

      if (filesToProcess.length === 0) {
        // No new files to upload, save data immediately
        const minimalData = {
          ...formData,
          // Keep existing URLs or metadata, remove any File objects
          profileImage: typeof formData.profileImage === 'string' ? formData.profileImage : 
                       (formData.profileImage?.dataUrl ? formData.profileImage : null),
          chamberCard: typeof formData.chamberCard === 'string' ? formData.chamberCard : 
                      (formData.chamberCard?.dataUrl ? formData.chamberCard : null),
          paymentSlip: typeof formData.paymentSlip === 'string' ? formData.paymentSlip : 
                      (formData.paymentSlip?.dataUrl ? formData.paymentSlip : null),
        };
        localStorage.setItem('yecRegistrationData', JSON.stringify(minimalData));
        window.location.href = '/preview';
        return;
      }

      // Upload files to Supabase first
      let processedFiles = 0;
      const totalFiles = filesToProcess.length;
      setFileProcessingProgress(0);

      const uploadedFiles: { [key: string]: string } = {};
      const uploadPromises = filesToProcess.map(async (fieldId) => {
        const file = formData[fieldId] as File;
        
        try {
          // Determine folder based on field type
          let folder = 'documents';
          if (fieldId === 'profileImage') {
            folder = 'profile-images';
          } else if (fieldId === 'chamberCard') {
            folder = 'chamber-cards';
          } else if (fieldId === 'paymentSlip') {
            folder = 'payment-slips';
          }

          // Upload file to Supabase
          const fileUrl = await uploadFileToSupabase(file, folder);
          uploadedFiles[fieldId] = fileUrl;
          
          processedFiles++;
          setFileProcessingProgress((processedFiles / totalFiles) * 100);
          
          console.log(`File ${fieldId} uploaded successfully:`, fileUrl);
        } catch (error) {
          console.error(`Error uploading file ${fieldId}:`, error);
          throw new Error(`Failed to upload ${fieldId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });

      // Wait for all uploads to complete
      await Promise.all(uploadPromises);

      // Create minimal data object with file URLs instead of File objects
      const minimalData = {
        ...formData,
        // Replace File objects with URLs, preserve existing URLs or metadata
        profileImage: uploadedFiles.profileImage || 
                     (typeof formData.profileImage === 'string' ? formData.profileImage : 
                      (formData.profileImage?.dataUrl ? formData.profileImage : null)),
        chamberCard: uploadedFiles.chamberCard || 
                    (typeof formData.chamberCard === 'string' ? formData.chamberCard : 
                     (formData.chamberCard?.dataUrl ? formData.chamberCard : null)),
        paymentSlip: uploadedFiles.paymentSlip || 
                    (typeof formData.paymentSlip === 'string' ? formData.paymentSlip : 
                     (formData.paymentSlip?.dataUrl ? formData.paymentSlip : null)),
      };

      // Store minimal data in localStorage
      localStorage.setItem('yecRegistrationData', JSON.stringify(minimalData));
      
      setIsProcessingFiles(false);
      window.location.href = '/preview';

    } catch (err) {
      console.error('Error processing form data:', err);
      // Replace alert with console.error for better error handling
      console.error('เกิดข้อผิดพลาดในการอัปโหลดไฟล์ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
      setIsProcessingFiles(false);
    }
  };

  const isFormValid = Object.keys(errors).length === 0;

  return (
    <section id="form" className="py-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-blue-900 mb-4">
            ลงทะเบียน YEC Day
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            กรุณากรอกข้อมูลให้ครบถ้วนเพื่อลงทะเบียนเข้าร่วมงาน YEC Day
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8">
          {/* Edit mode notification */}
          {isEditing && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-blue-800 mb-1">
                    กำลังแก้ไขข้อมูล
                  </h3>
                  <p className="text-sm text-blue-700">
                    ข้อมูลของคุณถูกโหลดแล้ว ไฟล์รูปภาพที่อัปโหลดไว้จะแสดงด้านล่าง กรุณาอัปโหลดใหม่หากต้องการเปลี่ยน
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {formSchema.map((field) => {
              // Check if field should be shown based on dependencies
              if (field.dependsOn && formData[field.dependsOn.field] !== field.dependsOn.value) {
                return null;
              }

              return (
                <div key={field.id} className={field.type === 'upload' ? 'md:col-span-2' : ''}>
                  <FormField
                    field={field}
                    value={formData[field.id]}
                    onChange={(value) => handleFieldChange(field.id, value)}
                    formData={formData}
                    onExtraFieldChange={handleExtraFieldChange}
                  />

                  {/* Render roommate phone field separately for better layout */}
                  {field.id === 'roomType' && shouldShowExtraField(field, formData) && field.roommatePhoneField && (
                    <div className="mt-4 pl-4 border-l-2 border-blue-200">
                      <FormField
                        field={{
                          ...field.roommatePhoneField,
                          required: field.roommatePhoneField.required ?? true
                        }}
                        value={formData[field.roommatePhoneField.id]}
                        onChange={(value) => handleExtraFieldChange(field.roommatePhoneField!.id, value)}
                        formData={formData}
                        onExtraFieldChange={handleExtraFieldChange}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Submit Button - Enhanced */}
          <div className="mt-8 text-center">
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className={`group relative px-10 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform min-h-[56px] min-w-[220px] ${isFormValid && !isSubmitting
                  ? 'bg-gradient-to-r from-yec-primary to-yec-accent hover:from-yec-accent hover:to-yec-primary text-white hover:scale-105 shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0 active:shadow-md focus:outline-none focus:ring-4 focus:ring-yec-accent/30 focus:ring-offset-2'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-md'
                }`}
            >
              {/* Button Background Animation */}
              {isFormValid && !isSubmitting && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              )}

              {/* Button Content */}
              <div className="relative flex items-center justify-center space-x-2">
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>
                      {isProcessingFiles ? 'กำลังประมวลผลไฟล์...' : 'กำลังส่งข้อมูล...'}
                    </span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-white group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span>ส่งข้อมูลการลงทะเบียน</span>
                  </>
                )}
              </div>

              {/* Hover Effect */}
              {isFormValid && !isSubmitting && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              )}
            </button>

            {/* Status Messages */}
            <div className="mt-4 space-y-2">
              {!isFormValid && (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center justify-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span>กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง</span>
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

          {/* Form Progress Indicator */}
          <div className="mt-8">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>ความคืบหน้า</span>
              <span>{calculateFormProgress(formData, formSchema)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${calculateFormProgress(formData, formSchema)}%`
                }}
              ></div>
            </div>
          </div>

          {/* File Processing Progress */}
          {isProcessingFiles && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>กำลังประมวลผลไฟล์</span>
                <span>{Math.round(fileProcessingProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${fileProcessingProgress}%`
                  }}
                ></div>
              </div>
            </div>
          )}
        </form>
      </div>
    </section>
  );
} 