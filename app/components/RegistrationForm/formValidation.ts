import { FormField } from './FormSchema';

export interface ValidationResult {
  isValid: boolean;
  message: string | null;
  status: 'valid' | 'partial' | 'invalid';
}

export const validateThaiPhoneNumber = (digits: string): string | null => {
  if (!digits.startsWith('0')) return 'เบอร์โทรศัพท์ไทยต้องขึ้นต้นด้วยเลข 0';
  if (digits.length !== 10) return 'เบอร์โทรศัพท์ต้องมี 10 หลัก';
  if (!/^\d{10}$/.test(digits)) return 'เบอร์โทรศัพท์ต้องเป็นตัวเลขเท่านั้น';
  return null;
};

export const formatThaiPhoneNumber = (digits: string): string => {
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

export const validateField = (
  field: FormField,
  value: unknown,
  formData?: Record<string, unknown>
): ValidationResult => {
  // Check if field should be required based on conditions
  const isConditionallyRequired = shouldFieldBeRequired(field, formData);
  
  // Handle empty required fields (including conditionally required)
  if ((field.required || isConditionallyRequired) && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return {
      isValid: false,
      message: `กรุณากรอก${field.label}`,
      status: 'invalid',
    };
  }

  // Handle optional fields that are empty
  if (!field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return {
      isValid: true,
      message: null,
      status: 'valid',
    };
  }

  // Custom validation function
  if (field.validation?.customValidation) {
    const customError = field.validation.customValidation(value);
    if (customError) {
      return {
        isValid: false,
        message: customError,
        status: 'invalid',
      };
    }
  }

  // Pattern validation
  if (field.validation?.pattern && typeof value === 'string') {
    if (!field.validation.pattern.test(value)) {
      return {
        isValid: false,
        message: `รูปแบบ${field.label}ไม่ถูกต้อง`,
        status: 'invalid',
      };
    }
  }

  // Length validation
  if (typeof value === 'string') {
    if (field.validation?.minLength && value.length < field.validation.minLength) {
      return {
        isValid: false,
        message: `${field.label}ต้องมีอย่างน้อย ${field.validation.minLength} ตัวอักษร`,
        status: 'invalid',
      };
    }

    if (field.validation?.maxLength && value.length > field.validation.maxLength) {
      return {
        isValid: false,
        message: `${field.label}ต้องมีไม่เกิน ${field.validation.maxLength} ตัวอักษร`,
        status: 'invalid',
      };
    }
  }

  // File validation
  if (field.type === 'upload') {
    if (typeof window !== 'undefined' && value instanceof File) {
      // New file being uploaded
      const fileValidation = validateFile(value, field.validation);
      if (!fileValidation.isValid) {
        return fileValidation;
      }
    } else if (typeof value === 'string' && value.startsWith('http')) {
      // File already uploaded to Supabase (URL)
      return {
        isValid: true,
        message: null,
        status: 'valid',
      };
    } else if (value && typeof value === 'object' && 'dataUrl' in value) {
      // Old format: base64 data (backward compatibility)
      return {
        isValid: true,
        message: null,
        status: 'valid',
      };
    } else if (field.required && !value) {
      // Required field is missing
      return {
        isValid: false,
        message: `กรุณาอัปโหลด${field.label}`,
        status: 'invalid',
      };
    }
  }

  // Tel field validation
  if (field.type === 'tel') {
    const error = validateThaiPhoneNumber(value as string);
    if (error) return { status: 'invalid', message: error, isValid: false };
  }

  // Special field validations
  switch (field.id) {
    case 'phone':
      return validatePhone(value as string);
    case 'email':
      return validateEmail(value as string);
    case 'lineId':
      return validateLineId(value as string);
    case 'businessTypeOther':
      return validateBusinessTypeOther(value as string, formData);
    case 'roommateInfo':
      return validateRoommateInfo(value as string, formData);
    case 'roommatePhone':
      return validateRoommatePhone(value as string, formData);
    case 'external_hotel_name':
      return validateExternalHotelName(value as string, formData);
    default:
      return {
        isValid: true,
        message: null,
        status: 'valid',
      };
  }
};

const validateFile = (file: File, validation?: any): ValidationResult => {
  // Ensure we're in a browser environment
  if (typeof window === 'undefined') {
    return {
      isValid: true,
      message: null,
      status: 'valid',
    };
  }

  // File type validation
  if (validation?.fileTypes && !validation.fileTypes.includes(file.type)) {
    return {
      isValid: false,
      message: `ไฟล์ต้องเป็นรูปแบบ ${validation.fileTypes.join(', ')}`,
      status: 'invalid',
    };
  }

  // File size validation
  if (validation?.maxFileSize) {
    const maxSizeInBytes = validation.maxFileSize * 1024 * 1024; // Convert MB to bytes
    if (file.size > maxSizeInBytes) {
      return {
        isValid: false,
        message: `ขนาดไฟล์ต้องไม่เกิน ${validation.maxFileSize}MB`,
        status: 'invalid',
      };
    }
  }

  return {
    isValid: true,
    message: null,
    status: 'valid',
  };
};

const validatePhone = (value: string): ValidationResult => {
  if (!value) {
    return {
      isValid: false,
      message: 'กรุณากรอกเบอร์โทรศัพท์',
      status: 'invalid',
    };
  }

  const phonePattern = /^0\d{9}$/;
  if (!phonePattern.test(value)) {
    return {
      isValid: false,
      message: 'เบอร์โทรศัพท์ต้องขึ้นต้นด้วย 0 และมี 10 หลัก',
      status: 'invalid',
    };
  }

  return {
    isValid: true,
    message: null,
    status: 'valid',
  };
};

const validateEmail = (value: string): ValidationResult => {
  if (!value) {
    return {
      isValid: false,
      message: 'กรุณากรอกอีเมล',
      status: 'invalid',
    };
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(value)) {
    return {
      isValid: false,
      message: 'รูปแบบอีเมลไม่ถูกต้อง',
      status: 'invalid',
    };
  }

  return {
    isValid: true,
    message: null,
    status: 'valid',
  };
};

const validateLineId = (value: string): ValidationResult => {
  if (!value) {
    return {
      isValid: false,
      message: 'กรุณากรอก Line ID',
      status: 'invalid',
    };
  }

  const lineIdPattern = /^[a-zA-Z0-9._-]+$/;
  if (!lineIdPattern.test(value)) {
    return {
      isValid: false,
      message: 'Line ID ต้องเป็นภาษาอังกฤษเท่านั้น',
      status: 'invalid',
    };
  }

  if (value.length > 30) {
    return {
      isValid: false,
      message: 'Line ID ต้องมีไม่เกิน 30 ตัวอักษร',
      status: 'invalid',
    };
  }

  return {
    isValid: true,
    message: null,
    status: 'valid',
  };
};

const validateBusinessTypeOther = (value: string, formData?: Record<string, unknown>): ValidationResult => {
  // Only validate if businessType is 'other'
  if (formData?.businessType !== 'other') {
    return {
      isValid: true,
      message: null,
      status: 'valid',
    };
  }

  if (!value || value.trim() === '') {
    return {
      isValid: false,
      message: 'กรุณาระบุประเภทกิจการ',
      status: 'invalid',
    };
  }

  if (value.length > 50) {
    return {
      isValid: false,
      message: 'ประเภทกิจการต้องมีไม่เกิน 50 ตัวอักษร',
      status: 'invalid',
    };
  }

  return {
    isValid: true,
    message: null,
    status: 'valid',
  };
};

const validateRoommateInfo = (value: string, formData?: Record<string, unknown>): ValidationResult => {
  // Only validate if roomType is 'double'
  if (formData?.roomType !== 'double') {
    return {
      isValid: true,
      message: null,
      status: 'valid',
    };
  }

  if (!value || value.trim() === '') {
    return {
      isValid: false,
      message: 'กรุณากรอกชื่อ นามสกุล ผู้นอนร่วม',
      status: 'invalid',
    };
  }

  if (value.length > 100) {
    return {
      isValid: false,
      message: 'ชื่อผู้นอนร่วมต้องมีไม่เกิน 100 ตัวอักษร',
      status: 'invalid',
    };
  }

  return {
    isValid: true,
    message: null,
    status: 'valid',
  };
};

const validateRoommatePhone = (value: string, formData?: Record<string, unknown>): ValidationResult => {
  // Only validate if roomType is 'double'
  if (formData?.roomType !== 'double') {
    return {
      isValid: true,
      message: null,
      status: 'valid',
    };
  }

  if (!value) {
    return {
      isValid: false,
      message: 'กรุณากรอกเบอร์โทรผู้ร่วมพัก',
      status: 'invalid',
    };
  }

  const phonePattern = /^0\d{9}$/;
  if (!phonePattern.test(value)) {
    return {
      isValid: false,
      message: 'เบอร์โทรผู้ร่วมพักต้องขึ้นต้นด้วย 0 และมี 10 หลัก',
      status: 'invalid',
    };
  }

  return {
    isValid: true,
    message: null,
    status: 'valid',
  };
};

const validateExternalHotelName = (value: string, formData?: Record<string, unknown>): ValidationResult => {
  // Only validate if hotelChoice is 'out-of-quota'
  if (formData?.hotelChoice !== 'out-of-quota') {
    return {
      isValid: true,
      message: null,
      status: 'valid',
    };
  }

  if (!value || value.trim() === '') {
    return {
      isValid: false,
      message: 'กรุณากรอกชื่อโรงแรมที่เลือกเอง',
      status: 'invalid',
    };
  }

  if (value.length > 100) {
    return {
      isValid: false,
      message: 'ชื่อโรงแรมต้องมีไม่เกิน 100 ตัวอักษร',
      status: 'invalid',
    };
  }

  return {
    isValid: true,
    message: null,
    status: 'valid',
  };
};

export const validateForm = (formData: Record<string, unknown>, formSchema: FormField[]): {
  isValid: boolean;
  errors: Record<string, string>;
} => {
  const errors: Record<string, string> = {};
  let isValid = true;

  formSchema.forEach((field) => {
    // Check if field should be shown based on dependencies
    if (field.dependsOn && formData[field.dependsOn.field] !== field.dependsOn.value) {
      // Field is not shown, skip validation
      return;
    }

    const validation = validateField(field, formData[field.id], formData);
    if (!validation.isValid) {
      errors[field.id] = validation.message || '';
      isValid = false;
    }

    // Validate extra fields
    if (field.extraField) {
      const extraFieldValidation = validateField(
        {
          ...field.extraField,
          required: shouldShowExtraField(field, formData),
        },
        formData[field.extraField.id],
        formData
      );
      if (!extraFieldValidation.isValid) {
        errors[field.extraField.id] = extraFieldValidation.message || '';
        isValid = false;
      }
    }

    // Validate roommate phone field
    if (field.roommatePhoneField && shouldShowExtraField(field, formData)) {
      const roommatePhoneValidation = validateField(
        {
          ...field.roommatePhoneField,
          required: true,
        },
        formData[field.roommatePhoneField.id],
        formData
      );
      if (!roommatePhoneValidation.isValid) {
        errors[field.roommatePhoneField.id] = roommatePhoneValidation.message || '';
        isValid = false;
      }
    }
  });

  return { isValid, errors };
};

export const shouldShowExtraField = (field: FormField, formData: Record<string, unknown>): boolean => {
  switch (field.id) {
    case 'businessType':
      return formData.businessType === 'other';
    case 'roomType':
      return formData.roomType === 'double' && formData.hotelChoice === 'in-quota';
    default:
      return false;
  }
};

export const shouldFieldBeRequired = (field: FormField, formData?: Record<string, unknown>): boolean => {
  if (!formData) return false;
  
  switch (field.id) {
    case 'businessTypeOther':
      return formData.businessType === 'other';
    case 'roommateInfo':
      return formData.roomType === 'double' && formData.hotelChoice === 'in-quota';
    case 'roommatePhone':
      return formData.roomType === 'double' && formData.hotelChoice === 'in-quota';
    case 'external_hotel_name':
      return formData.hotelChoice === 'out-of-quota';
    default:
      return false;
  }
};

export const getFieldStatus = (validation: ValidationResult): 'valid' | 'partial' | 'invalid' => {
  return validation.status;
};

export const getFieldBorderColor = (status: 'valid' | 'partial' | 'invalid'): string => {
  switch (status) {
    case 'valid':
      return 'border-green-500';
    case 'partial':
      return 'border-yellow-500';
    case 'invalid':
      return 'border-red-500';
    default:
      return 'border-gray-300';
  }
};

export const getFieldTextColor = (status: 'valid' | 'partial' | 'invalid'): string => {
  switch (status) {
    case 'valid':
      return 'text-green-600';
    case 'partial':
      return 'text-yellow-600';
    case 'invalid':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

export const calculateFormProgress = (formData: Record<string, unknown>, formSchema: FormField[]): number => {
  let totalRequiredFields = 0;
  let completedRequiredFields = 0;

  formSchema.forEach((field) => {
    // Check if field should be shown based on dependencies
    if (field.dependsOn && formData[field.dependsOn.field] !== field.dependsOn.value) {
      // Field is not shown, skip counting
      return;
    }

    // Count main field if required
    if (field.required) {
      totalRequiredFields++;
      if (formData[field.id] && formData[field.id] !== '') {
        completedRequiredFields++;
      }
    }

    // Count extra field if conditionally required
    if (field.extraField && shouldShowExtraField(field, formData)) {
      totalRequiredFields++;
      if (formData[field.extraField.id] && formData[field.extraField.id] !== '') {
        completedRequiredFields++;
      }
    }

    // Count roommate phone field if conditionally required
    if (field.roommatePhoneField && shouldShowExtraField(field, formData)) {
      totalRequiredFields++;
      if (formData[field.roommatePhoneField.id] && formData[field.roommatePhoneField.id] !== '') {
        completedRequiredFields++;
      }
    }
  });

  return totalRequiredFields > 0 ? Math.round((completedRequiredFields / totalRequiredFields) * 100) : 0;
}; 

// Enhanced validation function to match database constraints
export const validateRegistrationData = (data: any) => {
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

// Field mapping from frontend to database
export const mapFrontendToDatabase = (frontendData: any) => {
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