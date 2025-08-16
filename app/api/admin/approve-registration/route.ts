import { getSupabaseServiceClient } from "../../../lib/supabase-server";
import { sendApprovedEmail } from "../../../lib/emailService";
import { generateBadge } from "../../../lib/generateBadge";
import { getThailandTimeISOString } from "../../../lib/timezoneUtils";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { registrationId } = body;

    if (!registrationId) {
      return new Response(
        JSON.stringify({
          error: "Missing registrationId",
          message: "Registration ID is required",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    const supabase = getSupabaseServiceClient();

    // 1) Load the registration (select id, email, first_name, last_name, status)
    const { data: registration, error: fetchError } = await supabase
      .from("registrations")
      .select("id, email, first_name, last_name, status, badge_url")
      .eq("registration_id", registrationId)
      .single();

    if (fetchError || !registration) {
      console.error("Error fetching registration:", fetchError);
      return new Response(
        JSON.stringify({
          error: "Registration not found",
          message: "Registration not found or error occurred",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    // 2) If already "approved" → return 200 with { success:true, status:"approved", badgeUrl: existing } (idempotent)
    if (registration.status === "approved") {
      return new Response(
        JSON.stringify({
          success: true,
          status: "approved",
          badgeUrl: registration.badge_url,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    // 3) Generate badge URL
    const badgeUrl = await generateBadge({
      id: registration.id.toString(),
      firstName: registration.first_name,
      lastName: registration.last_name,
    });

    // 4) Update DB: status = "approved", badge_url = generated URL
    const { error: updateError } = await supabase
      .from("registrations")
      .update({
        status: "approved",
        badge_url: badgeUrl,
        updated_at: getThailandTimeISOString(),
      })
      .eq("registration_id", registrationId);

    if (updateError) {
      console.error("Error updating registration:", updateError);
      return new Response(
        JSON.stringify({
          error: "Update failed",
          message: "Failed to update registration status",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    // 5) Send email
    let emailSent = false;
    try {
      emailSent = await sendApprovedEmail({
        to: registration.email,
        firstName: registration.first_name,
        lastName: registration.last_name,
        badgeUrl: badgeUrl,
      });

      console.log("Approval email sent:", emailSent);
    } catch (emailError) {
      console.error("Error sending approval email:", emailError);
      emailSent = false;
    }

    // 6) Return JSON: { success:true, status:"approved", badgeUrl }
    return new Response(
      JSON.stringify({
        success: true,
        status: "approved",
        badgeUrl: badgeUrl,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({
        error: "Server error",
        message: "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}
