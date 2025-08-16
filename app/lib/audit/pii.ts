/**
 * PII masking utilities for audit logging
 * Ensures no sensitive data is logged in audit trails
 */

/**
 * Mask email address for PII safety
 * Example: john.doe@example.com -> jo**@example.com
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) {
    return "***@***";
  }

  const [localPart, domain] = email.split("@");
  const maskedLocal =
    localPart.length > 2
      ? localPart.substring(0, 2) + "*".repeat(localPart.length - 2)
      : "**";

  return `${maskedLocal}@${domain}`;
}

/**
 * Mask phone number for PII safety
 * Example: 0812345678 -> 08******78
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) {
    return "***";
  }

  if (phone.startsWith("+66")) {
    return (
      "+66" + "*".repeat(phone.length - 4) + phone.substring(phone.length - 2)
    );
  }

  if (phone.startsWith("0")) {
    return (
      "0" + "*".repeat(phone.length - 3) + phone.substring(phone.length - 2)
    );
  }

  return (
    phone.substring(0, 2) +
    "*".repeat(phone.length - 4) +
    phone.substring(phone.length - 2)
  );
}

/**
 * Mask sensitive data in an object
 * Recursively masks email and phone fields
 */
export function maskPIIInObject(obj: Record<string, any>): Record<string, any> {
  const masked = { ...obj };

  for (const [key, value] of Object.entries(masked)) {
    if (typeof value === "string") {
      if (key.toLowerCase().includes("email")) {
        masked[key] = maskEmail(value);
      } else if (key.toLowerCase().includes("phone")) {
        masked[key] = maskPhone(value);
      }
    } else if (typeof value === "object" && value !== null) {
      masked[key] = maskPIIInObject(value);
    }
  }

  return masked;
}

/**
 * Extract safe registration data for audit logging
 */
export function extractSafeRegistrationData(
  registration: any,
): Record<string, any> {
  return {
    registration_id: registration.registration_id,
    status: registration.status,
    yec_province: registration.yec_province,
    business_type: registration.business_type,
    hotel_choice: registration.hotel_choice,
    travel_type: registration.travel_type,
    email_masked: maskEmail(registration.email),
    phone_masked: maskPhone(registration.phone),
    created_at: registration.created_at,
    updated_at: registration.updated_at,
  };
}
