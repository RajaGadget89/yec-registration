import { getSupabaseServiceClient } from "../../lib/supabase-server";
import { EventFactory } from "../../lib/events/eventFactory";
import { EventService } from "../../lib/events/eventService";

import { sendAdminInvitationEmail } from "../../lib/emailService";

export interface CreateInvitationParams {
  email: string;
  roles: string[];
  createdBy: string;
  correlationId: string;
}

export interface InvitationResult {
  id: string;
  email: string;
  token: string;
  expiresAt: string;
  correlationId: string;
}

export interface ResendInvitationParams {
  invitationId: string;
  resentBy: string;
  correlationId: string;
}

export interface CancelInvitationParams {
  invitationId: string;
  cancelledBy: string;
  correlationId: string;
}

export class InviteService {
  /**
   * Create a new admin invitation
   */
  static async createInvitation(
    params: CreateInvitationParams,
  ): Promise<InvitationResult> {
    const supabase = getSupabaseServiceClient();

    // Check for existing pending invitation
    const { data: existingInvitation, error: checkError } = await supabase
      .from("admin_invitations")
      .select("id, status, expires_at")
      .eq("email", params.email.toLowerCase())
      .eq("status", "pending")
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      throw new Error("Failed to check existing invitations");
    }

    if (
      existingInvitation &&
      new Date((existingInvitation as any).expires_at) > new Date()
    ) {
      throw new Error("Invitation already exists for this email");
    }

    // Generate invitation token
    const { data: tokenData, error: tokenError } = await (supabase as any).rpc(
      "generate_admin_invitation_token",
    );

    if (tokenError || !tokenData) {
      throw new Error("Failed to generate invitation token");
    }

    // Calculate expiration time (48 hours from now)
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    // Create invitation record

    const { data: invitation, error: createError } = await (supabase as any)
      .from("admin_invitations")
      .insert({
        email: params.email.toLowerCase(),
        token: tokenData,
        expires_at: expiresAt,
        created_by: params.createdBy,
        status: "pending",
        roles: params.roles,
        correlation_id: params.correlationId,
      })
      .select()
      .single();

    if (createError) {
      throw new Error("Failed to create invitation");
    }

    // Send invitation email
    // UAT-04S v2 — base URL = NEXT_PUBLIC_APP_URL only
    const base = process.env.NEXT_PUBLIC_APP_URL;
    if (!base) {
      throw new Error("NEXT_PUBLIC_APP_URL is required to build accept links");
    }

    // Always URL‑encode token via URL.searchParams
    const accept = new URL("/admin/accept", base);
    accept.searchParams.set("token", tokenData); // encodes + and /
    const acceptUrl = accept.toString();
    const expiresAtFormatted = new Date(expiresAt).toLocaleString();
    const supportEmail = "info@yecday.com";

    try {
      await sendAdminInvitationEmail({
        to: params.email,
        acceptUrl,
        expiresAt: expiresAtFormatted,
        supportEmail,
      });
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError);
      // Don't fail the request if email fails
    }

    // Emit domain event
    const event = EventFactory.createAdminInvitationCreated(
      (invitation as any).id,
      params.email,
      params.createdBy,
    );
    await EventService.emit(event);

    return {
      id: invitation.id,
      email: invitation.email,
      token: tokenData,
      expiresAt: invitation.expires_at,
      correlationId: params.correlationId,
    };
  }

  /**
   * Resend an admin invitation
   */
  static async resendInvitation(
    params: ResendInvitationParams,
  ): Promise<{ resendCount: number }> {
    const supabase = getSupabaseServiceClient();

    // Check if invitation exists and is pending
    const { data: invitation, error: fetchError } = await supabase
      .from("admin_invitations")
      .select("*")
      .eq("id", params.invitationId)
      .eq("status", "pending")
      .single();

    if (fetchError || !invitation) {
      throw new Error("Invitation not found or not pending");
    }

    // Check if invitation is expired
    if (new Date((invitation as any).expires_at) < new Date()) {
      throw new Error("Invitation has expired");
    }

    // Update invitation with new timestamp and increment resend counter

    const { data: updatedInvitation, error: updateError } = await (
      supabase as any
    )
      .from("admin_invitations")
      .update({
        updated_at: new Date().toISOString(),
        resend_count: ((invitation as any).resend_count || 0) + 1,
      })
      .eq("id", params.invitationId)
      .select()
      .single();

    if (updateError) {
      throw new Error("Failed to update invitation");
    }

    // Send invitation email
    const base = process.env.NEXT_PUBLIC_APP_URL;
    if (!base) {
      throw new Error("NEXT_PUBLIC_APP_URL is required to build accept links");
    }

    const accept = new URL("/admin/accept", base);

    accept.searchParams.set("token", (invitation as any).token);
    const acceptUrl = accept.toString();
    const expiresAtFormatted = new Date(
      (invitation as any).expires_at,
    ).toLocaleString();

    const supportEmail = "info@yecday.com";

    try {
      await sendAdminInvitationEmail({
        to: (invitation as any).email,
        acceptUrl,
        expiresAt: expiresAtFormatted,
        supportEmail,
      });
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError);
      // Don't fail the request if email fails
    }

    // Emit domain event
    const event = EventFactory.createAdminInvitationResent(
      (invitation as any).id,
      (invitation as any).email,
      params.resentBy,
    );
    await EventService.emit(event);

    return {
      resendCount: (updatedInvitation as any).resend_count,
    };
  }

  /**
   * Cancel an admin invitation
   */
  static async cancelInvitation(params: CancelInvitationParams): Promise<void> {
    const supabase = getSupabaseServiceClient();

    // Check if invitation exists and is pending
    const { data: invitation, error: fetchError } = await supabase
      .from("admin_invitations")
      .select("*")
      .eq("id", params.invitationId)
      .eq("status", "pending")
      .single();

    if (fetchError || !invitation) {
      throw new Error("Invitation not found or not pending");
    }

    // Update invitation status to revoked

    const { error: updateError } = await (supabase as any)
      .from("admin_invitations")
      .update({
        status: "revoked",
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.invitationId);

    if (updateError) {
      throw new Error("Failed to cancel invitation");
    }

    // Emit domain event
    const event = EventFactory.createAdminInvitationCancelled(
      (invitation as any).id,
      (invitation as any).email,
      params.cancelledBy,
    );
    await EventService.emit(event);
  }

  /**
   * Check idempotency for invitation creation
   */
  static async checkIdempotency(
    correlationId: string,
    createdBy: string,
  ): Promise<InvitationResult | null> {
    const supabase = getSupabaseServiceClient();

    const { data: existingInvitation, error } = await supabase
      .from("admin_invitations")
      .select("id, email, expires_at, correlation_id")
      .eq("correlation_id", correlationId)
      .eq("created_by", createdBy)
      .single();

    if (!error && existingInvitation) {
      return {
        id: (existingInvitation as any).id,
        email: (existingInvitation as any).email,
        token: "", // Not returned for idempotency
        expiresAt: (existingInvitation as any).expires_at,
        correlationId: (existingInvitation as any).correlation_id,
      };
    }

    return null;
  }
}
