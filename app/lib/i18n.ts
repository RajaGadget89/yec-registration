// Simple i18n system for bilingual support (TH/EN)

export type Language = "th" | "en";

// Simple dictionary for common messages
const messages = {
  th: {
    // Admin actions
    request_update_success: "ส่งอีเมลขอข้อมูลเพิ่มเติมแล้ว",
    mark_pass_success: "ตรวจสอบผ่านแล้ว",
    approve_success: "อนุมัติแล้ว ส่งอีเมลแจ้งเตือนแล้ว",
    request_update_error: "เกิดข้อผิดพลาดในการขอข้อมูลเพิ่มเติม",
    mark_pass_error: "เกิดข้อผิดพลาดในการตรวจสอบ",
    approve_error: "เกิดข้อผิดพลาดในการอนุมัติ",
    rbac_error: "ไม่มีสิทธิ์ในการดำเนินการนี้",

    // Button labels
    request_update: "ขอให้อัปเดต",
    mark_pass: "ผ่านการตรวจ",
    approve_registration: "อนุมัติการลงทะเบียน",
    open: "เปิด",

    // Modal and UI
    cancel: "ยกเลิก",
    send_request: "ส่งคำขอ",
    sending: "กำลังส่ง...",
    notes_required: "หมายเหตุ (จำเป็น)",
    explain_update: "อธิบายสิ่งที่ต้องอัปเดต...",

    // File preview
    file_missing: "ยังไม่มีไฟล์อัปโหลด",
    preview_error: "ไม่สามารถแสดงตัวอย่างไฟล์ได้",

    // Status messages
    status_pending: "รอดำเนินการ",
    status_needs_update: "ต้องการข้อมูลเพิ่มเติม",
    status_passed: "ผ่านแล้ว",
    status_rejected: "ไม่ผ่าน",
    status_waiting_for_review: "รอตรวจสอบ",
    status_waiting_for_update_payment: "รอข้อมูลการชำระเงิน",
    status_waiting_for_update_profile: "รอข้อมูลโปรไฟล์",
    status_waiting_for_update_tcc: "รอข้อมูลการค้า",
    status_approved: "อนุมัติแล้ว",

    // Deep-link update page
    token_invalid: "ลิงก์ไม่ถูกต้องหรือหมดอายุ กรุณาใช้ลิงก์ที่ส่งในอีเมล",
    update_success:
      "อัปเดตข้อมูลเรียบร้อยแล้ว การลงทะเบียนของคุณอยู่ระหว่างการตรวจสอบ คุณจะได้รับการแจ้งเตือนเมื่อการตรวจสอบเสร็จสิ้น",
    contact_support: "กรุณาติดต่อฝ่ายสนับสนุนหากคุณคิดว่านี่เป็นข้อผิดพลาด",
    file_too_large: "ไฟล์มีขนาดใหญ่เกินไป",
    invalid_file_type: "ประเภทไฟล์ไม่ถูกต้อง",
  },
  en: {
    // Admin actions
    request_update_success: "Update request email sent",
    mark_pass_success: "Review passed",
    approve_success: "Approved. Notification email sent",
    request_update_error: "Error requesting update",
    mark_pass_error: "Error marking as passed",
    approve_error: "Error approving registration",
    rbac_error: "You do not have permission to perform this action",

    // Button labels
    request_update: "Request Update",
    mark_pass: "Mark PASS",
    approve_registration: "Approve Registration",
    open: "Open",

    // Modal and UI
    cancel: "Cancel",
    send_request: "Send Request",
    sending: "Sending...",
    notes_required: "Notes (required)",
    explain_update: "Explain what needs to be updated...",

    // File preview
    file_missing: "No file uploaded",
    preview_error: "Unable to preview file",

    // Status messages
    status_pending: "Pending",
    status_needs_update: "Needs Update",
    status_passed: "Passed",
    status_rejected: "Rejected",
    status_waiting_for_review: "Waiting for Review",
    status_waiting_for_update_payment: "Waiting for Payment Update",
    status_waiting_for_update_profile: "Waiting for Profile Update",
    status_waiting_for_update_tcc: "Waiting for TCC Update",
    status_approved: "Approved",

    // Deep-link update page
    token_invalid:
      "Invalid or expired link. Please use the link provided in your email",
    update_success:
      "Your information has been updated successfully. Your registration is now under review. You will be notified once the review is complete.",
    contact_support: "Please contact support if you believe this is an error",
    file_too_large: "File too large",
    invalid_file_type: "Invalid file type",
  },
};

// Get message in current language (defaults to English)
export function t(key: string, language: Language = "en"): string {
  return (
    messages[language][key as keyof (typeof messages)[typeof language]] || key
  );
}

// Get message in both languages
export function tBoth(key: string): { en: string; th: string } {
  return {
    en: t(key, "en"),
    th: t(key, "th"),
  };
}

// Get status message in both languages
export function getStatusMessageBoth(status: string): {
  en: string;
  th: string;
} {
  const statusKey = `status_${status}`;
  return tBoth(statusKey);
}
