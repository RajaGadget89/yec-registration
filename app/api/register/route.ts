import { generateYECBadge } from '../../lib/badgeGenerator';
import { sendBadgeEmail } from '../../lib/emailService';
import { uploadBadgeToSupabase } from '../../lib/uploadBadgeToSupabase';
import { getSupabaseServiceClient } from '../../lib/supabase-server';
import { getThailandTimeISOString } from '../../lib/timezoneUtils';
import { EventService } from '../../lib/events/eventService';
import { withAuditLogging } from '../../lib/audit/withAuditAccess';
import { NextRequest, NextResponse } from 'next/server';

// Ensure Node.js runtime for service role key access
export const runtime = 'nodejs';

// Field mapping from frontend to database
const mapFrontendToDatabase = (frontendData: any) => {
  // Clean up data based on hotel choice
  const cleanedData = { ...frontendData };
  
  // If out-of-quota, clear room-related fields
  if (frontendData.hotelChoice === 'out-of-quota') {
    cleanedData.roomType = null;
    cleanedData.roommateInfo = null;
    cleanedData.roommatePhone = null;
  }
  
  // If in-quota, clear external hotel name
  if (frontendData.hotelChoice === 'in-quota') {
    cleanedData.external_hotel_name = null;
  }
  
  // If room type is not double, clear roommate fields
  if (frontendData.roomType !== 'double') {
    cleanedData.roommateInfo = null;
    cleanedData.roommatePhone = null;
  }
  
  console.log('Cleaned form data:', cleanedData);
  
  return {
    registration_id: cleanedData.registration_id || `YEC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: cleanedData.title,
    first_name: cleanedData.firstName,
    last_name: cleanedData.lastName,
    nickname: cleanedData.nickname,
    phone: cleanedData.phone,
    line_id: cleanedData.lineId,
    email: cleanedData.email,
    company_name: cleanedData.companyName,
    business_type: cleanedData.businessType,
    business_type_other: cleanedData.businessTypeOther || null,
    yec_province: cleanedData.yecProvince,
    hotel_choice: cleanedData.hotelChoice,
    room_type: cleanedData.roomType || null,
    roommate_info: cleanedData.roommateInfo || null,
    roommate_phone: cleanedData.roommatePhone || null,
    external_hotel_name: cleanedData.external_hotel_name || null,
    travel_type: cleanedData.travelType,
    profile_image_url: cleanedData.profileImage || null,
    chamber_card_url: cleanedData.chamberCard || null,
    payment_slip_url: cleanedData.paymentSlip || null,
  };
};

// Enhanced validation function to match database constraints
const validateRegistrationData = (data: any) => {
  const errors: string[] = [];
  
  // Required fields validation (using frontend field names)
  const requiredFields = [
    'title', 'firstName', 'lastName', 'nickname',
    'phone', 'lineId', 'email', 'companyName', 'businessType',
    'yecProvince', 'hotelChoice', 'travelType'
  ];

  for (const field of requiredFields) {
    if (!data[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Phone validation - must be 0XXXXXXXXX or +66XXXXXXXX
  if (data.phone && !/^0[0-9]{9}$/.test(data.phone) && !/^\+66[0-9]{8}$/.test(data.phone)) {
    errors.push('Phone must be in format 0XXXXXXXXX or +66XXXXXXXX');
  }
  
  // Line ID validation - only letters, numbers, dots, underscores, and hyphens
  if (data.lineId && !/^[a-zA-Z0-9._-]+$/.test(data.lineId)) {
    errors.push('Line ID can only contain letters, numbers, dots, underscores, and hyphens');
  }
  
  // Email validation
  if (data.email && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(data.email)) {
    errors.push('Invalid email format');
  }
  
  // Hotel choice validation
  if (data.hotelChoice && !['in-quota', 'out-of-quota'].includes(data.hotelChoice)) {
    errors.push('Hotel choice must be either "in-quota" or "out-of-quota"');
  }
  
  // Travel type validation
  if (data.travelType && !['private-car', 'van'].includes(data.travelType)) {
    errors.push('Travel type must be either "private-car" or "van"');
  }
  
  // Hotel choice logic validation
  if (data.hotelChoice === 'out-of-quota' && !data.external_hotel_name) {
    errors.push('External hotel name is required when choosing out-of-quota');
  }
  
  if (data.hotelChoice === 'in-quota' && !data.roomType) {
    errors.push('Room type is required when choosing in-quota');
  }
  
  // Room type validation for in-quota
  if (data.hotelChoice === 'in-quota' && data.roomType && !['single', 'double', 'suite', 'no-accommodation'].includes(data.roomType)) {
    errors.push('Room type must be either "single", "double", "suite", or "no-accommodation"');
  }
  
  // Roommate validation for double rooms (only when in-quota)
  if (data.hotelChoice === 'in-quota' && data.roomType === 'double' && (!data.roommateInfo || !data.roommatePhone)) {
    errors.push('Roommate information and phone are required for double rooms');
  }
  
  return errors;
};

// Generate badge and upload to Supabase
const generateAndUploadBadge = async (mappedData: any, frontendData: any) => {
  try {
    console.log('Starting badge generation...');
    
    // Get YEC province display name
    const yecProvinceField = [
      { value: 'krabi', label: 'กระบี่' },
      { value: 'kanchanaburi', label: 'กาญจนบุรี' },
      { value: 'kalasin', label: 'กาฬสินธุ์' },
      { value: 'kamphaeng-phet', label: 'กำแพงเพชร' },
      { value: 'bangkok', label: 'กรุงเทพมหานคร' },
      { value: 'khon-kaen', label: 'ขอนแก่น' },
      { value: 'chachoengsao', label: 'ฉะเชิงเทรา' },
      { value: 'chai-nat', label: 'ชัยนาท' },
      { value: 'chaiyaphum', label: 'ชัยภูมิ' },
      { value: 'chanthaburi', label: 'จันทบุรี' },
      { value: 'chiang-mai', label: 'เชียงใหม่' },
      { value: 'chiang-rai', label: 'เชียงราย' },
      { value: 'chon-buri', label: 'ชลบุรี' },
      { value: 'chumphon', label: 'ชุมพร' },
      { value: 'trang', label: 'ตรัง' },
      { value: 'trat', label: 'ตราด' },
      { value: 'tak', label: 'ตาก' },
      { value: 'nan', label: 'น่าน' },
      { value: 'narathiwat', label: 'นราธิวาส' },
      { value: 'nonthaburi', label: 'นนทบุรี' },
      { value: 'nakhon-nayok', label: 'นครนายก' },
      { value: 'nakhon-pathom', label: 'นครปฐม' },
      { value: 'nakhon-phanom', label: 'นครพนม' },
      { value: 'nakhon-ratchasima', label: 'นครราชสีมา' },
      { value: 'nakhon-sawan', label: 'นครสวรรค์' },
      { value: 'nakhon-si-thammarat', label: 'นครศรีธรรมราช' },
      { value: 'nong-bua-lamphu', label: 'หนองบัวลำภู' },
      { value: 'nong-khai', label: 'หนองคาย' },
      { value: 'pathum-thani', label: 'ปทุมธานี' },
      { value: 'pattani', label: 'ปัตตานี' },
      { value: 'phang-nga', label: 'พังงา' },
      { value: 'phayao', label: 'พะเยา' },
      { value: 'phetchabun', label: 'เพชรบูรณ์' },
      { value: 'phetchaburi', label: 'เพชรบุรี' },
      { value: 'phichit', label: 'พิจิตร' },
      { value: 'phitsanulok', label: 'พิษณุโลก' },
      { value: 'phra-nakhon-si-ayutthaya', label: 'พระนครศรีอยุธยา' },
      { value: 'phrae', label: 'แพร่' },
      { value: 'phuket', label: 'ภูเก็ต' },
      { value: 'prachin-buri', label: 'ปราจีนบุรี' },
      { value: 'prachuap-khiri-khan', label: 'ประจวบคีรีขันธ์' },
      { value: 'ranong', label: 'ระนอง' },
      { value: 'ratchaburi', label: 'ราชบุรี' },
      { value: 'rayong', label: 'ระยอง' },
      { value: 'roi-et', label: 'ร้อยเอ็ด' },
      { value: 'lampang', label: 'ลำปาง' },
      { value: 'lamphun', label: 'ลำพูน' },
      { value: 'leoi', label: 'เลย' },
      { value: 'lop-buri', label: 'ลพบุรี' },
      { value: 'mae-hong-son', label: 'แม่ฮ่องสอน' },
      { value: 'maha-sarakham', label: 'มหาสารคาม' },
      { value: 'mukdahan', label: 'มุกดาหาร' },
      { value: 'yasothon', label: 'ยโสธร' },
      { value: 'yala', label: 'ยะลา' },
      { value: 'sa-kaeo', label: 'สระแก้ว' },
      { value: 'sakon-nakhon', label: 'สกลนคร' },
      { value: 'samut-prakan', label: 'สมุทรปราการ' },
      { value: 'samut-sakhon', label: 'สมุทรสาคร' },
      { value: 'samut-songkhram', label: 'สมุทรสงคราม' },
      { value: 'saraburi', label: 'สระบุรี' },
      { value: 'satun', label: 'สตูล' },
      { value: 'si-sa-ket', label: 'ศรีสะเกษ' },
      { value: 'sing-buri', label: 'สิงห์บุรี' },
      { value: 'songkhla', label: 'สงขลา' },
      { value: 'sukhothai', label: 'สุโขทัย' },
      { value: 'suphan-buri', label: 'สุพรรณบุรี' },
      { value: 'surat-thani', label: 'สุราษฎร์ธานี' },
      { value: 'surin', label: 'สุรินทร์' },
      { value: 'ubon-ratchathani', label: 'อุบลราชธานี' },
      { value: 'udon-thani', label: 'อุดรธานี' },
      { value: 'uthai-thani', label: 'อุทัยธานี' },
      { value: 'uttaradit', label: 'อุตรดิตถ์' },
      { value: 'buri-ram', label: 'บุรีรัมย์' },
      { value: 'ang-thong', label: 'อ่างทอง' },
      { value: 'amnat-charoen', label: 'อำนาจเจริญ' },
    ].find(province => province.value === mappedData.yec_province);
    
    const yecProvinceDisplay = yecProvinceField?.label || mappedData.yec_province;

    // Handle profile image - could be URL or base64 data
    let profileImageBase64: string | undefined;
    
    if (typeof frontendData.profileImage === 'string' && frontendData.profileImage.startsWith('http')) {
      // New format: URL from Supabase
      try {
        console.log('Fetching profile image from URL:', frontendData.profileImage);
        const response = await fetch(frontendData.profileImage);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
          throw new Error(`Invalid content type: ${contentType}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Validate buffer size (max 5MB)
        if (buffer.length > 5 * 1024 * 1024) {
          throw new Error('Image file too large (max 5MB)');
        }
        
        profileImageBase64 = `data:${contentType};base64,${buffer.toString('base64')}`;
        console.log('Profile image fetched successfully from URL, size:', buffer.length, 'bytes');
      } catch (error) {
        console.error('Error fetching profile image from URL:', error);
        // Continue without profile image if fetch fails
      }
    } else if (frontendData.profileImage?.dataUrl) {
      // Old format: base64 data (backward compatibility)
      profileImageBase64 = frontendData.profileImage.dataUrl;
      console.log('Using profile image from base64 data (backward compatibility)');
    }

    const fullName = `${mappedData.title} ${mappedData.first_name} ${mappedData.last_name}`;
    
    const badgeData = {
      registrationId: mappedData.registration_id,
      fullName,
      nickname: mappedData.nickname,
      phone: mappedData.phone,
      yecProvince: yecProvinceDisplay,
      businessType: mappedData.business_type,
      businessTypeOther: mappedData.business_type_other,
      profileImageBase64
    };

    // Generate badge
    const badgeBuffer = await generateYECBadge(badgeData);
    console.log('Badge generated successfully');

    // Upload badge to Supabase
    const filename = `${mappedData.registration_id}.png`;
    const badgeUrl = await uploadBadgeToSupabase(badgeBuffer, filename);
    console.log('Badge uploaded to Supabase:', badgeUrl);
    
    return badgeUrl;
  } catch (error) {
    console.error('Error in badge generation/upload:', error);
    throw error;
  }
};

