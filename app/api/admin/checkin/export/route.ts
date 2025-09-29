import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { getCurrentUser } from "../../../../lib/auth-utils.server";

export async function GET(req: NextRequest) {
  try {
    console.log("[Export API] Starting export request");

    // Check admin authentication
    const user = await getCurrentUser();
    if (!user) {
      console.log("[Export API] Unauthorized access attempt - no user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(
      "[Export API] User authenticated:",
      user.email,
      "Role:",
      user.role,
    );

    // Check if user has admin or super_admin role
    if (user.role !== "admin" && user.role !== "super_admin") {
      console.log("[Export API] User does not have admin role:", user.role);
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "csv";
    const search = searchParams.get("search") || "";
    const eventType = searchParams.get("eventType") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const province = searchParams.get("province") || "";
    const sortBy = searchParams.get("sortBy") || "checkin_time";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    console.log("[Export API] Parameters:", {
      format,
      search,
      eventType,
      dateFrom,
      dateTo,
      province,
      sortBy,
      sortOrder,
    });

    const supabase = getSupabaseServiceClient();

    // Build the query with filters - using the same approach as attendance-filtered API
    console.log("[Export API] Building query for user_checkins table");

    // Use the same query structure as the dashboard API
    let query = supabase.from("user_checkins").select(`
        id,
        checkin_time,
        location,
        notes,
        registration_id,
        checkin_event_id,
        checked_in_by,
        registrations!inner(
          id,
          first_name,
          last_name,
          email,
          phone,
          company_name,
          yec_province,
          status
        ),
        checkin_events!inner(
          id,
          name,
          event_types!inner(name, business_rule_category)
        )
      `);

    // Apply filters at database level (same as dashboard)
    if (search) {
      console.log("[Export API] Adding search filter:", search);
      const searchTerm = `%${search}%`;
      query = query.or(
        `registrations.first_name.ilike.${searchTerm},registrations.last_name.ilike.${searchTerm},registrations.email.ilike.${searchTerm},registrations.company_name.ilike.${searchTerm}`,
      );
    }

    if (eventType) {
      console.log("[Export API] Adding eventType filter:", eventType);
      query = query.eq("checkin_events.event_types.name", eventType);
    }

    if (dateFrom) {
      console.log("[Export API] Adding dateFrom filter:", dateFrom);
      query = query.gte("checkin_time", dateFrom + "T00:00:00");
    }
    if (dateTo) {
      console.log("[Export API] Adding dateTo filter:", dateTo);
      query = query.lte("checkin_time", dateTo + "T23:59:59");
    }

    if (province) {
      console.log("[Export API] Adding province filter:", province);
      query = query.eq("registrations.yec_province", province);
    }

    // Apply sorting
    console.log("[Export API] Adding sort order:", sortOrder);
    query = query.order("checkin_time", { ascending: sortOrder === "asc" });

    console.log("[Export API] Executing query...");
    const { data: checkins, error } = await query;

    if (error) {
      console.error("[Export API] Query error:", error);
      console.error("[Export API] Query details:", {
        table: "user_checkins",
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return NextResponse.json(
        { error: "Failed to fetch data", details: error.message },
        { status: 500 },
      );
    }

    console.log("[Export API] Found checkins:", checkins?.length || 0);

    if (!checkins || checkins.length === 0) {
      console.log("[Export API] No data to export");
      // Return a simple CSV with headers only
      const headers = [
        "Check-in Time",
        "User Name",
        "Email",
        "Event Name",
        "Location",
        "Notes",
      ];
      const csvContent = headers.join(",") + "\n";

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="attendance_export_${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // Data is already filtered by the database query, no need for additional filtering
    console.log(
      "[Export API] Data already filtered by database query, processing",
      checkins.length,
      "records",
    );

    // Format the data for export
    console.log(
      "[Export API] Formatting export data for",
      checkins.length,
      "records",
    );

    let exportData = [];
    try {
      exportData = checkins.map((checkin: any) => {
        // Data is already joined, so we can access it directly
        const reg = checkin.registrations;
        const event = checkin.checkin_events;

        return {
          "Check-in Time": checkin.checkin_time
            ? new Date(checkin.checkin_time).toLocaleString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          "User Name": reg
            ? `${reg.first_name || ""} ${reg.last_name || ""}`.trim()
            : "",
          Email: reg?.email || "",
          "Event Name": event?.name || "",
          Location: checkin.location || "",
          Notes: checkin.notes || "",
        };
      });
      console.log(
        "[Export API] Successfully formatted",
        exportData.length,
        "export records",
      );
    } catch (formatError) {
      console.error("[Export API] Error formatting export data:", formatError);
      return NextResponse.json(
        {
          error: "Failed to format export data",
          details: (formatError as Error).message,
        },
        { status: 500 },
      );
    }

    if (format === "csv") {
      // Convert to CSV
      console.log("[Export API] Generating CSV format");
      try {
        // Handle empty export data
        if (!exportData || exportData.length === 0) {
          console.log(
            "[Export API] No data to export, returning empty CSV with headers",
          );
          const headers = [
            "Check-in Time",
            "User Name",
            "Email",
            "Event Name",
            "Location",
            "Notes",
          ];
          const csvContent = headers.join(",") + "\n";

          return new NextResponse(csvContent, {
            headers: {
              "Content-Type": "text/csv",
              "Content-Disposition": `attachment; filename="attendance_export_${new Date().toISOString().split("T")[0]}.csv"`,
            },
          });
        }

        const headers = Object.keys(exportData[0]);
        const csvContent = [
          headers.join(","),
          ...exportData.map((row) =>
            headers
              .map((header) => {
                const value = (row as any)[header];
                // Escape commas and quotes in CSV
                if (
                  typeof value === "string" &&
                  (value.includes(",") ||
                    value.includes('"') ||
                    value.includes("\n"))
                ) {
                  return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
              })
              .join(","),
          ),
        ].join("\n");

        console.log(
          "[Export API] CSV generated successfully, length:",
          csvContent.length,
        );
        return new NextResponse(csvContent, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="attendance_export_${new Date().toISOString().split("T")[0]}.csv"`,
          },
        });
      } catch (csvError) {
        console.error("[Export API] Error generating CSV:", csvError);
        return NextResponse.json(
          {
            error: "Failed to generate CSV",
            details: (csvError as Error).message,
          },
          { status: 500 },
        );
      }
    } else {
      // Return JSON
      console.log("[Export API] Returning JSON format");
      return NextResponse.json(exportData, {
        headers: {
          "Content-Disposition": `attachment; filename="attendance_export_${new Date().toISOString().split("T")[0]}.json"`,
        },
      });
    }
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
