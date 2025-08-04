'use client';

import { useState, useEffect } from 'react';
import { formSchema, initialFormData, FormData } from './FormSchema';
import { validateForm, shouldShowExtraField, calculateFormProgress } from './formValidation';
import FormField from './FormField';

export default function RegistrationForm() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate form on data change
  useEffect(() => {
    const { errors: validationErrors } = validateForm(formData, formSchema);
    setErrors(validationErrors);
  }, [formData]);

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value,
    }));
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
    
    // TODO: Submit to API
    console.log('Form data:', formData);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      alert('ฟอร์มถูกส่งเรียบร้อยแล้ว! (This is a demo - no actual submission)');
    }, 2000);
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {formSchema.map((field) => (
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
                      field={field.roommatePhoneField}
                      value={formData[field.roommatePhoneField.id]}
                      onChange={(value) => handleExtraFieldChange(field.roommatePhoneField!.id, value)}
                      formData={formData}
                      onExtraFieldChange={handleExtraFieldChange}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <div className="mt-12 text-center">
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className={`px-8 py-4 rounded-lg font-bold text-lg transition-all duration-300 transform ${
                isFormValid && !isSubmitting
                  ? 'bg-yellow-400 hover:bg-yellow-500 text-blue-900 hover:scale-105 shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
                  <span>กำลังส่งข้อมูล...</span>
                </div>
              ) : (
                'ส่งข้อมูลการลงทะเบียน'
              )}
            </button>
            
            {!isFormValid && (
              <p className="mt-4 text-sm text-red-600">
                กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง
              </p>
            )}
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
        </form>
      </div>
    </section>
  );
} 