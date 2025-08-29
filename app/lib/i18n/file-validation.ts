/**
 * File validation message localization
 * Provides TH/EN error messages for file validation failures
 */

export type ValidationErrorCode = "INVALID_TYPE" | "FILE_TOO_LARGE";

export type Language = "th" | "en";

export interface ValidationContext {
  allowed?: string[];
  limitBytes?: number;
  limitMB?: number;
}

/**
 * File validation error messages in Thai and English
 */
const MESSAGES = {
  INVALID_TYPE: {
    th: (ctx: ValidationContext) =>
      `ชนิดไฟล์ไม่ถูกต้อง อนุญาต: ${ctx.allowed?.join(", ") || "ไม่ระบุ"}`,
    en: (ctx: ValidationContext) =>
      `Unsupported file type. Allowed: ${ctx.allowed?.join(", ") || "not specified"}`,
  },
  FILE_TOO_LARGE: {
    th: (ctx: ValidationContext) => {
      const limitMB =
        ctx.limitMB ||
        (ctx.limitBytes ? Math.round(ctx.limitBytes / (1024 * 1024)) : 0);
      return `ไฟล์มีขนาดใหญ่เกินกำหนด สูงสุด ${limitMB} MB`;
    },
    en: (ctx: ValidationContext) => {
      const limitMB =
        ctx.limitMB ||
        (ctx.limitBytes ? Math.round(ctx.limitBytes / (1024 * 1024)) : 0);
      return `File is too large. Max ${limitMB} MB.`;
    },
  },
} as const;

/**
 * Get localized file validation message
 * @param code - Error code
 * @param lang - Language ('th' or 'en')
 * @param ctx - Context with additional data (allowed types, size limits)
 * @returns Localized error message
 */
export function fileValidationMessage(
  code: ValidationErrorCode,
  lang: Language,
  ctx: ValidationContext = {},
): string {
  const messageFn = MESSAGES[code][lang];
  if (!messageFn) {
    // Fallback to English if language not supported
    return MESSAGES[code].en(ctx);
  }

  return messageFn(ctx);
}

/**
 * Get language from Accept-Language header
 * @param acceptLanguage - Accept-Language header value
 * @returns Language code ('th' or 'en')
 */
export function getLanguageFromHeader(
  acceptLanguage?: string | null,
): Language {
  if (!acceptLanguage) {
    return "en";
  }

  // Check if Thai is preferred
  if (acceptLanguage.toLowerCase().startsWith("th")) {
    return "th";
  }

  return "en";
}

/**
 * Get all supported languages
 * @returns Array of supported language codes
 */
export function getSupportedLanguages(): Language[] {
  return ["th", "en"];
}
