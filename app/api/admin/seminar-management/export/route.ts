import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { assertDbRouting } from "../../../../lib/env-guards";
import { audit } from "../../../../lib/audit";
import { getCurrentUserFromRequest } from "../../../../lib/auth-utils.server";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
  try {
    // Assert database routing
    await assertDbRouting();

    // Check authentication
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get Supabase client
    const supabase = getSupabaseServiceClient();

    // Parse request body
    const body = await request.json();
    const {
      format = "excel", // 'excel' or 'csv'
      scope = "filtered", // 'all' or 'filtered'
      columns = [], // Array of column names to include
      filters = {}, // Same filters as GET participants
      participantIds = [], // Specific participant IDs to export
    } = body;

    // Validate format
    if (!["excel", "csv"].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be "excel" or "csv"' },
        { status: 400 },
      );
    }

    // Validate scope
    if (!["all", "filtered"].includes(scope)) {
      return NextResponse.json(
        { error: 'Invalid scope. Must be "all" or "filtered"' },
        { status: 400 },
      );
    }

    // Build query based on scope and filters
    let query = supabase.from("seminar_participants").select(`
        *,
        seminar_accommodations (
          seminar_hotels (name),
          check_in_date,
          check_out_date,
          room_type
        ),
        seminar_event_participants (
          seminar_events (name)
        ),
        seminar_transportation (
          direction,
          transport_type,
          details
        ),
        seminar_finances (
          activity_fee,
          accommodation_fee,
          dinner_fee,
          total_fee,
          payment_status
        )
      `);

    // Apply filters if scope is 'filtered'
    if (scope === "filtered") {
      // Apply search filter
      if (filters.search) {
        query = query.or(
          `full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,mobile_phone.ilike.%${filters.search}%`,
        );
      }

      // Apply province filter
      if (filters.provinces && filters.provinces.length > 0) {
        query = query.in("province", filters.provinces);
      }

      // Apply hotel filter
      if (filters.hotels && filters.hotels.length > 0) {
        query = query.in(
          "seminar_accommodations.seminar_hotels.name",
          filters.hotels,
        );
      }

      // Apply event filter
      if (filters.events && filters.events.length > 0) {
        query = query.in(
          "seminar_event_participants.seminar_events.name",
          filters.events,
        );
      }

      // Apply payment status filter
      if (filters.paymentStatus && filters.paymentStatus.length > 0) {
        query = query.in(
          "seminar_finances.payment_status",
          filters.paymentStatus,
        );
      }

      // Apply date range filter
      if (filters.dateFrom) {
        query = query.gte(
          "seminar_accommodations.check_in_date",
          filters.dateFrom,
        );
      }
      if (filters.dateTo) {
        query = query.lte(
          "seminar_accommodations.check_out_date",
          filters.dateTo,
        );
      }
    }

    // Apply specific participant IDs if provided
    if (participantIds && participantIds.length > 0) {
      query = query.in("id", participantIds);
    }

    // Execute query
    const { data: participants, error } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch participants for export" },
        { status: 500 },
      );
    }

    if (!participants || participants.length === 0) {
      return NextResponse.json(
        { error: "No participants found to export" },
        { status: 404 },
      );
    }

    // Define default columns if none specified
    const defaultColumns = [
      "checker_reference_id",
      "participant_number",
      "prefix",
      "full_name",
      "position",
      "participant_position",
      "province",
      "region",
      "gender",
      "email",
      "mobile_phone",
      "telephone",
      "attendance_status",
      "hotel_name",
      "check_in_date",
      "check_out_date",
      "room_type",
      "events",
      "transportation_outbound",
      "transportation_return",
      "activity_fee",
      "accommodation_fee",
      "dinner_fee",
      "total_fee",
      "payment_status",
      "created_at",
      "updated_at",
    ];

    const exportColumns = columns.length > 0 ? columns : defaultColumns;

    // Transform data for export
    const exportData = participants.map((participant: any) => {
      const row: any = {};

      // Basic participant info
      if (exportColumns.includes("checker_reference_id")) {
        row["Checker Reference ID"] = participant.checker_reference_id;
      }
      if (exportColumns.includes("participant_number")) {
        row["Participant Number"] = participant.participant_number;
      }
      if (exportColumns.includes("prefix")) {
        row["Prefix"] = participant.prefix;
      }
      if (exportColumns.includes("full_name")) {
        row["Full Name"] = participant.full_name;
      }
      if (exportColumns.includes("position")) {
        row["Position"] = participant.position;
      }
      if (exportColumns.includes("participant_position")) {
        row["Participant Position"] = participant.participant_position;
      }
      if (exportColumns.includes("province")) {
        row["Province"] = participant.province;
      }
      if (exportColumns.includes("region")) {
        row["Region"] = participant.region;
      }
      if (exportColumns.includes("gender")) {
        row["Gender"] = participant.gender;
      }
      if (exportColumns.includes("email")) {
        row["Email"] = participant.email;
      }
      if (exportColumns.includes("mobile_phone")) {
        row["Mobile Phone"] = participant.mobile_phone;
      }
      if (exportColumns.includes("telephone")) {
        row["Telephone"] = participant.telephone;
      }
      if (exportColumns.includes("attendance_status")) {
        row["Attendance Status"] = participant.attendance_status;
      }

      // Accommodation info
      if (
        participant.seminar_accommodations &&
        participant.seminar_accommodations.length > 0
      ) {
        const accommodation = participant.seminar_accommodations[0];
        if (exportColumns.includes("hotel_name")) {
          row["Hotel Name"] = accommodation.seminar_hotels?.name || "";
        }
        if (exportColumns.includes("check_in_date")) {
          row["Check In Date"] = accommodation.check_in_date;
        }
        if (exportColumns.includes("check_out_date")) {
          row["Check Out Date"] = accommodation.check_out_date;
        }
        if (exportColumns.includes("room_type")) {
          row["Room Type"] = accommodation.room_type;
        }
      }

      // Events info
      if (exportColumns.includes("events")) {
        const events =
          participant.seminar_event_participants
            ?.map((ep: any) => ep.seminar_events?.name)
            .filter(Boolean) || [];
        row["Events"] = events.join(", ");
      }

      // Transportation info
      if (
        participant.seminar_transportation &&
        participant.seminar_transportation.length > 0
      ) {
        const outbound = participant.seminar_transportation.find(
          (t: any) => t.direction === "outbound",
        );
        const returnTrip = participant.seminar_transportation.find(
          (t: any) => t.direction === "return",
        );

        if (exportColumns.includes("transportation_outbound")) {
          row["Transportation Outbound"] = outbound
            ? `${outbound.transport_type}${outbound.details ? ` - ${outbound.details}` : ""}`
            : "";
        }
        if (exportColumns.includes("transportation_return")) {
          row["Transportation Return"] = returnTrip
            ? `${returnTrip.transport_type}${returnTrip.details ? ` - ${returnTrip.details}` : ""}`
            : "";
        }
      }

      // Financial info
      if (
        participant.seminar_finances &&
        participant.seminar_finances.length > 0
      ) {
        const finance = participant.seminar_finances[0];
        if (exportColumns.includes("activity_fee")) {
          row["Activity Fee"] = finance.activity_fee;
        }
        if (exportColumns.includes("accommodation_fee")) {
          row["Accommodation Fee"] = finance.accommodation_fee;
        }
        if (exportColumns.includes("dinner_fee")) {
          row["Dinner Fee"] = finance.dinner_fee;
        }
        if (exportColumns.includes("total_fee")) {
          row["Total Fee"] = finance.total_fee;
        }
        if (exportColumns.includes("payment_status")) {
          row["Payment Status"] = finance.payment_status;
        }
      }

      // Timestamps
      if (exportColumns.includes("created_at")) {
        row["Created At"] = participant.created_at;
      }
      if (exportColumns.includes("updated_at")) {
        row["Updated At"] = participant.updated_at;
      }

      return row;
    });

    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const filename = `seminar_participants_${scope}_${timestamp}`;

    // Generate file based on format
    if (format === "excel") {
      // Create Excel workbook
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const colWidths = exportColumns.map(() => ({ wch: 20 }));
      worksheet["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, "Participants");

      // Generate buffer
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      // Return Excel file
      return new NextResponse(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
          "Content-Length": buffer.length.toString(),
        },
      });
    } else {
      // Generate CSV
      const csvContent = [
        // Header row
        Object.keys(exportData[0] || {}).join(","),
        // Data rows
        ...exportData.map((row) =>
          Object.values(row)
            .map((value) =>
              typeof value === "string" && value.includes(",")
                ? `"${value.replace(/"/g, '""')}"`
                : value,
            )
            .join(","),
        ),
      ].join("\n");

      // Return CSV file
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
          "Content-Length": Buffer.byteLength(csvContent, "utf8").toString(),
        },
      });
    }
  } catch (error) {
    console.error("Export error:", error);

    // Log the error
    await audit.logEvent({
      action: "export_error",
      resource: "seminar_participants",
      actor_role: "admin",
      result: "error",
      correlation_id: crypto.randomUUID(),
      meta: {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
    });

    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 },
    );
  }
}

