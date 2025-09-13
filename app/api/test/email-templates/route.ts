import { NextRequest, NextResponse } from "next/server";
import { renderEmailTemplate, getEmailTemplateSubject } from "../../../lib/emails/server-renderer-simple";
import { sendEmail } from "../../../lib/emails/provider";

// Sample registration data for testing
const sampleRegistrationData = {
  id: "test-registration-123",
  registration_id: "YEC-1757789675228-d7cb1dxrb",
  first_name: "นาย",
  last_name: "ทดสอบ",
  email: "sharepoints911@gmail.com",
  full_name: "นาย ทดสอบ",
  phone: "0802240008",
  company_name: "บริษัท ทดสอบ จำกัด",
  business_type: "technology",
  yec_province: "Bangkok",
  price_applied: 2500,
  selected_package_code: "early-bird",
  status: "waiting_for_review",
  review_checklist: {
    payment: { status: "pending" },
    profile: { status: "pending" },
    tcc: { status: "pending" },
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Sample data for different email types
const emailTestData = {
  tracking: {
    applicantName: "นาย ทดสอบ",
    trackingCode: "YEC-1757789675228-d7cb1dxrb",
    supportEmail: "info@yecday.com",
  },
  "update-payment": {
    applicantName: "นาย ทดสอบ",
    trackingCode: "YEC-1757789675228-d7cb1dxrb",
    ctaUrl: "https://yecday.com/update/payment?token=test-token-123",
    priceApplied: "2500",
    packageName: "Early Bird Package",
    notes: "กรุณาอัปเดตสลิปโอนเงินให้ชัดเจนขึ้น | Please update your payment slip with clearer image",
    supportEmail: "info@yecday.com",
  },
  "update-info": {
    applicantName: "นาย ทดสอบ",
    trackingCode: "YEC-1757789675228-d7cb1dxrb",
    ctaUrl: "https://yecday.com/update/profile?token=test-token-123",
    notes: "กรุณาอัปเดตข้อมูลบริษัทและเบอร์โทรศัพท์ | Please update your company information and phone number",
    supportEmail: "info@yecday.com",
  },
  "update-tcc": {
    applicantName: "นาย ทดสอบ",
    trackingCode: "YEC-1757789675228-d7cb1dxrb",
    ctaUrl: "https://yecday.com/update/tcc?token=test-token-123",
    notes: "YOUR TCC CARD HAS BEEN EXPIRED! Kindly update a new one.",
    supportEmail: "info@yecday.com",
  },
  "approval-badge": {
    applicantName: "นาย ทดสอบ",
    trackingCode: "YEC-1757789675228-d7cb1dxrb",
    badgeUrl: "https://yecday.com/assets/sample-badge.png",
    supportEmail: "info@yecday.com",
  },
  rejection: {
    applicantName: "นาย ทดสอบ",
    trackingCode: "YEC-1757789675228-d7cb1dxrb",
    rejectedReason: "deadline_missed" as const,
    supportEmail: "info@yecday.com",
  },
};

export async function POST(request: NextRequest) {
  try {
    const { templateType, testAll = false } = await request.json();
    
    const results = [];

    // If testAll is true, send all templates
    const templatesToTest = testAll 
      ? Object.keys(emailTestData) 
      : [templateType || "tracking"];

    for (const templateName of templatesToTest) {
      try {
        console.log(`[EMAIL_TEST] Rendering template: ${templateName}`);
        
        // Get template data
        const templateData = emailTestData[templateName as keyof typeof emailTestData];
        if (!templateData) {
          throw new Error(`Template data not found for: ${templateName}`);
        }

        // Render the email template
        const htmlContent = await renderEmailTemplate(templateName, templateData);
        const subject = getEmailTemplateSubject(templateName);

        // Send the email
        const emailResult = await sendEmail({
          to: "sharepoints911@gmail.com",
          subject: `[TEST] ${subject}`,
          html: htmlContent,
        });

        results.push({
          template: templateName,
          success: emailResult,
          subject: `[TEST] ${subject}`,
          error: emailResult ? null : "Failed to send email",
        });

        console.log(`[EMAIL_TEST] Template ${templateName} sent successfully`);

        // Add a small delay between emails to avoid rate limiting
        if (templatesToTest.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`[EMAIL_TEST] Error with template ${templateName}:`, error);
        results.push({
          template: templateName,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Email test completed. ${results.filter(r => r.success).length}/${results.length} emails sent successfully.`,
      results,
      testEmail: "sharepoints911@gmail.com",
    });

  } catch (error) {
    console.error("[EMAIL_TEST] Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Email Template Testing API",
    usage: {
      method: "POST",
      body: {
        templateType: "tracking | update-payment | update-info | update-tcc | approval-badge | rejection",
        testAll: "boolean (optional) - if true, sends all templates"
      }
    },
    availableTemplates: Object.keys(emailTestData),
    testEmail: "sharepoints911@gmail.com",
  });
}
