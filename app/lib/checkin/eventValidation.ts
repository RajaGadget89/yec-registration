import { z } from 'zod';

/**
 * Event validation schema
 */
export const eventValidationSchema = z.object({
  name: z.string()
    .min(1, 'Event name is required')
    .max(100, 'Event name must be less than 100 characters'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  location: z.string()
    .max(200, 'Location must be less than 200 characters')
    .optional(),
  start_time: z.string()
    .datetime('Invalid start time format')
    .optional(),
  end_time: z.string()
    .datetime('Invalid end time format')
    .optional(),
  event_type_id: z.string()
    .uuid('Invalid event type ID')
    .min(1, 'Event type is required'),
  is_active: z.boolean().optional()
});

/**
 * Check-in validation schema
 */
export const checkinValidationSchema = z.object({
  registration_id: z.string()
    .min(1, 'Registration ID is required'),
  checkin_event_id: z.string()
    .uuid('Invalid event ID')
    .min(1, 'Event ID is required'),
  location: z.string()
    .max(200, 'Location must be less than 200 characters')
    .optional(),
  notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional()
});

/**
 * QR code validation schema
 */
export const qrValidationSchema = z.object({
  regId: z.string().min(1, 'Registration ID is required'),
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().min(1, 'Phone number is required')
});

/**
 * Validate event data
 */
export function validateEventData(data: any): { valid: boolean; errors?: string[] } {
  try {
    eventValidationSchema.parse(data);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      };
    }
    return {
      valid: false,
      errors: ['Unknown validation error']
    };
  }
}

/**
 * Validate check-in data
 */
export function validateCheckinData(data: any): { valid: boolean; errors?: string[] } {
  try {
    checkinValidationSchema.parse(data);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      };
    }
    return {
      valid: false,
      errors: ['Unknown validation error']
    };
  }
}

/**
 * Validate QR code data
 */
export function validateQRCodeData(data: any): { valid: boolean; errors?: string[] } {
  try {
    qrValidationSchema.parse(data);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      };
    }
    return {
      valid: false,
      errors: ['Unknown validation error']
    };
  }
}

/**
 * Validate time constraints
 */
export function validateTimeConstraints(startTime?: string, endTime?: string): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];

  if (startTime && endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      errors.push('Start time must be before end time');
    }

    if (start < new Date()) {
      errors.push('Start time cannot be in the past');
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Validate event name uniqueness
 */
export async function validateEventNameUniqueness(
  name: string, 
  excludeId?: string
): Promise<{ valid: boolean; errors?: string[] }> {
  // This would typically check against the database
  // For now, we'll return a placeholder
  return { valid: true };
}

/**
 * Validate event type exists
 */
export async function validateEventTypeExists(
  eventTypeId: string
): Promise<{ valid: boolean; errors?: string[] }> {
  // This would typically check against the database
  // For now, we'll return a placeholder
  return { valid: true };
}


