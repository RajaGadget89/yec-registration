import { getSupabaseServiceClient } from "../../lib/supabase-server";
import { formatThailandTime } from "../../lib/timezoneUtils";

export async function GET() {
  try {
    const supabase = getSupabaseServiceClient();

    // Get the latest registration
    const { data, error } = await supabase
      .from("registrations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      return new Response(
        JSON.stringify({
          error: "Database query failed",
          message: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No registrations found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const latestRegistration = data[0];

    return new Response(
      JSON.stringify({
        success: true,
        registration: {
          id: (latestRegistration as any).id,
          registration_id: (latestRegistration as any).registration_id,
          badge_url: (latestRegistration as any).badge_url,
          email_sent: (latestRegistration as any).email_sent,
          email_sent_at: (latestRegistration as any).email_sent_at,
          email_sent_at_thailand: (latestRegistration as any).email_sent_at
            ? formatThailandTime((latestRegistration as any).email_sent_at)
            : null,
          created_at: (latestRegistration as any).created_at,
          created_at_thailand: formatThailandTime(
            (latestRegistration as any).created_at,
          ),
          updated_at: (latestRegistration as any).updated_at,
          updated_at_thailand: formatThailandTime(
            (latestRegistration as any).updated_at,
          ),
          hotel_choice: (latestRegistration as any).hotel_choice,
          room_type: (latestRegistration as any).room_type,
          external_hotel_name: (latestRegistration as any).external_hotel_name,
          roommate_info: (latestRegistration as any).roommate_info,
          roommate_phone: (latestRegistration as any).roommate_phone,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Verification error:", error);
    return new Response(
      JSON.stringify({
        error: "Verification failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
