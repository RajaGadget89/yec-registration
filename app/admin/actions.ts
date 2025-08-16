import { getSupabaseServiceClient } from "../lib/supabase-server";
import { validateAdminAccess } from "../lib/admin-guard-server";
import type { Registration } from "../types/database";
import { NextRequest } from "next/server";

export interface FilterState {
  status: string[];
  provinces: string[];
  search: string;
  dateFrom: string;
  dateTo: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortColumn: string;
  sortDirection: "asc" | "desc";
}

export interface QueryResult {
  registrations: Registration[];
  totalCount: number;
  statusCounts: {
    total: number;
    pending: number;
    waiting_for_review: number;
    approved: number;
    rejected: number;
  };
}

export async function getRegistrations(
  filters: FilterState,
  pagination: PaginationParams,
  request?: Request,
): Promise<QueryResult> {
  // Validate admin access if request is provided
  if (request) {
    const adminValidation = validateAdminAccess(request as NextRequest);
    if (!adminValidation.valid) {
      throw new Error(`Admin access required: ${adminValidation.error}`);
    }
  }

  const supabase = getSupabaseServiceClient();

  let query = supabase.from("registrations").select("*", { count: "exact" });

  // Apply filters
  if (filters.status.length > 0) {
    query = query.in("status", filters.status);
  }

  if (filters.provinces.length > 0) {
    query = query.in("yec_province", filters.provinces);
  }

  if (filters.search) {
    const searchTerm = `%${filters.search}%`;
    // Use individual filter conditions for search - Supabase v2 syntax
    query = query.or(
      `registration_id.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},company_name.ilike.${searchTerm}`,
    );
  }

  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo + "T23:59:59");
  }

  // Apply sorting
  const columnMapping: { [key: string]: string } = {
    name: "first_name", // Sort by first_name for name column
    status: "status",
    yec_province: "yec_province",
    created_at: "created_at",
    email: "email",
    phone: "phone",
  };

  const dbColumn = columnMapping[pagination.sortColumn] || "created_at";
  const sortDirection = pagination.sortDirection;

  // Apply the sorting
  query = query.order(dbColumn, { ascending: sortDirection === "asc" });

  // Apply pagination
  const from = (pagination.page - 1) * pagination.pageSize;
  const to = from + pagination.pageSize - 1;
  query = query.range(from, to);

  const { data: registrations, error, count } = await query;

  if (error) {
    console.error("Error fetching registrations:", error);
    console.error("Sort column:", pagination.sortColumn);
    console.error("Sort direction:", pagination.sortDirection);
    console.error("DB column:", dbColumn);
    throw new Error(`Failed to fetch registrations: ${error.message}`);
  }

  // Get status counts with the same filters applied
  let statusCountsQuery = supabase.from("registrations").select("status");

  // Apply the same filters to status counts query
  if (filters.status.length > 0) {
    statusCountsQuery = statusCountsQuery.in("status", filters.status);
  }

  if (filters.provinces.length > 0) {
    statusCountsQuery = statusCountsQuery.in("yec_province", filters.provinces);
  }

  if (filters.search) {
    const searchTerm = `%${filters.search}%`;
    statusCountsQuery = statusCountsQuery.or(
      `registration_id.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},company_name.ilike.${searchTerm}`,
    );
  }

  if (filters.dateFrom) {
    statusCountsQuery = statusCountsQuery.gte("created_at", filters.dateFrom);
  }

  if (filters.dateTo) {
    statusCountsQuery = statusCountsQuery.lte(
      "created_at",
      filters.dateTo + "T23:59:59",
    );
  }

  const { data: statusCountsData, error: statusError } =
    await statusCountsQuery;

  if (statusError) {
    console.error("Error fetching status counts:", statusError);
    throw new Error("Failed to fetch status counts");
  }

  const statusCounts = {
    total: statusCountsData?.length || 0,
    pending:
      statusCountsData?.filter((r) => r.status === "pending").length || 0,
    waiting_for_review:
      statusCountsData?.filter((r) => r.status === "waiting_for_review")
        .length || 0,
    approved:
      statusCountsData?.filter((r) => r.status === "approved").length || 0,
    rejected:
      statusCountsData?.filter((r) => r.status === "rejected").length || 0,
  };

  return {
    registrations: registrations || [],
    totalCount: count || 0,
    statusCounts,
  };
}

export async function getProvinces(): Promise<string[]> {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from("registrations")
    .select("yec_province")
    .not("yec_province", "is", null);

  if (error) {
    console.error("Error fetching provinces:", error);
    throw new Error("Failed to fetch provinces");
  }

  const provinces = Array.from(
    new Set(data?.map((r) => r.yec_province).filter(Boolean) || []),
  );
  return provinces.sort();
}

export async function exportToCSV(filters: FilterState): Promise<string> {
  const supabase = getSupabaseServiceClient();

  let query = supabase.from("registrations").select("*");

  // Apply filters
  if (filters.status.length > 0) {
    query = query.in("status", filters.status);
  }

  if (filters.provinces.length > 0) {
    query = query.in("yec_province", filters.provinces);
  }

  if (filters.search) {
    const searchTerm = `%${filters.search}%`;
    query = query.or(
      `registration_id.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},company_name.ilike.${searchTerm}`,
    );
  }

  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo + "T23:59:59");
  }

  // Order by created_at desc
  query = query.order("created_at", { ascending: false });

  const { data: registrations, error } = await query;

  if (error) {
    console.error("Error fetching registrations for CSV:", error);
    throw new Error("Failed to fetch registrations for CSV export");
  }

  // Generate CSV
  const headers = [
    "Registration ID",
    "Title",
    "First Name",
    "Last Name",
    "Nickname",
    "Phone",
    "Line ID",
    "Email",
    "Company Name",
    "Business Type",
    "Business Type Other",
    "YEC Province",
    "Hotel Choice",
    "Room Type",
    "Roommate Info",
    "Roommate Phone",
    "External Hotel Name",
    "Travel Type",
    "Status",
    "Created At",
    "Updated At",
    "IP Address",
    "Email Sent",
    "Email Sent At",
  ];

  const csvRows = [headers];

  for (const registration of registrations || []) {
    const row = [
      registration.registration_id,
      registration.title,
      registration.first_name,
      registration.last_name,
      registration.nickname || "",
      registration.phone,
      registration.line_id,
      registration.email,
      registration.company_name,
      registration.business_type,
      registration.business_type_other || "",
      registration.yec_province,
      registration.hotel_choice,
      registration.room_type || "",
      registration.roommate_info || "",
      registration.roommate_phone || "",
      registration.external_hotel_name || "",
      registration.travel_type,
      registration.status,
      registration.created_at,
      registration.updated_at,
      registration.ip_address || "",
      registration.email_sent ? "Yes" : "No",
      registration.email_sent_at || "",
    ];

    csvRows.push(row.map((field) => `"${String(field).replace(/"/g, '""')}"`));
  }

  return csvRows.map((row) => row.join(",")).join("\n");
}
