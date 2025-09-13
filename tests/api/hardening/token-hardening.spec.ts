/**
 * Token Hardening Tests
 * Tests for single-use token consumption, TTL validation, and audit logging
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { getSupabaseServiceClient } from "../../../app/lib/supabase-server";
import { 
  getInviteTokenTTLHours, 
  getInviteTokenTTLMs, 
  isTokenExpired 
} from "../../../app/lib/config/token-config";

describe("Token Hardening", () => {
  let supabase: any;
  let testInvitationId: string;
  let testToken: string;

  beforeEach(async () => {
    supabase = getSupabaseServiceClient();
    
    // Create a test invitation
    const { data: tokenData } = await supabase.rpc("generate_admin_invitation_token");
    testToken = tokenData;
    
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data: invitation } = await supabase
      .from("admin_invitations")
      .insert({
        email: "test-hardening@example.com",
        token: testToken,
        expires_at: expiresAt,
        created_by: "test-admin@example.com",
        status: "pending",
        roles: ["admin"],
        correlation_id: "test-hardening-" + Date.now(),
      })
      .select()
      .single();
    
    testInvitationId = invitation.id;
  });

  afterEach(async () => {
    // Clean up test data
    if (testInvitationId) {
      await supabase
        .from("admin_invitations")
        .delete()
        .eq("id", testInvitationId);
    }
  });

  describe("TTL Configuration", () => {
    it("should return default TTL of 24 hours", () => {
      const ttlHours = getInviteTokenTTLHours();
      expect(ttlHours).toBe(24);
    });

    it("should return TTL in milliseconds", () => {
      const ttlMs = getInviteTokenTTLMs();
      expect(ttlMs).toBe(24 * 60 * 60 * 1000);
    });

    it("should respect environment variable for TTL", () => {
      const originalEnv = process.env.INVITE_TOKEN_TTL_HOURS;
      process.env.INVITE_TOKEN_TTL_HOURS = "12";
      
      const ttlHours = getInviteTokenTTLHours();
      expect(ttlHours).toBe(12);
      
      // Restore original value
      if (originalEnv) {
        process.env.INVITE_TOKEN_TTL_HOURS = originalEnv;
      } else {
        delete process.env.INVITE_TOKEN_TTL_HOURS;
      }
    });
  });

  describe("Token Expiry Validation", () => {
    it("should detect expired tokens", () => {
      const oldCreatedAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25 hours ago
      const isExpired = isTokenExpired(oldCreatedAt);
      expect(isExpired).toBe(true);
    });

    it("should allow fresh tokens", () => {
      const freshCreatedAt = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(); // 1 hour ago
      const isExpired = isTokenExpired(freshCreatedAt);
      expect(isExpired).toBe(false);
    });

    it("should use custom TTL when provided", () => {
      const createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
      const customTTL = 1 * 60 * 60 * 1000; // 1 hour
      const isExpired = isTokenExpired(createdAt, customTTL);
      expect(isExpired).toBe(true);
    });
  });

  describe("Single-Use Token Consumption", () => {
    it("should reject already consumed tokens", async () => {
      // First, mark the invitation as accepted
      await supabase
        .from("admin_invitations")
        .update({ status: "accepted" })
        .eq("id", testInvitationId);

      // Try to accept the same token again
      const response = await fetch(
        `http://localhost:3000/api/admin/management/invitations/token/${encodeURIComponent(testToken)}/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": "test-consumed-" + Date.now(),
          },
          body: JSON.stringify({ name: "Test User" }),
        }
      );

      expect(response.status).toBe(410);
      const data = await response.json();
      expect(data.code).toBe("TOKEN_CONSUMED");
    });
  });

  describe("Token TTL Rejection", () => {
    it("should reject tokens that exceed TTL", async () => {
      // Update the invitation to have an old created_at time
      const oldCreatedAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      await supabase
        .from("admin_invitations")
        .update({ created_at: oldCreatedAt })
        .eq("id", testInvitationId);

      // Try to accept the expired token
      const response = await fetch(
        `http://localhost:3000/api/admin/management/invitations/token/${encodeURIComponent(testToken)}/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": "test-ttl-" + Date.now(),
          },
          body: JSON.stringify({ name: "Test User" }),
        }
      );

      expect(response.status).toBe(410);
      const data = await response.json();
      expect(data.code).toBe("TOKEN_TTL_EXPIRED");
    });
  });
});

