'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopMenuBar from '../components/TopMenuBar';
import Footer from '../components/Footer';

export default function SuccessPage() {
  const router = useRouter();
  const [registrationId, setRegistrationId] = useState<string | null>(null);

  useEffect(() => {
    // Get registration ID from URL params or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
      setRegistrationId(id);
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