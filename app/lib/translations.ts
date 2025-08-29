// Simple translation system for localized error messages
export const translations = {
  en: {
    "resubmit.invalid": "Link is invalid or expired",
    "resubmit.expired": "This link has expired",
    "resubmit.not_found": "Registration not found",
    "resubmit.not_in_update_state": "Registration not in update state",
    "resubmit.dimension_mismatch": "Token dimension mismatch",
    "resubmit.processing_failed": "Failed to process resubmission",
    "resubmit.internal_error": "Internal server error",
  },
  th: {
    "resubmit.invalid": "ลิงก์ไม่ถูกต้องหรือหมดอายุ",
    "resubmit.expired": "ลิงก์นี้หมดอายุแล้ว",
    "resubmit.not_found": "ไม่พบการลงทะเบียน",
    "resubmit.not_in_update_state": "การลงทะเบียนไม่อยู่ในสถานะที่ต้องอัปเดต",
    "resubmit.dimension_mismatch": "มิติของโทเค็นไม่ตรงกัน",
    "resubmit.processing_failed": "ไม่สามารถประมวลผลการส่งใหม่ได้",
    "resubmit.internal_error": "ข้อผิดพลาดภายในเซิร์ฟเวอร์",
  },
};

export function getTranslation(key: string, language: string = "en"): string {
  const lang = language.toLowerCase().startsWith("th") ? "th" : "en";
  return (
    translations[lang as keyof typeof translations]?.[
      key as keyof typeof translations.en
    ] ||
    translations.en[key as keyof typeof translations.en] ||
    key
  );
}

export function getLanguageFromHeader(acceptLanguage?: string | null): string {
  if (!acceptLanguage) return "en";

  // Parse Accept-Language header
  const languages = acceptLanguage.split(",").map((lang) => {
    const [code, quality = "1"] = lang.trim().split(";q=");
    return { code: code.split("-")[0], quality: parseFloat(quality) };
  });

  // Sort by quality and find first supported language
  languages.sort((a, b) => b.quality - a.quality);

  for (const lang of languages) {
    if (lang.code === "th" || lang.code === "en") {
      return lang.code;
    }
  }

  return "en";
}
