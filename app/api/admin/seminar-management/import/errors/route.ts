import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "../../../../../lib/auth-utils.server";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    if (user.role !== "super_admin" && user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { errorRows } = await request.json();

    if (!errorRows || !Array.isArray(errorRows)) {
      return NextResponse.json(
        { error: "Invalid error data" },
        { status: 400 },
      );
    }

    // Generate CSV content
    const csvHeaders = [
      "Row Number",
      "Error Message",
      "Participant Number",
      "Full Name",
      "Position",
      "Province",
      "Organization",
      "Category",
      "Email",
      "Phone",
      "Hotel",
      "Check-in Date",
      "Check-out Date",
      "Room Type",
      "Payment Status",
    ];

    const csvRows = errorRows.map((errorRow: any) => {
      const data = errorRow.data || {};
      return [
        errorRow.row,
        `"${errorRow.error.replace(/"/g, '""')}"`, // Escape quotes in error message
        data.participant_number || "",
        data.full_name || "",
        data.position || "",
        data.province || "",
        data.organization || "",
        data.category || "",
        data.email || "",
        data.mobile_phone || "",
        data.hotel_name || "",
        data.checkin_date || "",
        data.checkout_date || "",
        data.room_type || "",
        data.payment_status || "",
      ];
    });

    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map((row) => row.join(",")),
    ].join("\n");

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="import-errors-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error CSV generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate error CSV",
      },
      { status: 500 },
    );
  }
}
