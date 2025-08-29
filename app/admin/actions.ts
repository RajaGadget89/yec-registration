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
  // Validate admin access if request is provided and not in E2E mode
  if (request && process.env.E2E_TEST_MODE !== "true") {
    const adminValidation = validateAdminAccess(request as NextRequest);
    if (!adminValidation.valid) {
      throw new Error(`Admin access required: ${adminValidation.error}`);
    }
  }

  try {
    const supabase = getSupabaseServiceClient();

    // First, check if the table exists and we can connect
    const { error: tableError } = await supabase
      .from("registrations")
      .select("id")
      .limit(1);

    if (tableError) {
      console.error("Database connection or table access error:", tableError);
      // Return empty result for database issues
      return {
        registrations: [],
        totalCount: 0,
        statusCounts: {
          total: 0,
          pending: 0,
          waiting_for_review: 0,
          approved: 0,
          rejected: 0,
        },
      };
    }

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

      // Return empty result instead of throwing error
      return {
        registrations: [],
        totalCount: 0,
        statusCounts: {
          total: 0,
          pending: 0,
          waiting_for_review: 0,
          approved: 0,
          rejected: 0,
        },
      };
    }

    // Get status counts with the same filters applied
    let statusCountsQuery = supabase.from("registrations").select("status");

    // Apply the same filters to status counts query
    if (filters.status.length > 0) {
      statusCountsQuery = statusCountsQuery.in("status", filters.status);
    }

    if (filters.provinces.length > 0) {
      statusCountsQuery = statusCountsQuery.in(
        "yec_province",
        filters.provinces,
      );
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
      // Return default status counts instead of throwing error
      return {
        registrations: registrations || [],
        totalCount: count || 0,
        statusCounts: {
          total: 0,
          pending: 0,
          waiting_for_review: 0,
          approved: 0,
          rejected: 0,
        },
      };
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
  } catch (error) {
    console.error("Unexpected error in getRegistrations:", error);
    // Return empty result for any unexpected errors
    return {
      registrations: [],
      totalCount: 0,
      statusCounts: {
        total: 0,
        pending: 0,
        waiting_for_review: 0,
        approved: 0,
        rejected: 0,
      },
    };
  }
}

export async function getProvinces(): Promise<string[]> {
  try {
    const supabase = getSupabaseServiceClient();

    // First, check if the table exists and we can connect
    const { error: tableError } = await supabase
      .from("registrations")
      .select("id")
      .limit(1);

    if (tableError) {
      console.error(
        "Database connection or table access error in getProvinces:",
        tableError,
      );
      return [];
    }

    const { data, error } = await supabase
      .from("registrations")
      .select("yec_province")
      .not("yec_province", "is", null);

    if (error) {
      console.error("Error fetching provinces:", error);
      // Return empty array instead of throwing error for empty database
      return [];
    }

    // Handle empty data gracefully
    if (!data || data.length === 0) {
      return [];
    }

    const provinces = Array.from(
      new Set(data?.map((r) => r.yec_province).filter(Boolean) || []),
    );
    return provinces.sort();
  } catch (error) {
    console.error("Unexpected error in getProvinces:", error);
    return [];
  }
}

export async function exportToCSV(filters: FilterState): Promise<string> {
  try {
    const supabase = getSupabaseServiceClient();

    // First, check if the table exists and we can connect
    const { error: tableError } = await supabase
      .from("registrations")
      .select("id")
      .limit(1);

    if (tableError) {
      console.error(
        "Database connection or table access error in exportToCSV:",
        tableError,
      );
      return "registration_id,title,first_name,last_name,email,phone,company_name,yec_province,status,created_at\n";
    }

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

    const { data: registrations, error } = await query;

    if (error) {
      console.error("Error fetching registrations for CSV export:", error);
      return "registration_id,title,first_name,last_name,email,phone,company_name,yec_province,status,created_at\n";
    }

    // Handle empty data gracefully
    if (!registrations || registrations.length === 0) {
      return "registration_id,title,first_name,last_name,email,phone,company_name,yec_province,status,created_at\n";
    }

    // Convert to CSV
    const headers = [
      "registration_id",
      "title",
      "first_name",
      "last_name",
      "email",
      "phone",
      "company_name",
      "yec_province",
      "status",
      "created_at",
    ];

    const csvRows = [
      headers.join(","),
      ...registrations.map((registration) =>
        headers
          .map((header) => {
            const value = registration[header as keyof Registration];
            // Escape commas and quotes in CSV
            if (
              typeof value === "string" &&
              (value.includes(",") || value.includes('"'))
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value || "";
          })
          .join(","),
      ),
    ];

    return csvRows.join("\n");
  } catch (error) {
    console.error("Unexpected error in exportToCSV:", error);
    return "registration_id,title,first_name,last_name,email,phone,company_name,yec_province,status,created_at\n";
  }
}

export async function getRegistrationById(
  id: string,
  request?: Request,
): Promise<Registration | null> {
  // Validate admin access if request is provided
  if (request) {
    const adminValidation = validateAdminAccess(request as NextRequest);
    if (!adminValidation.valid) {
      throw new Error(`Admin access required: ${adminValidation.error}`);
    }
  }

  try {
    const supabase = getSupabaseServiceClient();

    // First, check if the table exists and we can connect
    const { error: tableError } = await supabase
      .from("registrations")
      .select("id")
      .limit(1);

    if (tableError) {
      console.error(
        "Database connection or table access error in getRegistrationById:",
        tableError,
      );
      return null;
    }

    const { data: registration, error } = await supabase
      .from("registrations")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return null;
      }
      console.error("Error fetching registration by ID:", error);
      return null;
    }

    return registration;
  } catch (error) {
    console.error("Unexpected error in getRegistrationById:", error);
    return null;
  }
}

export async function getRegistrationStatistics(): Promise<{
  total: number;
  waiting_for_review: number;
  waiting_for_update_payment: number;
  waiting_for_update_info: number;
  waiting_for_update_tcc: number;
  approved: number;
  rejected: number;
}> {
  try {
    const supabase = getSupabaseServiceClient();

    // First, check if the table exists and we can connect
    const { error: tableError } = await supabase
      .from("registrations")
      .select("id")
      .limit(1);

    if (tableError) {
      console.error(
        "Database connection or table access error in getRegistrationStatistics:",
        tableError,
      );
      return {
        total: 0,
        waiting_for_review: 0,
        waiting_for_update_payment: 0,
        waiting_for_update_info: 0,
        waiting_for_update_tcc: 0,
        approved: 0,
        rejected: 0,
      };
    }

    const { data, error } = await supabase.rpc("get_registration_statistics");

    if (error) {
      console.error("Error fetching registration statistics:", error);
      // Return default values for empty database
      return {
        total: 0,
        waiting_for_review: 0,
        waiting_for_update_payment: 0,
        waiting_for_update_info: 0,
        waiting_for_update_tcc: 0,
        approved: 0,
        rejected: 0,
      };
    }

    return (
      data || {
        total: 0,
        waiting_for_review: 0,
        waiting_for_update_payment: 0,
        waiting_for_update_info: 0,
        waiting_for_update_tcc: 0,
        approved: 0,
        rejected: 0,
      }
    );
  } catch (error) {
    console.error("Unexpected error in getRegistrationStatistics:", error);
    return {
      total: 0,
      waiting_for_review: 0,
      waiting_for_update_payment: 0,
      waiting_for_update_info: 0,
      waiting_for_update_tcc: 0,
      approved: 0,
      rejected: 0,
    };
  }
}
