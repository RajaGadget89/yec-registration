import { NextRequest, NextResponse } from 'next/server';
import { FormData, formSchema } from '../../components/RegistrationForm/FormSchema';
import { generateYECBadge } from '../../lib/badgeGenerator';
import { sendBadgeEmail } from '../../lib/emailService';

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

    // Generate registration ID
    const registrationId = `YEC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // TODO: Add database integration here
    // For now, just log the data
    console.log('Registration data received:', {
      ...formData,
      profileImage: formData.profileImage ? 'File uploaded' : 'No file',
      chamberCard: formData.chamberCard ? 'File uploaded' : 'No file',
      paymentSlip: formData.paymentSlip ? 'File uploaded' : 'No file',
    });

    // Generate badge
    let badgeBuffer: Buffer | null = null;
    try {
      const fullName = `${formData.title} ${formData.firstName} ${formData.lastName}`;
      
      // Get YEC province display name
      const yecProvinceField = formSchema.find(field => field.id === 'yecProvince');
      const yecProvinceOption = yecProvinceField?.options?.find(opt => opt.value === formData.yecProvince);
      const yecProvinceDisplay = yecProvinceOption?.label || formData.yecProvince;

      const badgeData = {
        registrationId,
        fullName,
        nickname: formData.nickname,
        phone: formData.phone,
        yecProvince: yecProvinceDisplay,
        businessType: formData.businessType,
        businessTypeOther: formData.businessTypeOther,
        profileImageBase64: formData.profileImage?.dataUrl || undefined
      };

      badgeBuffer = await generateYECBadge(badgeData);
      console.log('Badge generated successfully');
    } catch (error) {
      console.error('Error generating badge:', error);
      // Continue without badge if generation fails
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    const response: any = {
      success: true,
      message: 'Registration submitted successfully',
      registrationId
    };

    // Include badge as base64 if generated successfully
    if (badgeBuffer) {
      response.badgeBase64 = `data:image/png;base64,${badgeBuffer.toString('base64')}`;
      
      // Send email with badge attachment
      try {
        const fullName = `${formData.title} ${formData.firstName} ${formData.lastName}`;
        const emailSent = await sendBadgeEmail(
          formData.email,
          fullName,
          badgeBuffer,
          registrationId
        );
        
        if (emailSent) {
          console.log('Badge email sent successfully to:', formData.email);
          response.emailSent = true;
        } else {
          console.error('Failed to send badge email to:', formData.email);
          response.emailSent = false;
        }
      } catch (emailError) {
        console.error('Error sending badge email:', emailError);
        response.emailSent = false;
      }
    }

    return NextResponse.json(response, { status: 200 });

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