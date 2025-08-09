import { sendPendingReviewEmail } from '../../lib/emailService';
import { getSupabaseServiceClient } from '../../lib/supabase-server';
import { getThailandTimeISOString } from '../../lib/timezoneUtils';
import { normalizeName } from '../../lib/textNormalize';
import { NextResponse } from 'next/server';

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

export async function POST(req: Request) {
  let body: any;
  
  try {
    // Log environment variables for debugging (without exposing sensitive data)
    console.log('Environment check:', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasResendKey: !!process.env.RESEND_API_KEY,
    });
    
    body = await req.json();

    // Validate data against database constraints
    const validationErrors = validateRegistrationData(body);
    
    if (validationErrors.length > 0) {
      console.error('Validation errors:', validationErrors);
      return NextResponse.json(
        { 
          success: false,
          code: 'VALIDATION_ERROR',
          message: validationErrors.join(', ')
        }, 
        { status: 400 }
      );
    }

    // Map frontend data to database format
    const mappedData = mapFrontendToDatabase(body);

    // Debug log before duplicate check
    console.info('register:incoming', { 
      email: body.email, 
      firstName: body.firstName, 
      lastName: body.lastName 
    });

    // --- duplicate-by-name guard (BEGIN) ---
    const firstNorm = normalizeName(body.firstName);
    const lastNorm  = normalizeName(body.lastName);

    const supabase = getSupabaseServiceClient();

    // Case-insensitive equality via ILIKE (no wildcards) + AND
    const { data: dupRows, error: dupErr } = await supabase
      .from('registrations')
      .select('id')
      .ilike('first_name', firstNorm)
      .ilike('last_name', lastNorm)
      .limit(1);

    if (dupErr) {
      console.error('duplicate_by_name_query_error', dupErr);
      return NextResponse.json(
        {
          success: false,
          code: 'DATABASE_ERROR',
          message: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล กรุณาลองใหม่อีกครั้ง'
        },
        { status: 500 }
      );
    } else if (dupRows && dupRows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          code: 'DUPLICATE_NAME_MATCH',
          message: 'มีข้อมูลอยู่ในระบบแล้ว โปรดติดต่อเจ้าหน้าที่ที่เบอร์ 080-224-0008 เพื่อยืนยันความถูกต้อง',
          contact: '080-224-0008',
        },
        { status: 200 }
      );
    }
    // --- duplicate-by-name guard (END) ---

    // Get current timestamp for submission
    const submittedAt = getThailandTimeISOString();

    // Construct insert payload with pending status
    const insertPayload = {
      ...mappedData,
      badge_url: null, // No badge generated at this stage
      email_sent: false,
      status: 'waiting_for_review', // Set status to waiting_for_review
      ip_address: req.headers.get('x-forwarded-for') || null,
      user_agent: req.headers.get('user-agent') || null,
      form_data: body,
      created_at: submittedAt, // Use Thailand timezone
    };

    // Add console.info just before the insert
    console.info('register:insert_attempt', { email: mappedData.email, phone: mappedData.phone });

    const { error, data } = await supabase.from('registrations').insert([insertPayload]);

    if (error) {
      console.error('Database error:', error);
      
      // Check for unique constraint violations
      const pg = error as any;
      const isUnique = pg?.code === '23505'
        || /unique/i.test(pg?.message || '')
        || /_email_key|_phone_key/i.test(pg?.constraint || '');

      if (isUnique) {
        return NextResponse.json(
          {
            success: false,
            code: 'DUPLICATE_EMAIL_OR_PHONE',
            message:
              'อีเมลหรือเบอร์โทรนี้ถูกใช้ไปแล้วสำหรับการสมัคร กรุณาใช้ข้อมูลอื่น หรือโทรหาเจ้าหน้าที่เพื่อยืนยันความถูกต้อง',
            contact: '080-224-0008',
          },
          { status: 200 }
        );
      }

      // Any other DB error -> structured JSON 500
      console.error('register_insert_error_detail', {
        code: (error as any)?.code,
        message: (error as any)?.message,
        detail: (error as any)?.detail,
        hint: (error as any)?.hint,
        constraint: (error as any)?.constraint,
        schema: (error as any)?.schema,
        table: (error as any)?.table,
        column: (error as any)?.column,
      });
      console.error('register_insert_error', { message: pg?.message, code: pg?.code, detail: pg?.detail });
      return NextResponse.json(
        {
          success: false,
          code: 'DATABASE_ERROR',
          message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง',
        },
        { status: 500 }
      );
    }

    // Debug log after successful insert
    const insertedId = (data as any)?.[0]?.id || mappedData.registration_id;
    console.info('register:inserted', { id: insertedId });

    // Send pending review email
    let emailSent = false;
    try {
      // Debug log before sending email
      console.info('register:email_pending', { to: mappedData.email });
      
      emailSent = await sendPendingReviewEmail({
        to: mappedData.email,
        firstName: mappedData.first_name,
        lastName: mappedData.last_name,
        submittedAt: submittedAt
      });
      
      console.log('Pending review email sending result:', emailSent);
    } catch (emailError) {
      console.error('Error sending pending review email:', emailError);
      emailSent = false;
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

    return NextResponse.json({ 
      success: true,
      message: 'Registration submitted successfully and is pending admin review',
      registrationId: mappedData.registration_id, // Frontend expects 'registrationId'
      badgeUrl: null, // No badge URL at this stage
      emailSent: emailSent, // Frontend expects 'emailSent'
      status: 'waiting_for_review' // Include status in response
    }, { status: 200 });

  } catch (e) {
    console.error('register_api_uncaught', e);
    return NextResponse.json(
      { success: false, code: 'INTERNAL_ERROR', message: 'Server error. Please try again.' },
      { status: 500 }
    );
  }
}