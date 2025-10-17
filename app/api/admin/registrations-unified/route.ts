import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { audit } from "../../../lib/audit";

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const formFilter = searchParams.get("form_filter") || "all";
    const statusFilter = searchParams.get("status_filter") || "all";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Build the unified query
    let query = `
      WITH unified_registrations AS (
        -- Traditional registrations (mapped to common schema)
        SELECT 
          r.id,
          r.tracking_id,
          r.name,
          r.email,
          r.phone,
          r.status,
          r.dimension_status,
          r.badge_path,
          r.created_at,
          r.updated_at,
          'traditional' as form_type,
          'YEC Day Registration' as form_name,
          r.core_data,
          r.extra_data,
          r.pricing_data
        FROM registrations r
        WHERE r.is_active = true
        
        UNION ALL
        
        -- New form registrations
        SELECT 
          fr.id,
          fr.tracking_id,
          fr.core_data->>'name' as name,
          fr.core_data->>'email' as email,
          fr.core_data->>'phone' as phone,
          fr.status,
          fr.dimension_status,
          fr.badge_path,
          fr.created_at,
          fr.updated_at,
          fr.form_key as form_type,
          ft.name as form_name,
          fr.core_data,
          fr.extra_data,
          fr.pricing_data
        FROM form_registrations fr
        JOIN form_types ft ON fr.form_key = ft.form_key
        WHERE fr.is_active = true AND ft.is_active = true
      )
      SELECT 
        id,
        tracking_id,
        name,
        email,
        phone,
        status,
        dimension_status,
        badge_path,
        created_at,
        updated_at,
        form_type,
        form_name,
        core_data,
        extra_data,
        pricing_data
      FROM unified_registrations
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 0;

    // Apply form filter
    if (formFilter !== "all") {
      if (formFilter === "traditional") {
        query += ` AND form_type = 'traditional'`;
      } else {
        query += ` AND form_type = $${++paramCount}`;
        params.push(formFilter);
      }
    }

    // Apply status filter
    if (statusFilter !== "all") {
      query += ` AND status = $${++paramCount}`;
      params.push(statusFilter);
    }

    // Apply search filter
    if (search) {
      query += ` AND (
        tracking_id ILIKE $${++paramCount} OR 
        name ILIKE $${++paramCount} OR 
        email ILIKE $${++paramCount}
      )`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // Add ordering and pagination
    query += ` ORDER BY created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    // Execute the query
    const { data: registrations, error: queryError } = await supabase.rpc(
      "execute_sql",
      {
        sql: query,
        params: params,
      },
    );

    if (queryError) {
      console.error("Error executing unified query:", queryError);
      return NextResponse.json(
        { error: "Failed to fetch registrations" },
        { status: 500 },
      );
    }

    // Get total count for pagination
    let countQuery = `
      WITH unified_registrations AS (
        SELECT 
          r.id,
          r.tracking_id,
          r.name,
          r.email,
          r.phone,
          r.status,
          r.dimension_status,
          r.badge_path,
          r.created_at,
          r.updated_at,
          'traditional' as form_type,
          'YEC Day Registration' as form_name,
          r.core_data,
          r.extra_data,
          r.pricing_data
        FROM registrations r
        WHERE r.is_active = true
        
        UNION ALL
        
        SELECT 
          fr.id,
          fr.tracking_id,
          fr.core_data->>'name' as name,
          fr.core_data->>'email' as email,
          fr.core_data->>'phone' as phone,
          fr.status,
          fr.dimension_status,
          fr.badge_path,
          fr.created_at,
          fr.updated_at,
          fr.form_key as form_type,
          ft.name as form_name,
          fr.core_data,
          fr.extra_data,
          fr.pricing_data
        FROM form_registrations fr
        JOIN form_types ft ON fr.form_key = ft.form_key
        WHERE fr.is_active = true AND ft.is_active = true
      )
      SELECT COUNT(*) as total
      FROM unified_registrations
      WHERE 1=1
    `;

    const countParams: any[] = [];
    let countParamCount = 0;

    // Apply same filters for count
    if (formFilter !== "all") {
      if (formFilter === "traditional") {
        countQuery += ` AND form_type = 'traditional'`;
      } else {
        countQuery += ` AND form_type = $${++countParamCount}`;
        countParams.push(formFilter);
      }
    }

    if (statusFilter !== "all") {
      countQuery += ` AND status = $${++countParamCount}`;
      countParams.push(statusFilter);
    }

    if (search) {
      countQuery += ` AND (
        tracking_id ILIKE $${++countParamCount} OR 
        name ILIKE $${++countParamCount} OR 
        email ILIKE $${++countParamCount}
      )`;
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern, searchPattern);
    }

    const { data: countResult, error: countError } = await supabase.rpc(
      "execute_sql",
      {
        sql: countQuery,
        params: countParams,
      },
    );

    if (countError) {
      console.error("Error getting count:", countError);
    }

    const total = countResult?.[0]?.total || 0;

    // Get available form types for filter dropdown
    const { data: formTypes, error: formTypesError } = await supabase
      .from("form_types")
      .select("form_key, name")
      .eq("is_active", true)
      .order("name");

    if (formTypesError) {
      console.error("Error fetching form types:", formTypesError);
    }

    // Log access
    await audit.logAccess({
      action: "GET",
      method: "GET",
      resource: "registrations-unified",
      result: "success",
      request_id: crypto.randomUUID(),
      meta: {
        form_filter: formFilter,
        status_filter: statusFilter,
        search,
        page,
        limit,
        total_results: registrations?.length || 0,
      },
    });

    return NextResponse.json({
      success: true,
      registrations: registrations || [],
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      form_types: [
        { form_key: "traditional", name: "YEC Day Registration" },
        ...(formTypes || []),
      ],
    });
  } catch (error) {
    console.error("Error in unified registrations API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
