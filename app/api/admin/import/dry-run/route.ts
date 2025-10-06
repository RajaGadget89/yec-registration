import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { validateSuperAdminAccess } from "@/lib/auth/admin-auth";
import { JsonConfigurationTransformer } from "@/lib/import/jsonConfigurationTransformer";

export async function POST(request: NextRequest) {
  try {
    const adminValidation = await validateSuperAdminAccess(request);
    if (!adminValidation.valid) {
      return NextResponse.json(
        { error: "Unauthorized", message: adminValidation.error },
        { status: 401 },
      );
    }

    const { sessionId, mappedData } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Bad Request", message: "Session ID is required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

    // Verify session exists and belongs to the admin
    const { data: session, error: sessionError } = await supabase
      .from("import_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("admin_user_id", adminValidation.user?.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Not Found", message: "Import session not found" },
        { status: 404 },
      );
    }

    // Get mapped data from session if not provided
    let finalMappedData = mappedData;
    if (!finalMappedData) {
      const parsedData = session.metadata?.parsed_data;

      if (!parsedData) {
        return NextResponse.json(
          {
            error: "No parsed data found",
            message: "CSV data not found in session",
          },
          { status: 400 },
        );
      }

      // Transform data using JSON configuration (single gateway)
      const jsonTransformer = new JsonConfigurationTransformer();
      await jsonTransformer.loadConfiguration();
      console.log("✅ Dry-run using JSON configuration transformer");

      // Flatten the data
      const flattenedData =
        parsedData.length > 0 && parsedData[0].data
          ? parsedData[0].data
          : parsedData;

      finalMappedData = flattenedData.map((row: any, index: number) => {
        const res = jsonTransformer.transformRow(row);
        return {
          ...(res.transformedData || {}),
          row_number: index + 1,
          is_valid: res.success,
          validation_errors: res.errors,
          validation_warnings: res.warnings,
        };
      });
      console.log(
        `✅ Dry-run transformed ${finalMappedData.length} records using JSON configuration`,
      );
    }

    // Simulate dry run results
    const dryRunResults = {
      success: true,
      validRecords: finalMappedData.length,
      invalidRecords: 0,
      trackingCodes: generateMockTrackingCodes(finalMappedData.length),
      badges: generateMockBadges(finalMappedData.length),
      emails: generateMockEmails(finalMappedData.length),
      estimatedTime: Math.max(30, Math.round(finalMappedData.length * 0.5)), // 0.5 seconds per record
      warnings: [],
      preview: {
        sampleTrackingCodes: generateMockTrackingCodes(5),
        sampleBadges: generateMockBadges(3),
        sampleEmails: generateMockEmails(2),
      },
    };

    // Store dry run results in session metadata
    await supabase
      .from("import_sessions")
      .update({
        metadata: {
          ...session.metadata,
          dry_run_results: dryRunResults,
          dry_run_at: new Date().toISOString(),
        },
      })
      .eq("id", sessionId);

    // Log dry run event
    await supabase.from("import_audit_logs").insert({
      import_session_id: sessionId,
      admin_user_id: adminValidation.user?.id,
      event_type: "dry_run_completed",
      event_details: {
        valid_records: dryRunResults.validRecords,
        estimated_time: dryRunResults.estimatedTime,
        tracking_codes_count: dryRunResults.trackingCodes.length,
        badges_count: dryRunResults.badges.length,
        emails_count: dryRunResults.emails.length,
      },
    });

    return NextResponse.json(dryRunResults);
  } catch (error) {
    console.error("Error in dry run:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Dry run failed" },
      { status: 500 },
    );
  }
}

function generateMockTrackingCodes(count: number): string[] {
  const codes = [];
  for (let i = 1; i <= count; i++) {
    codes.push(`YEC-BKK-68${String(i).padStart(3, "0")}`);
  }
  return codes;
}

function generateMockBadges(count: number): string[] {
  const badges = [];
  for (let i = 1; i <= count; i++) {
    badges.push(`https://example.com/badges/badge-${i}.png`);
  }
  return badges;
}

function generateMockEmails(count: number): any[] {
  const emails = [];
  for (let i = 1; i <= count; i++) {
    emails.push({
      recipient: `user${i}@example.com`,
      subject: "Congratulations! Your YEC Registration is Approved",
      content: `Dear User ${i},\n\nCongratulations! Your YEC registration has been approved...`,
    });
  }
  return emails;
}
