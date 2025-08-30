/**
 * File validation utility for registration dimensions
 * Centralizes validation rules for payment, profile, and TCC file uploads
 */

export type ValidationDimension = "payment" | "profile" | "tcc";

export interface ValidationResult {
  ok: boolean;
  code?: "INVALID_TYPE" | "FILE_TOO_LARGE";
  limitBytes?: number;
  allowed?: string[];
}

export interface ValidationInput {
  dimension: ValidationDimension;
  mime: string;
  sizeBytes: number;
}

/**
 * Validation rules for each dimension
 */
const VALIDATION_RULES = {
  payment: {
    allowedMimeTypes: ["application/pdf"] as const,
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
  },
  profile: {
    allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png"] as const,
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
  },
  tcc: {
    allowedMimeTypes: [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ] as const,
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
  },
} as const;

/**
 * Validates a file against dimension-specific rules
 * @param input - File validation input
 * @returns Validation result with error details if validation fails
 */
export function validateFile(input: ValidationInput): ValidationResult {
  const { dimension, mime, sizeBytes } = input;
  const rules = VALIDATION_RULES[dimension];

  if (!rules) {
    throw new Error(`Unknown validation dimension: ${dimension}`);
  }

  // Check file type
  const allowedTypes = rules.allowedMimeTypes as readonly string[];
  if (!allowedTypes.includes(mime)) {
    return {
      ok: false,
      code: "INVALID_TYPE",
      allowed: [...allowedTypes],
    };
  }

  // Check file size
  if (sizeBytes > rules.maxSizeBytes) {
    return {
      ok: false,
      code: "FILE_TOO_LARGE",
      limitBytes: rules.maxSizeBytes,
    };
  }

  return { ok: true };
}

/**
 * Get validation rules for a specific dimension
 * @param dimension - The dimension to get rules for
 * @returns Validation rules object
 */
export function getValidationRules(dimension: ValidationDimension) {
  return VALIDATION_RULES[dimension];
}

/**
 * Get all supported dimensions
 * @returns Array of supported validation dimensions
 */
export function getSupportedDimensions(): ValidationDimension[] {
  return Object.keys(VALIDATION_RULES) as ValidationDimension[];
}
