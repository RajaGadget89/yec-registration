'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import type { Registration } from '../../types/database';

interface ResubmissionFormData {
  first_name?: string;
  last_name?: string;
  nickname?: string;
  phone?: string;
  line_id?: string;
  email?: string;
  company_name?: string;
  business_type?: string;
  business_type_other?: string;
  yec_province?: string;
  profile_image_url?: string;
  payment_slip_url?: string;
  chamber_card_url?: string;
}

export default function UserResubmissionPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [formData, setFormData] = useState<ResubmissionFormData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Load registration data based on token
    // In production, this would validate the token and load the registration
    loadRegistrationData();
  }, [token]);

  const loadRegistrationData = async () => {
    try {
      // This would be a real API call in production
      // For now, we'll simulate loading data
      setIsLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock registration data - in production this would come from the API
      const mockRegistration: Registration = {
        id: 1,
        registration_id: 'REG123456',
        title: 'Mr.',
        first_name: 'John',
        last_name: 'Doe',
        nickname: 'Johnny',
        phone: '081-234-5678',
        line_id: 'johndoe',
        email: 'john.doe@example.com',
        company_name: 'Example Corp',
        business_type: 'technology',
        business_type_other: null,
        yec_province: 'Bangkok',
        hotel_choice: 'in-quota',
        room_type: 'single',
        roommate_info: null,
        roommate_phone: null,
        external_hotel_name: null,
        travel_type: 'private-car',
        profile_image_url: null,
        chamber_card_url: null,
        payment_slip_url: null,
        badge_url: null,
        email_sent: false,
        email_sent_at: null,
        status: 'waiting_for_update_payment',
        update_reason: 'payment',
        rejected_reason: null,
        payment_review_status: 'needs_update',
        profile_review_status: 'pending',
        tcc_review_status: 'pending',
        review_checklist: {
          payment: { status: 'needs_update', notes: 'Payment slip is unclear' },
          profile: { status: 'pending' },
          tcc: { status: 'pending' }
        },
        price_applied: 2000,
        currency: 'THB',
        selected_package_code: 'standard',
        ip_address: null,
        user_agent: null,
        form_data: {},
        created_at: '2025-01-27T10:00:00Z',
        updated_at: '2025-01-27T10:00:00Z'
      };
      
      setRegistration(mockRegistration);
      
      // Pre-fill form data based on update reason
      if (mockRegistration.update_reason === 'payment') {
        setFormData({ payment_slip_url: '' });
      } else if (mockRegistration.update_reason === 'profile') {
        setFormData({
          first_name: mockRegistration.first_name,
          last_name: mockRegistration.last_name,
          nickname: mockRegistration.nickname,
          phone: mockRegistration.phone,
          line_id: mockRegistration.line_id,
          email: mockRegistration.email,
          company_name: mockRegistration.company_name,
          business_type: mockRegistration.business_type,
          business_type_other: mockRegistration.business_type_other || '',
          yec_province: mockRegistration.yec_province,
          profile_image_url: mockRegistration.profile_image_url || ''
        });
      } else if (mockRegistration.update_reason === 'tcc') {
        setFormData({ chamber_card_url: '' });
      }
      
    } catch (err) {
      setError('Failed to load registration data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof ResubmissionFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = async (field: keyof ResubmissionFormData, file: File) => {
    try {
      // In production, this would upload to Supabase storage
      // For now, we'll simulate the upload
      const mockUrl = `https://example.com/uploads/${file.name}`;
      setFormData(prev => ({
        ...prev,
        [field]: mockUrl
      }));
    } catch (err) {
      setError('Failed to upload file');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!registration) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // In production, this would call the real API
      const response = await fetch(`/api/user/${token}/resubmit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registration_id: registration.id,
          updates: formData
        }),
      });

      const result = await response.json();

      if (result.ok) {
        setSuccess(true);
      } else {
        setError(result.error || 'Failed to submit updates');
      }
    } catch (err) {
      setError('Failed to submit updates');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUpdateReasonText = () => {
    if (!registration?.update_reason) return '';
    
    switch (registration.update_reason) {
      case 'payment':
        return 'Payment Slip Update Required';
      case 'profile':
        return 'Profile Information Update Required';
      case 'tcc':
        return 'TCC Card Update Required';
      default:
        return 'Update Required';
    }
  };

  const getUpdateReasonDescription = () => {
    if (!registration?.update_reason) return '';
    
    switch (registration.update_reason) {
      case 'payment':
        return 'Please provide a clear payment slip image. The current image is unclear or missing required information.';
      case 'profile':
        return 'Please update your profile information. Some fields need correction or additional details.';
      case 'tcc':
        return 'Please provide a clear TCC card image. The current image is unclear or missing required information.';
      default:
        return 'Please provide the requested updates.';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading registration data...</p>
        </div>
      </div>
    );
  }

  if (error && !registration) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600">{error}</p>
              <p className="text-sm text-gray-500 mt-4">
                This link may be expired or invalid. Please contact support if you need assistance.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-green-500 text-6xl mb-4">✅</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Updates Submitted Successfully</h2>
              <p className="text-gray-600 mb-4">
                Your registration updates have been submitted and are now under review.
              </p>
              <p className="text-sm text-gray-500">
                You will receive an email notification once the review is complete.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!registration) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">❌</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Registration Not Found</h2>
              <p className="text-gray-600">
                The registration associated with this link could not be found.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                Update Required
              </Badge>
              {getUpdateReasonText()}
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Registration ID: <span className="font-mono">{registration.registration_id}</span>
            </p>
            <p className="text-gray-600">
              {getUpdateReasonDescription()}
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {registration.update_reason === 'payment' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Slip Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload('payment_slip_url', file);
                        }
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Please upload a clear image of your payment slip
                    </p>
                  </div>
                </div>
              )}

              {registration.update_reason === 'profile' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={formData.first_name || ''}
                        onChange={(e) => handleInputChange('first_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={formData.last_name || ''}
                        onChange={(e) => handleInputChange('last_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nickname
                    </label>
                    <input
                      type="text"
                      value={formData.nickname || ''}
                      onChange={(e) => handleInputChange('nickname', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Line ID
                    </label>
                    <input
                      type="text"
                      value={formData.line_id || ''}
                      onChange={(e) => handleInputChange('line_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={formData.company_name || ''}
                      onChange={(e) => handleInputChange('company_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Type
                    </label>
                    <select
                      value={formData.business_type || ''}
                      onChange={(e) => handleInputChange('business_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select business type</option>
                      <option value="technology">Technology</option>
                      <option value="finance">Finance</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="education">Education</option>
                      <option value="retail">Retail</option>
                      <option value="manufacturing">Manufacturing</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {formData.business_type === 'other' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Other Business Type
                      </label>
                      <input
                        type="text"
                        value={formData.business_type_other || ''}
                        onChange={(e) => handleInputChange('business_type_other', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Province
                    </label>
                    <select
                      value={formData.yec_province || ''}
                      onChange={(e) => handleInputChange('yec_province', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select province</option>
                      <option value="Bangkok">Bangkok</option>
                      <option value="Chiang Mai">Chiang Mai</option>
                      <option value="Phuket">Phuket</option>
                      <option value="Pattaya">Pattaya</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profile Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload('profile_image_url', file);
                        }
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                </div>
              )}

              {registration.update_reason === 'tcc' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      TCC Card Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload('chamber_card_url', file);
                        }
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Please upload a clear image of your TCC card
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Updates'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
