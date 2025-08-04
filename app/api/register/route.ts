import { NextRequest, NextResponse } from 'next/server';
import { FormData } from '../../components/RegistrationForm/FormSchema';

export async function POST(request: NextRequest) {
  try {
    const formData: FormData = await request.json();

    // Basic validation
    if (!formData || typeof formData !== 'object') {
      return NextResponse.json(
        { error: 'Invalid form data' },
        { status: 400 }
      );
    }

    // Required fields validation
    const requiredFields = [
      'title', 'firstName', 'lastName', 'nickname', 'phone', 
      'lineId', 'email', 'companyName', 'businessType', 
      'profileImage', 'chamberCard', 'paymentSlip', 'yecProvince'
    ];

    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          missingFields 
        },
        { status: 400 }
      );
    }

    // TODO: Add database integration here
    // For now, just log the data and return success
    console.log('Registration data received:', {
      ...formData,
      profileImage: formData.profileImage ? 'File uploaded' : 'No file',
      chamberCard: formData.chamberCard ? 'File uploaded' : 'No file',
      paymentSlip: formData.paymentSlip ? 'File uploaded' : 'No file',
    });

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    return NextResponse.json(
      { 
        success: true,
        message: 'Registration submitted successfully',
        registrationId: `YEC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Registration API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'เกิดข้อผิดพลาดในการประมวลผลข้อมูล กรุณาลองใหม่อีกครั้ง'
      },
      { status: 500 }
    );
  }
} 