// GET endpoint for export options/preview
export async function GET(_request: NextRequest) {
  try {
    // Assert database routing
    await assertDbRouting();

    // Get Supabase client
    const supabase = getSupabaseServiceClient();

    // Get available columns and filter options
    const { data: participants, error } = await supabase
      .from("seminar_participants")
      .select("province")
      .limit(1000);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch export options" },
        { status: 500 },
      );
    }

    // Get unique provinces
    const provinces = [
      ...new Set(participants?.map((p) => p.province).filter(Boolean)),
    ];

    // Get hotels
    const { data: hotels } = await supabase
      .from("seminar_hotels")
      .select("name")
      .order("name");

    // Get events
    const { data: events } = await supabase
      .from("seminar_events")
      .select("name")
      .order("name");

    // Get payment statuses
    const { data: finances } = await supabase
      .from("seminar_finances")
      .select("payment_status")
      .not("payment_status", "is", null);

    const paymentStatuses = [
      ...new Set(finances?.map((f) => f.payment_status).filter(Boolean)),
    ];

    // Define available columns
    const availableColumns = [
      {
        key: "checker_reference_id",
        label: "Checker Reference ID",
        category: "Basic Info",
      },
      {
        key: "participant_number",
        label: "Participant Number",
        category: "Basic Info",
      },
      { key: "prefix", label: "Prefix", category: "Basic Info" },
      { key: "full_name", label: "Full Name", category: "Basic Info" },
      { key: "position", label: "Position", category: "Basic Info" },
      {
        key: "participant_position",
        label: "Participant Position",
        category: "Basic Info",
      },
      { key: "province", label: "Province", category: "Basic Info" },
      { key: "region", label: "Region", category: "Basic Info" },
      { key: "gender", label: "Gender", category: "Basic Info" },
      { key: "email", label: "Email", category: "Contact Info" },
      { key: "mobile_phone", label: "Mobile Phone", category: "Contact Info" },
      { key: "telephone", label: "Telephone", category: "Contact Info" },
      {
        key: "attendance_status",
        label: "Attendance Status",
        category: "Basic Info",
      },
      { key: "hotel_name", label: "Hotel Name", category: "Accommodation" },
      {
        key: "check_in_date",
        label: "Check In Date",
        category: "Accommodation",
      },
      {
        key: "check_out_date",
        label: "Check Out Date",
        category: "Accommodation",
      },
      { key: "room_type", label: "Room Type", category: "Accommodation" },
      { key: "events", label: "Events", category: "Events" },
      {
        key: "transportation_outbound",
        label: "Transportation Outbound",
        category: "Transportation",
      },
      {
        key: "transportation_return",
        label: "Transportation Return",
        category: "Transportation",
      },
      { key: "activity_fee", label: "Activity Fee", category: "Financial" },
      {
        key: "accommodation_fee",
        label: "Accommodation Fee",
        category: "Financial",
      },
      { key: "dinner_fee", label: "Dinner Fee", category: "Financial" },
      { key: "total_fee", label: "Total Fee", category: "Financial" },
      { key: "payment_status", label: "Payment Status", category: "Financial" },
      { key: "created_at", label: "Created At", category: "System" },
      { key: "updated_at", label: "Updated At", category: "System" },
    ];

    return NextResponse.json({
      availableColumns,
      filterOptions: {
        provinces,
        hotels: hotels?.map((h) => h.name) || [],
        events: events?.map((e) => e.name) || [],
        paymentStatuses,
      },
      formats: [
        {
          key: "excel",
          label: "Excel (.xlsx)",
          description: "Microsoft Excel format with multiple sheets support",
        },
        {
          key: "csv",
          label: "CSV (.csv)",
          description:
            "Comma-separated values, compatible with all spreadsheet applications",
        },
      ],
      scopes: [
        {
          key: "all",
          label: "All Data",
          description: "Export all participants regardless of current filters",
        },
        {
          key: "filtered",
          label: "Filtered Data",
          description: "Export only participants matching current filters",
        },
      ],
    });
  } catch (error) {
    console.error("Export options error:", error);
    return NextResponse.json(
      { error: "Failed to fetch export options" },
      { status: 500 },
    );
  }
}
