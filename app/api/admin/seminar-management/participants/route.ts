import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "../../../../lib/auth-utils.server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { audit } from "../../../../lib/audit";

// Helper function to generate checker reference ID
function generateCheckerReferenceId(): string {
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `TCC-SEM68-${random}`;
}

export async function GET(request: NextRequest) {
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

    const supabase = getSupabaseServiceClient();
    const url = new URL(request.url);

    // Parse query parameters (support both legacy singular keys and new plural keys)
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;
    const search = url.searchParams.get("search") || "";

    // Province filters
    const provinceCsv = url.searchParams.get("provinces");
    const provinceSingular = url.searchParams.get("province") || "";
    const provinces = provinceCsv
      ? provinceCsv
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      : provinceSingular
        ? [provinceSingular]
        : [];

    // Hotel filters
    const hotelCsv = url.searchParams.get("hotels");
    const hotelSingular = url.searchParams.get("hotel") || "";
    const hotels = hotelCsv
      ? hotelCsv
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      : hotelSingular
        ? [hotelSingular]
        : [];

    // Event filters
    const eventCsv = url.searchParams.get("events");
    const eventSingular = url.searchParams.get("event") || "";
    const events = eventCsv
      ? eventCsv
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      : eventSingular
        ? [eventSingular]
        : [];

    // Payment status filters (support camelCase and snake_case)
    const paymentCsv =
      url.searchParams.get("paymentStatus") ||
      url.searchParams.get("payment_status");
    const normalizePayment = (v: string) => {
      const t = v.trim().toLowerCase();
      if (t === "paid" || t === "ชำระแล้ว") return "ชำระแล้ว";
      if (t === "unpaid" || t === "ยังไม่ได้ชำระเงิน" || t === "ยังไม่ชำระเงิน")
        return "ยังไม่ได้ชำระเงิน";
      if (t === "free" || t === "ฟรี") return "ฟรี";
      return v; // passthrough any exact database value
    };
    const paymentStatus = paymentCsv
      ? paymentCsv.split(",").map(normalizePayment).filter(Boolean)
      : [];

    // Date range filters
    const dateFrom = url.searchParams.get("dateFrom") || "";
    const dateTo = url.searchParams.get("dateTo") || "";

    const sortColumnRaw = url.searchParams.get("sortColumn") || "created_at";
    const sortDirectionRaw = url.searchParams.get("sortDirection") || "desc";
    const allowedSortColumns = new Set([
      "created_at",
      "full_name",
      "updated_at",
    ]);
    const sortColumn = allowedSortColumns.has(sortColumnRaw)
      ? sortColumnRaw
      : "created_at";
    const sortDirection = sortDirectionRaw === "asc" ? "asc" : "desc";

    // Helper to apply all filters to a query
    const applyAllFilters = (q: any) => {
      // Text search OR
      if (search) {
        const orClause =
          `full_name.ilike.%${search}%,` +
          `position.ilike.%${search}%,` +
          `participant_position.ilike.%${search}%,` +
          `province.ilike.%${search}%,` +
          `email.ilike.%${search}%,` +
          `mobile_phone.ilike.%${search}%`;
        q = q.or(orClause);
      }

      // Provinces
      if (provinces.length === 1) {
        q = q.ilike("province", `%${provinces[0]}%`);
      } else if (provinces.length > 1) {
        q = q.in("province", provinces);
      }

      // Hotels
      if (hotels.length === 1) {
        q = q.ilike(
          "seminar_accommodations.seminar_hotels.name",
          `%${hotels[0]}%`,
        );
      } else if (hotels.length > 1) {
        q = q.in("seminar_accommodations.seminar_hotels.name", hotels);
      }

      // Events
      if (events.length === 1) {
        q = q.ilike(
          "seminar_event_participants.seminar_events.name",
          `%${events[0]}%`,
        );
      } else if (events.length > 1) {
        q = q.in("seminar_event_participants.seminar_events.name", events);
      }

      // Payment status (single or multiple)
      if (paymentStatus.length > 0) {
        if (paymentStatus.length === 1) {
          q = q.eq("seminar_finances.payment_status", paymentStatus[0]);
        } else {
          q = q.in("seminar_finances.payment_status", paymentStatus);
        }
      }

      // Date range
      if (dateFrom) {
        q = q.gte("seminar_accommodations.check_in_date", dateFrom);
      }
      if (dateTo) {
        q = q.lte("seminar_accommodations.check_out_date", dateTo);
      }

      return q;
    };

    // Build select strings; use inner joins when filtering by related tables so counts respect filters
    const needFinanceInner = paymentStatus.length > 0;
    const needAccommodationInner =
      Boolean(dateFrom || dateTo) || hotels.length > 0;
    const needEventInner = events.length > 0;

    const accommodationsSelect = needAccommodationInner
      ? `seminar_accommodations!inner(
          id,
          check_in_date,
          check_out_date,
          room_type,
          seminar_hotels(
            id,
            name
          )
        )`
      : `seminar_accommodations(
          id,
          check_in_date,
          check_out_date,
          room_type,
          seminar_hotels(
            id,
            name
          )
        )`;

    const financesSelect = needFinanceInner
      ? `seminar_finances!inner(
          id,
          payment_status,
          total_fee
        )`
      : `seminar_finances(
          id,
          payment_status,
          total_fee
        )`;

    const eventsSelect = needEventInner
      ? `seminar_event_participants!inner(
          seminar_events (
            name
          )
        )`
      : `seminar_event_participants(
          seminar_events (
            name
          )
        )`;

    let query = supabase.from("seminar_participants").select(`
        id,
        checker_reference_id,
        participant_number,
        prefix,
        full_name,
        position,
        participant_position,
        province,
        region,
        gender,
        email,
        mobile_phone,
        attendance_status,
        created_at,
        updated_at,
        ${accommodationsSelect},
        ${financesSelect},
        ${eventsSelect}
      `);

    // Apply filters to main query
    query = applyAllFilters(query);

    // Apply sorting
    query = query.order(sortColumn, { ascending: sortDirection === "asc" });

    // Get total count of FILTERED results
    // Primary count query (fast path) — include related tables so joined filters apply
    const countResult = await applyAllFilters(
      supabase
        .from("seminar_participants")
        .select(
          `id, ${accommodationsSelect}, ${financesSelect}, ${eventsSelect}`,
          { count: "exact", head: true },
        ),
    );
    let count = countResult.count;
    const countError = countResult.error;

    // Fallback count if head:true returns null with complex filters/joins
    if ((!count && count !== 0) || countError) {
      const fallback = await applyAllFilters(
        supabase
          .from("seminar_participants")
          .select(
            `id, ${accommodationsSelect}, ${financesSelect}, ${eventsSelect}`,
            { count: "exact", head: false },
          )
          .range(0, 0),
      );
      if (fallback.error) {
        console.error("Count fallback error:", fallback.error);
      } else {
        count = fallback.count ?? 0;
      }
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: participants, error } = await query;

    if (error) {
      console.error("Participants query error:", error);
      return NextResponse.json(
        {
          error: "Database query failed",
          details: error.message || String(error),
        },
        { status: 500 },
      );
    }

    // Transform data for frontend
    const transformedParticipants =
      participants?.map((participant) => ({
        id: participant.id,
        checker_reference_id: participant.checker_reference_id,
        participant_number: participant.participant_number,
        prefix: participant.prefix,
        full_name: participant.full_name,
        position: participant.position,
        participant_position: participant.participant_position,
        province: participant.province,
        region: participant.region,
        gender: participant.gender,
        email: participant.email,
        mobile_phone: participant.mobile_phone,
        attendance_status: participant.attendance_status,
        hotel:
          participant.seminar_accommodations?.[0]?.seminar_hotels?.[0]?.name ||
          null,
        check_in_date:
          participant.seminar_accommodations?.[0]?.check_in_date || null,
        check_out_date:
          participant.seminar_accommodations?.[0]?.check_out_date || null,
        payment_status:
          participant.seminar_finances?.[0]?.payment_status || null,
        total_fee: participant.seminar_finances?.[0]?.total_fee || null,
        created_at: participant.created_at,
        updated_at: participant.updated_at,
      })) || [];

    const totalPages = Math.ceil((count || 0) / limit);

    // Log access
    await audit.logAccess({
      action: "GET",
      method: "GET",
      resource: "seminar_participants",
      result: "success",
      request_id: `seminar_participants_list_${Date.now()}`,
      meta: {
        page,
        limit,
        search,
        provinces,
        hotels,
        events,
        paymentStatus,
        sortColumn,
        sortDirection,
        totalCount: count,
        resultCount: transformedParticipants.length,
      },
    });

    return NextResponse.json({
      participants: transformedParticipants,
      pagination: {
        page,
        limit,
        totalCount: count || 0,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      filters: {
        search,
        provinces,
        hotels,
        events,
        paymentStatus,
        dateFrom,
        dateTo,
      },
    });
  } catch (error) {
    console.error("Participants list error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error)?.message },
      { status: 500 },
    );
  }
}

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

    const supabase = getSupabaseServiceClient();
    const body = await request.json();

    // Validate required fields
    if (!body.full_name) {
      return NextResponse.json(
        { error: "Full name is required" },
        { status: 400 },
      );
    }

    // Generate checker reference ID
    const checkerReferenceId = generateCheckerReferenceId();

    // Prepare participant data
    const participantData = {
      checker_reference_id: checkerReferenceId,
      participant_number: body.participant_number || null,
      code: body.code || null,
      prefix: body.prefix || null,
      full_name: body.full_name,
      position: body.position || null,
      participant_position: body.participant_position || null,
      province: body.province || null,
      region: body.region || null,
      gender: body.gender || null,
      email: body.email || null,
      mobile_phone: body.mobile_phone || null,
      attendance_status: body.attendance_status || null,
      custom_fields: body.custom_fields || null,
    };

    // Insert participant
    const { data: participant, error: participantError } = await supabase
      .from("seminar_participants")
      .insert(participantData)
      .select("id")
      .single();

    if (participantError) {
      console.error("Participant insert error:", participantError);
      return NextResponse.json(
        { error: "Failed to create participant" },
        { status: 500 },
      );
    }

    // Handle accommodation if provided
    if (body.accommodation) {
      const accommodationData = {
        participant_id: participant.id,
        hotel_id: body.accommodation.hotel_id || null,
        check_in_date: body.accommodation.check_in_date || null,
        check_out_date: body.accommodation.check_out_date || null,
        room_type: body.accommodation.room_type || null,
        number_of_rooms: body.accommodation.number_of_rooms || null,
        notes: body.accommodation.notes || null,
      };

      await supabase.from("seminar_accommodations").insert(accommodationData);
    }

    // Handle events if provided
    if (body.events && Array.isArray(body.events)) {
      const eventParticipants = body.events.map((eventId: number) => ({
        participant_id: participant.id,
        event_id: eventId,
        registration_status: "ลงทะเบียน",
      }));

      await supabase
        .from("seminar_event_participants")
        .insert(eventParticipants);
    }

    // Handle transportation if provided
    if (body.transportation) {
      const transportationData = [];

      if (body.transportation.outbound) {
        transportationData.push({
          participant_id: participant.id,
          direction: "outbound",
          transport_type: body.transportation.outbound.type || null,
          details: body.transportation.outbound.details || null,
        });
      }

      if (body.transportation.return) {
        transportationData.push({
          participant_id: participant.id,
          direction: "return",
          transport_type: body.transportation.return.type || null,
          details: body.transportation.return.details || null,
        });
      }

      if (transportationData.length > 0) {
        await supabase
          .from("seminar_transportation")
          .insert(transportationData);
      }
    }

    // Handle finances if provided
    if (body.finances) {
      const financeData = {
        participant_id: participant.id,
        activity_fee: body.finances.activity_fee || null,
        accommodation_fee: body.finances.accommodation_fee || null,
        dinner_fee: body.finances.dinner_fee || null,
        total_fee: body.finances.total_fee || null,
        payment_status: body.finances.payment_status || null,
        payment_details: body.finances.payment_details || null,
        payment_document: body.finances.payment_document || null,
      };

      await supabase.from("seminar_finances").insert(financeData);
    }

    // Log creation
    await audit.logEvent({
      action: "seminar_participant_created",
      resource: "seminar_participants",
      resource_id: String(participant.id),
      actor_id: user.id,
      actor_role: "admin",
      result: "success",
      correlation_id: `seminar_participant_create_${Date.now()}`,
      meta: {
        checkerReferenceId,
        participantName: body.full_name,
        userEmail: user.email,
      },
    });

    return NextResponse.json(
      {
        success: true,
        participant: {
          id: participant.id,
          ...participantData,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Participant creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
