import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../../lib/supabase-server";
import { validateMCPApiKey } from "../../../../../lib/mcp/auth";
import { rateLimit } from "../../../../../lib/mcp/rate-limiter";
import { auditMCPAccess } from "../../../../../lib/mcp/audit";

export async function GET(request: NextRequest) {
  const start = Date.now();
  const url = new URL(request.url);
  const requestId = `mcp_private_seminar_${start}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    // API key validation (admin level only)
    const auth = await validateMCPApiKey(request.headers);
    if (!auth.ok) {
      const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      await auditMCPAccess({
        endpoint: "/api/mcp/private/seminar/search",
        method: "GET",
        apiKeyType: "admin",
        status: 401,
        requestId,
      });
      return res;
    }

    if (auth.type !== "admin") {
      const res = NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
      await auditMCPAccess({
        endpoint: "/api/mcp/private/seminar/search",
        method: "GET",
        apiKeyType: auth.type || "public",
        status: 403,
        requestId,
      });
      return res;
    }

    // Rate limiting
    const rl = rateLimit(`mcp:private:seminar:${auth.type}`);
    if (!rl.allowed) {
      const res = NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
      res.headers.set(
        "X-RateLimit-Limit",
        String(process.env.MCP_RATE_LIMIT_MAX_REQUESTS || 1000),
      );
      res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
      res.headers.set("X-RateLimit-Reset", String(rl.reset));
      await auditMCPAccess({
        endpoint: "/api/mcp/private/seminar/search",
        method: "GET",
        apiKeyType: auth.type,
        status: 429,
        requestId,
      });
      return res;
    }

    const supabase = getSupabaseServiceClient();

    // Parse query parameters
    const rawQ = url.searchParams.get("q") || "";
    const rawParticipantNumber =
      url.searchParams.get("participant_number") || "";
    const rawCheckerReferenceId =
      url.searchParams.get("checker_reference_id") || "";
    let rawProvince = url.searchParams.get("province") || "";
    let rawHotel = url.searchParams.get("hotel") || "";
    const rawEvent = url.searchParams.get("event") || "";
    const rawPaymentStatus = url.searchParams.get("payment_status") || "";
    let rawDateFrom = url.searchParams.get("date_from") || "";
    const rawDateTo = url.searchParams.get("date_to") || "";
    const rawMobilePhone = url.searchParams.get("mobile_phone") || "";
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "20"),
      2000,
    );
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // --- Parameter Normalization (handles common n8n mis-mapping) ---
    const THAI_MONTHS: Record<string, number> = {
      มกราคม: 1,
      "ม.ค.": 1,
      กุมภาพันธ์: 2,
      "ก.พ.": 2,
      มีนาคม: 3,
      "มี.ค.": 3,
      เมษายน: 4,
      "เม.ย.": 4,
      พฤษภาคม: 5,
      "พ.ค.": 5,
      มิถุนายน: 6,
      "มิ.ย.": 6,
      กรกฎาคม: 7,
      "ก.ค.": 7,
      สิงหาคม: 8,
      "ส.ค.": 8,
      กันยายน: 9,
      "ก.ย.": 9,
      ตุลาคม: 10,
      "ต.ค.": 10,
      พฤศจิกายน: 11,
      "พ.ย.": 11,
      ธันวาคม: 12,
      "ธ.ค.": 12,
    };

    const isThaiDate = (text: string): boolean => {
      if (!text) return false;
      const t = text.trim();
      // DD/MM/YYYY or YYYY-MM-DD
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(t)) return true;
      if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return true;
      // e.g., 22 พฤศจิกายน 2568 or 22 พ.ย. 68
      const monthNames = Object.keys(THAI_MONTHS).map((m) =>
        m.replace(".", "\\."),
      );
      const re = new RegExp(
        `(\\d{1,2})\\s+(${monthNames.join("|")})\\s+(\\d{2,4})`,
      );
      return re.test(t);
    };

    const parseThaiDateToISO = (text: string): string | "" => {
      if (!text) return "";
      const t = text.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(t)) {
        const [d, m, y] = t.split("/");
        return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      }
      const monthNames = Object.keys(THAI_MONTHS).map((m) =>
        m.replace(".", "\\."),
      );
      const re = new RegExp(
        `(\\d{1,2})\\s+(${monthNames.join("|")})\\s+(\\d{2,4})`,
      );
      const m = t.match(re);
      if (m) {
        const day = parseInt(m[1], 10);
        const month = THAI_MONTHS[m[2].replace(/\.$/, "")] || THAI_MONTHS[m[2]];
        let year = parseInt(m[3], 10);
        year = year > 2400 ? year - 543 : year < 100 ? 2000 + year : year;
        return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
      return "";
    };

    // If hotel is empty but q provided, treat q as hotel hint
    if (!rawHotel && rawQ) rawHotel = rawQ;
    // If province accidentally contains a Thai date, remap to date_from
    if (!rawDateFrom && isThaiDate(rawProvince)) {
      rawDateFrom = parseThaiDateToISO(rawProvince);
      rawProvince = "";
    }
    // Parse any incoming dates to ISO
    const dateFrom = parseThaiDateToISO(rawDateFrom);
    const dateTo = parseThaiDateToISO(rawDateTo);

    // Final normalized params
    const q = rawQ;
    const participantNumber = rawParticipantNumber;
    const checkerReferenceId = rawCheckerReferenceId;
    const province = rawProvince;
    const hotel = rawHotel;
    const event = rawEvent;
    const paymentStatus = rawPaymentStatus;
    const mobilePhone = rawMobilePhone;

    // Build the base query with all necessary JOINs
    // Use LEFT joins (not inner) to include participants even if some related data is missing
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
        custom_fields,
        created_at,
        updated_at,
        seminar_accommodations(
          id,
          check_in_date,
          check_out_date,
          room_type,
          number_of_rooms,
          notes,
          seminar_hotels(
            id,
            name,
            location
          )
        ),
        seminar_transportation(
          id,
          direction,
          transport_type,
          details
        ),
        seminar_event_participants(
          id,
          registration_status,
          attendance_status,
          checked_in_at,
          seminar_events(
            id,
            name,
            event_date,
            event_time,
            location
          )
        ),
        seminar_finances(
          id,
          activity_fee,
          accommodation_fee,
          dinner_fee,
          total_fee,
          payment_status,
          payment_details
        )
      `);

    // Apply filters
    if (participantNumber) {
      query = query.eq("participant_number", participantNumber);
    }

    if (checkerReferenceId) {
      query = query.eq("checker_reference_id", checkerReferenceId);
    }

    if (province) {
      query = query.ilike("province", `%${province}%`);
    }

    if (paymentStatus) {
      query = query.eq("seminar_finances.payment_status", paymentStatus);
    }

    if (hotel) {
      query = query.ilike(
        "seminar_accommodations.seminar_hotels.name",
        `%${hotel}%`,
      );
    }

    if (event) {
      query = query.ilike(
        "seminar_event_participants.seminar_events.name",
        `%${event}%`,
      );
    }

    if (dateFrom) {
      query = query.gte("seminar_accommodations.check_in_date", dateFrom);
    }

    if (dateTo) {
      query = query.lte("seminar_accommodations.check_out_date", dateTo);
    }

    // Mobile phone lookup (exact or partial match)
    if (mobilePhone) {
      // Remove common formatting characters
      const cleanPhone = mobilePhone.replace(/[\s\-\(\)]/g, "");
      query = query.ilike("mobile_phone", `%${cleanPhone}%`);
    }

    // Full-text search (fixed syntax)
    if (q) {
      // Use proper Supabase or() syntax
      query = query.or(
        `full_name.ilike.%${q}%,` +
          `position.ilike.%${q}%,` +
          `participant_position.ilike.%${q}%,` +
          `province.ilike.%${q}%,` +
          `email.ilike.%${q}%,` +
          `mobile_phone.ilike.%${q}%`,
      );
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: participants, error } = await query;

    if (error) {
      console.error("Seminar search query error:", error);
      const res = NextResponse.json(
        { error: "Database query failed" },
        { status: 500 },
      );
      await auditMCPAccess({
        endpoint: "/api/mcp/private/seminar/search",
        method: "GET",
        apiKeyType: auth.type,
        status: 500,
        requestId,
      });
      return res;
    }

    // Transform data for RAG consumption
    const results =
      participants?.map((participant) => {
        // Extract accommodation info
        const accommodation = participant.seminar_accommodations?.[0];
        const hotel = accommodation?.seminar_hotels?.[0];

        // Extract events with attendance tracking
        const events = participant.seminar_event_participants
          ?.map((ep) => {
            const ev = ep.seminar_events?.[0];
            return {
              name: ev?.name,
              date: ev?.event_date,
              time: ev?.event_time,
              location: ev?.location,
              registration_status: ep.registration_status,
              attendance_status: ep.attendance_status || "registered",
              checked_in_at: ep.checked_in_at,
            };
          })
          .filter((e) => e.name);

        // Extract transportation
        const transportation = participant.seminar_transportation?.reduce(
          (acc, t) => {
            acc[t.direction] = {
              type: t.transport_type,
              details: t.details,
            };
            return acc;
          },
          {} as Record<string, any>,
        );

        // Extract finances
        const finances = participant.seminar_finances?.[0];

        return {
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
          hotel: hotel
            ? {
                name: hotel?.name,
                location: hotel?.location,
                check_in: accommodation?.check_in_date,
                check_out: accommodation?.check_out_date,
                room_type: accommodation?.room_type,
                number_of_rooms: accommodation?.number_of_rooms,
              }
            : null,
          events: events || [],
          transportation: transportation || {},
          payment_status: finances?.payment_status,
          total_fee: finances?.total_fee,
          activity_fee: finances?.activity_fee,
          accommodation_fee: finances?.accommodation_fee,
          dinner_fee: finances?.dinner_fee,
          custom_fields: participant.custom_fields,
          created_at: participant.created_at,
          updated_at: participant.updated_at,
        };
      }) || [];

    // Get total rows in database (unfiltered) for reference
    const { count: totalInDb } = await supabase
      .from("seminar_participants")
      .select("*", { count: "exact", head: true });

    const response = {
      results,
      count: results.length, // explicit filtered count
      total_in_database: totalInDb || 0,
      limit,
      offset,
      hasMore: results.length === limit,
      query: {
        q: q || null,
        participant_number: participantNumber || null,
        checker_reference_id: checkerReferenceId || null,
        province: province || null,
        hotel: hotel || null,
        event: event || null,
        payment_status: paymentStatus || null,
        date_from: dateFrom || null,
        date_to: dateTo || null,
      },
    } as const;

    // Log successful access
    await auditMCPAccess({
      endpoint: "/api/mcp/private/seminar/search",
      method: "GET",
      apiKeyType: auth.type,
      status: 200,
      requestId,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("MCP private seminar search error:", error);

    const res = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );

    await auditMCPAccess({
      endpoint: "/api/mcp/private/seminar/search",
      method: "GET",
      apiKeyType: "admin",
      status: 500,
      requestId,
    });

    return res;
  }
}
