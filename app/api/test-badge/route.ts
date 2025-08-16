import { generateYECBadge } from "../../lib/badgeGenerator";
import { uploadBadgeToSupabase } from "../../lib/uploadBadgeToSupabase";

export async function GET() {
  try {
    console.log("Testing badge generation...");

    // Check environment variables
    const envCheck = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    };

    console.log("Environment check:", envCheck);

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return new Response(
        JSON.stringify({
          error: "Badge service not configured",
          message: "Supabase environment variables are not set",
          envCheck,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Test badge generation with sample data
    const testBadgeData = {
      registrationId: "TEST-123456789",
      fullName: "นาย ทดสอบ ระบบ",
      nickname: "ทดสอบ",
      phone: "0812345678",
      yecProvince: "กรุงเทพมหานคร",
      businessType: "เทคโนโลยี",
      businessTypeOther: undefined,
      profileImageBase64: undefined,
    };

    console.log("Generating test badge with data:", testBadgeData);

    // Generate badge
    const badgeBuffer = await generateYECBadge(testBadgeData);
    console.log(
      "Badge generated successfully, size:",
      badgeBuffer.length,
      "bytes",
    );

    // Upload badge
    const filename = `test-badge-${Date.now()}.png`;
    const badgeUrl = await uploadBadgeToSupabase(badgeBuffer, filename);
    console.log("Badge uploaded successfully:", badgeUrl);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Badge generation and upload test successful",
        badgeUrl,
        badgeSize: badgeBuffer.length,
        envCheck,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Badge test error:", error);
    return new Response(
      JSON.stringify({
        error: "Badge test failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
