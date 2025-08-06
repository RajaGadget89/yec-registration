'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import TopMenuBar from '../components/TopMenuBar';
import Footer from '../components/Footer';

export default function SuccessPage() {
  const router = useRouter();
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [badgeUrl, setBadgeUrl] = useState<string | null>(null);
  const [isBadgeLoading, setIsBadgeLoading] = useState(false);
  const [badgeError, setBadgeError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<boolean | null>(null);

  useEffect(() => {
    // Get registration ID, badge URL, and email status from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    const badgeUrl = urlParams.get('badgeUrl');
    const emailStatus = urlParams.get('email');
    
    if (id) {
      setRegistrationId(id);
    }
    
    if (badgeUrl) {
      setIsBadgeLoading(true);
      try {
        const decodedBadgeUrl = decodeURIComponent(badgeUrl);
        setBadgeUrl(decodedBadgeUrl);
      } catch (error) {
        console.error('Error decoding badge URL:', error);
        setBadgeError('ไม่สามารถโหลดบัตรประจำตัวได้');
      } finally {
        setIsBadgeLoading(false);
      }
    }
    
    if (emailStatus) {
      setEmailSent(emailStatus === 'true');
    }
  }, []);

  const handleBackToHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopMenuBar />
      
      <main className="pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            {/* Success Icon */}
            <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-green-100 mb-8">
              <svg 
                className="h-12 w-12 text-green-600" 
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
            </div>

            {/* Success Message */}
            <h1 className="text-3xl sm:text-4xl font-bold text-yec-primary mb-4">
              ลงทะเบียนสำเร็จ!
            </h1>
            
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              ขอบคุณสำหรับการลงทะเบียนเข้าร่วมงาน YEC Day เราได้รับข้อมูลของคุณแล้ว 
              และจะติดต่อกลับในเร็วๆ นี้
            </p>

            {/* Generated Badge - Displayed above Registration ID */}
            {(badgeUrl || isBadgeLoading || badgeError) && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-8 max-w-md mx-auto">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 text-center">
                  บัตรประจำตัว YEC
                </h2>
                
                {/* Loading State */}
                {isBadgeLoading && (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yec-primary"></div>
                    <span className="ml-3 text-gray-600">กำลังโหลดบัตร...</span>
                  </div>
                )}
                
                {/* Error State */}
                {badgeError && (
                  <div className="flex justify-center items-center py-8">
                    <div className="text-center">
                      <div className="text-red-500 mb-2">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <p className="text-gray-600">{badgeError}</p>
                    </div>
                  </div>
                )}
                
                {/* Badge Image */}
                {badgeUrl && !isBadgeLoading && !badgeError && (
                  <>
                    <div className="flex justify-center">
                      <Image 
                        src={badgeUrl} 
                        alt="Your YEC Badge" 
                        width={300}
                        height={400}
                        className="max-w-full h-auto rounded-lg shadow-sm border"
                        style={{ maxWidth: '300px' }}
                      />
                    </div>
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = badgeUrl;
                          link.download = `yec-badge-${registrationId}.png`;
                          link.click();
                        }}
                        className="px-4 py-2 bg-yec-accent hover:bg-yec-primary text-white text-sm font-medium rounded transition-colors duration-200"
                      >
                        ดาวน์โหลดบัตร
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Registration ID */}
            {registrationId && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-8 max-w-md mx-auto">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">
                  เลขที่ลงทะเบียน
                </h2>
                <p className="text-2xl font-mono text-yec-primary bg-gray-50 p-3 rounded border">
                  {registrationId}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  กรุณาเก็บเลขที่นี้ไว้สำหรับการติดต่อในภายหลัง
                </p>
                
                {/* Email Status */}
                {emailSent !== null && (
                  <div className="mt-4 p-3 rounded-lg border">
                    {emailSent ? (
                      <div className="flex items-center text-green-600">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm">บัตรประจำตัวถูกส่งไปยังอีเมลของคุณแล้ว</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-amber-600">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className="text-sm">ไม่สามารถส่งอีเมลได้ กรุณาดาวน์โหลดบัตรด้านบน</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Next Steps */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold text-yec-primary mb-4">
                ขั้นตอนต่อไป
              </h2>
              <div className="text-left space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-yec-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <p className="text-gray-700">
                    ทีมงานจะตรวจสอบข้อมูลและเอกสารที่แนบมา
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-yec-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <p className="text-gray-700">
                    จะมีการส่งอีเมลยืนยันการลงทะเบียนภายใน 24 ชั่วโมง
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-yec-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <p className="text-gray-700">
                    ข้อมูลเพิ่มเติมเกี่ยวกับงานจะถูกส่งให้ก่อนวันงาน
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-yec-primary text-white rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">
                ติดต่อเรา
              </h2>
              <div className="space-y-2 text-center">
                <p>หากมีคำถามหรือต้องการความช่วยเหลือ</p>
                <p className="font-semibold">อีเมล: info@yecday.com</p>
                <p className="font-semibold">โทร: +66 2 123 4567</p>
              </div>
            </div>

            {/* Back to Home Button */}
            <button
              onClick={handleBackToHome}
              className="px-8 py-3 bg-yec-primary hover:bg-yec-accent text-white font-semibold rounded-lg transition-colors duration-200"
            >
              กลับหน้าหลัก
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
} 