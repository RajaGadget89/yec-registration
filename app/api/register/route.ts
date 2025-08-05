import { NextRequest, NextResponse } from 'next/server';
import { FormData, formSchema } from '../../components/RegistrationForm/FormSchema';
import { generateYECBadge } from '../../lib/badgeGenerator';
import { sendEmail, sendBadgeEmail } from '../../lib/emailService';
import { uploadBadgeToSupabase } from '../../lib/uploadBadgeToSupabase';

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

    // Generate badge and upload to Supabase
    let badgeBuffer: Buffer | null = null;
    let badgeUrl: string | null = null;
    
    try {
      const fullName = `${formData.title} ${formData.firstName} ${formData.lastName}`;
      
      // Get YEC province display name
      const yecProvinceField = formSchema.find(field => field.id === 'yecProvince');
      const yecProvinceOption = yecProvinceField?.options?.find(opt => opt.value === formData.yecProvince);
      const yecProvinceDisplay = yecProvinceOption?.label || formData.yecProvince;

      // Handle profile image - could be URL or base64 data (for backward compatibility)
      let profileImageBase64: string | undefined;
      
      if (typeof formData.profileImage === 'string') {
        // New format: URL from Supabase
        // For badge generation, we need to fetch the image and convert to base64
        try {
          const response = await fetch(formData.profileImage);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          profileImageBase64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;
          console.log('Profile image fetched successfully from URL');
        } catch (error) {
          console.error('Error fetching profile image from URL:', error);
          // Continue without profile image if fetch fails
        }
      } else if (formData.profileImage?.dataUrl) {
        // Old format: base64 data (backward compatibility)
        profileImageBase64 = formData.profileImage.dataUrl;
        console.log('Using profile image from base64 data (backward compatibility)');
      } else {
        console.log('No profile image provided');
      }

      const badgeData = {
        registrationId,
        fullName,
        nickname: formData.nickname,
        phone: formData.phone,
        yecProvince: yecProvinceDisplay,
        businessType: formData.businessType,
        businessTypeOther: formData.businessTypeOther,
        profileImageBase64
      };

      // Generate badge
      badgeBuffer = await generateYECBadge(badgeData);
      console.log('Badge generated successfully');

      // Upload badge to Supabase
      if (badgeBuffer) {
        const filename = `${registrationId}.png`;
        badgeUrl = await uploadBadgeToSupabase(badgeBuffer, filename);
        console.log('Badge uploaded to Supabase:', badgeUrl);
      }
    } catch (error) {
      console.error('Error in badge generation/upload:', error);
      // Continue without badge if generation/upload fails
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    const response: any = {
      success: true,
      message: 'Registration submitted successfully',
      registrationId
    };

    // Send confirmation email with badge
    let emailSent = false;
    try {
      const fullName = `${formData.title} ${formData.firstName} ${formData.lastName}`;
      
      if (badgeUrl) {
        // Send email with badge image
        emailSent = await sendBadgeEmail(
          formData.email,
          fullName,
          badgeUrl,
          registrationId
        );
      } else {
        // Send basic confirmation email without badge
        await sendEmail({
          to: formData.email,
          subject: 'YEC Registration Confirmation',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1A237E;">YEC Day Registration Confirmation</h2>
              
              <p>Dear ${fullName},</p>
              
              <p>Thank you for registering for YEC Day! Your registration has been successfully received.</p>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <strong>Registration ID:</strong> ${registrationId}
              </div>
              
              <p><strong>Important:</strong> Please keep your badge and show it at the check-in counter on the day of the event.</p>
              
              <p>If you have any questions, please contact us at info@yecday.com</p>
              
              <p>Best regards,<br>
              YEC Day Team</p>
            </div>
          `,
        });
        emailSent = true;
      }
      
      if (emailSent) {
        console.log('Confirmation email sent successfully to:', formData.email);
      } else {
        console.error('Failed to send confirmation email to:', formData.email);
      }
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      emailSent = false;
    }
    
    response.emailSent = emailSent;

    // Include badge URL in response if available
    if (badgeUrl) {
      response.badgeUrl = badgeUrl;
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