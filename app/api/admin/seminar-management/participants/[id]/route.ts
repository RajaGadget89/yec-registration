import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "../../../../../lib/auth-utils.server";
import { getSupabaseServiceClient } from "../../../../../lib/supabase-server";
import { audit } from "../../../../../lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const supabase = getSupabaseServiceClient();

    // Get base participant
    const { data: participant, error: participantError } = await supabase
      .from("seminar_participants")
      .select(
        `
        id, checker_reference_id, participant_number, code, prefix, full_name,
        position, participant_position, province, region, gender, email,
        mobile_phone, attendance_status, custom_fields, created_at, updated_at
      `,
      )
      .eq("id", id)
      .single();

    if (participantError || !participant) {
      console.error("Participant detail query error:", participantError);
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 },
      );
    }

    // Accommodation (1:1)
    const { data: accommodation } = await supabase
      .from("seminar_accommodations")
      .select(
        `id, hotel_id, check_in_date, check_out_date, room_type, number_of_rooms, notes,
               seminar_hotels(id, name, location, description)`,
      )
      .eq("participant_id", id)
      .maybeSingle();

    // Daily stays (by accommodation)
    let accommodationDaily = [] as any[];
    if (accommodation?.id) {
      const { data: days } = await supabase
        .from("seminar_accommodation_daily")
        .select("id, stay_date, status")
        .eq("accommodation_id", accommodation.id);
      accommodationDaily = days || [];
    }

    // Events
    const { data: events } = await supabase
      .from("seminar_event_participants")
      .select(
        "id, registration_status, seminar_events(id, name, event_date, event_time, description, location)",
      )
      .eq("participant_id", id);

    // Transportation
    const { data: transportation } = await supabase
      .from("seminar_transportation")
      .select("id, direction, transport_type, details")
      .eq("participant_id", id);

    // Finance
    const { data: finance } = await supabase
      .from("seminar_finances")
      .select(
        "id, activity_fee, accommodation_fee, dinner_fee, total_fee, payment_status, payment_details, payment_document",
      )
      .eq("participant_id", id)
      .maybeSingle();

    // Log access
    await audit.logAccess({
      action: "GET_PARTICIPANT_DETAIL",
      method: "GET",
      resource: "seminar_participants",
      result: "success",
      request_id: `seminar_participant_detail_${Date.now()}`,
      meta: {
        actor: user.email,
        participantId: id,
        participantName: participant.full_name,
        checkerReferenceId: participant.checker_reference_id,
        path: `/api/admin/seminar-management/participants/${id}`,
      },
    });

    // Shape response to match UI expectations
    const shapedAccommodation = accommodation
      ? {
          id: accommodation.id,
          hotel: Array.isArray(accommodation.seminar_hotels)
            ? accommodation.seminar_hotels[0]
              ? {
                  id: accommodation.seminar_hotels[0].id,
                  name: accommodation.seminar_hotels[0].name,
                  location: accommodation.seminar_hotels[0].location,
                  description: accommodation.seminar_hotels[0].description,
                }
              : null
            : (accommodation.seminar_hotels as any),
          check_in_date: accommodation.check_in_date,
          check_out_date: accommodation.check_out_date,
          room_type: accommodation.room_type,
          number_of_rooms: accommodation.number_of_rooms,
          notes: accommodation.notes,
          daily_stays: accommodationDaily.map((d) => ({
            id: d.id,
            stay_date: d.stay_date,
            is_staying: d.status === "1",
          })),
        }
      : null;

    const shapedEvents = (events || []).map((e) => {
      const ev = Array.isArray(e.seminar_events)
        ? e.seminar_events[0]
        : (e.seminar_events as any);
      return {
        id: e.id,
        registration_status: e.registration_status,
        event: ev
          ? {
              id: ev.id,
              name: ev.name,
              event_date: ev.event_date,
              event_time: ev.event_time,
              description: ev.description,
              location: ev.location,
            }
          : null,
      };
    });

    return NextResponse.json({
      participant,
      accommodation: shapedAccommodation,
      events: shapedEvents,
      transportation: transportation || [],
      finance: finance || null,
    });
  } catch (error) {
    console.error("Participant detail error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const supabase = getSupabaseServiceClient();
    const body = await request.json();

    // Validate required fields
    if (!body.full_name) {
      return NextResponse.json(
        { error: "Full name is required" },
        { status: 400 },
      );
    }

    // Update participant data
    const participantData = {
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
      updated_at: new Date().toISOString(),
    };

    const { data: participant, error: participantError } = await supabase
      .from("seminar_participants")
      .update(participantData)
      .eq("id", id)
      .select("id, checker_reference_id, full_name")
      .single();

    if (participantError) {
      console.error("Participant update error:", participantError);
      return NextResponse.json(
        { error: "Failed to update participant" },
        { status: 500 },
      );
    }

    // Handle accommodation update
    if (body.accommodation) {
      const accommodationData = {
        hotel_id: body.accommodation.hotel_id || null,
        check_in_date: body.accommodation.check_in_date || null,
        check_out_date: body.accommodation.check_out_date || null,
        room_type: body.accommodation.room_type || null,
        number_of_rooms: body.accommodation.number_of_rooms || null,
        notes: body.accommodation.notes || null,
      };

      await supabase.from("seminar_accommodations").upsert(
        {
          participant_id: parseInt(id),
          ...accommodationData,
        },
        {
          onConflict: "participant_id",
        },
      );
    }

    // Handle events update
    if (body.events !== undefined) {
      // Delete existing event participations
      await supabase
        .from("seminar_event_participants")
        .delete()
        .eq("participant_id", id);

      // Insert new event participations
      if (Array.isArray(body.events) && body.events.length > 0) {
        const eventParticipants = body.events.map((eventId: number) => ({
          participant_id: parseInt(id),
          event_id: eventId,
          registration_status: "ลงทะเบียน",
        }));

        await supabase
          .from("seminar_event_participants")
          .insert(eventParticipants);
      }
    }

    // Handle transportation update
    if (body.transportation) {
      // Delete existing transportation
      await supabase
        .from("seminar_transportation")
        .delete()
        .eq("participant_id", id);

      // Insert new transportation
      const transportationData = [];

      if (body.transportation.outbound) {
        transportationData.push({
          participant_id: parseInt(id),
          direction: "outbound",
          transport_type: body.transportation.outbound.type || null,
          details: body.transportation.outbound.details || null,
        });
      }

      if (body.transportation.return) {
        transportationData.push({
          participant_id: parseInt(id),
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

    // Handle finances update
    if (body.finances) {
      const financeData = {
        activity_fee: body.finances.activity_fee || null,
        accommodation_fee: body.finances.accommodation_fee || null,
        dinner_fee: body.finances.dinner_fee || null,
        total_fee: body.finances.total_fee || null,
        payment_status: body.finances.payment_status || null,
        payment_details: body.finances.payment_details || null,
        payment_document: body.finances.payment_document || null,
      };

      await supabase.from("seminar_finances").upsert(
        {
          participant_id: parseInt(id),
          ...financeData,
        },
        {
          onConflict: "participant_id",
        },
      );
    }

    // Log update
    await audit.logEvent({
      action: "seminar_participant_updated",
      resource: "seminar_participants",
      actor_role: "admin",
      result: "success",
      correlation_id: `seminar_participant_update_${Date.now()}`,
      meta: {
        participantName: body.full_name,
        checkerReferenceId: participant.checker_reference_id,
        userId: user.id,
        userEmail: user.email,
        updatedFields: Object.keys(participantData),
      },
    });

    return NextResponse.json({
      success: true,
      participant: {
        id: participant.id,
        checker_reference_id: participant.checker_reference_id,
        ...participantData,
      },
    });
  } catch (error) {
    console.error("Participant update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const supabase = getSupabaseServiceClient();

    // Get participant info before deletion for audit
    const { data: participant, error: fetchError } = await supabase
      .from("seminar_participants")
      .select("id, checker_reference_id, full_name")
      .eq("id", id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 },
      );
    }

    // Delete participant (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from("seminar_participants")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Participant delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete participant" },
        { status: 500 },
      );
    }

    // Log deletion
    await audit.logEvent({
      action: "seminar_participant_deleted",
      resource: "seminar_participants",
      actor_role: "admin",
      result: "success",
      correlation_id: `seminar_participant_delete_${Date.now()}`,
      meta: {
        participantName: participant.full_name,
        checkerReferenceId: participant.checker_reference_id,
        userId: user.id,
        userEmail: user.email,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Participant deleted successfully",
    });
  } catch (error) {
    console.error("Participant delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
