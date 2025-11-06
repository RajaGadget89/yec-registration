import { NextRequest } from "next/server";
import { exportToCSV } from "../../../admin/actions";
import { getCurrentUser } from "../../../lib/auth-utils.server";

export async function GET(request: NextRequest) {
  try {
    // Check admin access - use same pattern as other admin routes
    const user = await getCurrentUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if user has admin or super_admin role (from database)
    if (user.role !== "admin" && user.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { searchParams } = new URL(request.url);

    // Parse filters from query params
    const filters = {
      status: searchParams.get("status")?.split(",").filter(Boolean) || [],
      provinces:
        searchParams.get("provinces")?.split(",").filter(Boolean) || [],
      search: searchParams.get("search") || "",
      dateFrom: searchParams.get("dateFrom") || "",
      dateTo: searchParams.get("dateTo") || "",
      hotelChoice:
        searchParams.get("hotelChoice")?.split(",").filter(Boolean) || [],
      travelType:
        searchParams.get("travelType")?.split(",").filter(Boolean) || [],
    };

    // Generate CSV data
    const csvData = await exportToCSV(filters);

    // Create response with CSV headers
    const response = new Response(csvData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="registrations-${new Date().toISOString().split("T")[0]}.csv"`,
        "Cache-Control": "no-cache",
      },
    });

    return response;
  } catch (error) {
    console.error("Error exporting CSV:", error);
    return new Response(JSON.stringify({ error: "Failed to export CSV" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