async function handlePOST(req: NextRequest) {
  console.log('[REGISTER_ROUTE] handlePOST called');
  
  try {
    // Log environment variables for debugging (without exposing sensitive data)
    console.log('Environment check:', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasResendKey: !!process.env.RESEND_API_KEY,
    });
    
    const body = await req.json();

    // Validate data against database constraints
    const validationErrors = validateRegistrationData(body);
    
    if (validationErrors.length > 0) {
      console.error('Validation errors:', validationErrors);
          return NextResponse.json({ 
      error: 'Validation failed',
      message: validationErrors.join(', '), // Frontend expects 'message' field
      details: validationErrors 
    }, { status: 400 });
    }

    // Map frontend data to database format
    const mappedData = mapFrontendToDatabase(body);

    // Generate badge and upload to Supabase
    let badgeUrl: string | null = null;
    try {
      console.log('Starting badge generation process...');
      badgeUrl = await generateAndUploadBadge(mappedData, body);
      console.log('Badge generation completed successfully:', badgeUrl);
    } catch (error) {
      console.error('Badge generation failed:', error);
      // Continue without badge if generation fails
      badgeUrl = null;
    }

    // Construct insert payload with default status
    const insertPayload = {
      ...mappedData,
      badge_url: badgeUrl,
      email_sent: false,
      status: 'pending', // Add default status
      ip_address: req.headers.get('x-forwarded-for') || null,
      user_agent: req.headers.get('user-agent') || null,
      form_data: body,
      created_at: getThailandTimeISOString(), // Use Thailand timezone
    };

    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.from('registrations').insert([insertPayload]);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ 
        error: 'Database insertion failed',
        message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง', // Frontend expects 'message' field
        details: error.message 
      }, { status: 500 });
    }

    // Send confirmation email with badge (legacy flow - kept for backward compatibility)
    let emailSent = false;
    if (badgeUrl) {
      try {
        const fullName = `${mappedData.title} ${mappedData.first_name} ${mappedData.last_name}`;
        console.log('Sending badge email with URL:', badgeUrl);
        console.log('Email details:', {
          to: mappedData.email,
          name: fullName,
          registrationId: mappedData.registration_id
        });
        
        emailSent = await sendBadgeEmail(
          mappedData.email,
          fullName,
          badgeUrl,
          mappedData.registration_id
        );
        
        console.log('Email sending result:', emailSent);
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
        emailSent = false;
      }
    } else {
      console.log('No badge URL available, skipping email sending');
    }

    // Update email_sent status in database
    if (emailSent) {
      await supabase
        .from('registrations')
        .update({ 
          email_sent: true,
          email_sent_at: getThailandTimeISOString(),
          updated_at: getThailandTimeISOString() // Explicitly set updated_at to Thailand timezone
        })
        .eq('registration_id', mappedData.registration_id);
    }

    // Emit registration submitted event for centralized side-effects
    try {
      // Capture request ID for event correlation
      const requestId = req.headers.get('x-request-id') || 
                       req.headers.get('x-correlation-id') || 
                       `reg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Use the request ID as the correlation ID for consistency
      const correlationId = requestId;
      
      // Debug logging for test environment
      if (process.env.NODE_ENV === 'test' || process.env.PLAYWRIGHT_TEST) {
        console.log(`[REGISTER_ROUTE] Request ID from headers: ${req.headers.get('x-request-id')}`);
        console.log(`[REGISTER_ROUTE] Using correlation ID: ${correlationId}`);
      }
      
      // Fetch the complete registration record for the event
      const { data: registrationRecord } = await supabase
        .from('registrations')
        .select('*')
        .eq('registration_id', mappedData.registration_id)
        .single();

      if (registrationRecord) {
        // Emit RegisterSubmitted event - the audit domain handler will emit RegistrationCreated and StatusChanged
        await EventService.emitRegistrationSubmitted(registrationRecord, undefined, correlationId);
        console.log('Registration submitted event emitted successfully with correlation ID:', correlationId);
      }
    } catch (eventError) {
      console.error('Error emitting registration events:', eventError);
      // Don't fail the registration if event emission fails
    }

    return NextResponse.json({ 
      success: true,
      message: 'Registration submitted successfully',
      registrationId: mappedData.registration_id, // Frontend expects 'registrationId'
      badgeUrl: badgeUrl, // Frontend expects 'badgeUrl'
      emailSent: emailSent // Frontend expects 'emailSent'
    });
  } catch (err) {
    console.error('Server error:', err);
    return NextResponse.json({ 
      error: 'Server error',
      message: 'เกิดข้อผิดพลาดในการประมวลผลข้อมูล กรุณาลองใหม่อีกครั้ง'
    }, { status: 500 });
  }
}

// Export the wrapped handler
export const POST = withAuditLogging(handlePOST, {
  resource: 'registration'
});