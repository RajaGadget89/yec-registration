import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../../app/api/admin/email-outbox/route";

// Mock the admin guard
vi.mock("../../app/lib/admin-guard-server", () => ({
  validateAdminAccess: vi.fn(),
}));

// Mock the core use case
vi.mock("../../app/lib/emails/queries/GetEmailOutboxItems", () => ({
  GetEmailOutboxItems: vi.fn().mockImplementation(() => ({
    execute: vi.fn(),
  })),
}));

// Mock the audit client
vi.mock("../../app/lib/audit/auditClient", () => ({
  logAccess: vi.fn(),
}));

describe("GET /api/admin/email-outbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 for unauthorized access", async () => {
    const { validateAdminAccess } = await import("../../app/lib/admin-guard-server");
    vi.mocked(validateAdminAccess).mockReturnValue({
      valid: false,
      adminEmail: null,
    });

    const request = new NextRequest("http://localhost:3000/api/admin/email-outbox");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({
      ok: false,
      error: "unauthorized",
    });
  });

  it("should return 400 for invalid status parameter", async () => {
    const { validateAdminAccess } = await import("../../app/lib/admin-guard-server");
    vi.mocked(validateAdminAccess).mockReturnValue({
      valid: true,
      adminEmail: "admin@example.com",
    });

    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-outbox?status=invalid"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      ok: false,
      error: "invalid_status",
      message: "Status must be pending, sent, or failed",
    });
  });

  it("should return 400 for invalid limit parameter", async () => {
    const { validateAdminAccess } = await import("../../app/lib/admin-guard-server");
    vi.mocked(validateAdminAccess).mockReturnValue({
      valid: true,
      adminEmail: "admin@example.com",
    });

    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-outbox?limit=0"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      ok: false,
      error: "invalid_limit",
      message: "Limit must be between 1 and 100",
    });
  });

  it("should return 400 for invalid offset parameter", async () => {
    const { validateAdminAccess } = await import("../../app/lib/admin-guard-server");
    vi.mocked(validateAdminAccess).mockReturnValue({
      valid: true,
      adminEmail: "admin@example.com",
    });

    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-outbox?offset=-1"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      ok: false,
      error: "invalid_offset",
      message: "Offset must be non-negative",
    });
  });

  it("should return email outbox items successfully", async () => {
    const { validateAdminAccess } = await import("../../app/lib/admin-guard-server");
    const { GetEmailOutboxItems } = await import("../../app/lib/emails/queries/GetEmailOutboxItems");
    const { logAccess } = await import("../../app/lib/audit/auditClient");

    vi.mocked(validateAdminAccess).mockReturnValue({
      valid: true,
      adminEmail: "admin@example.com",
    });

    const mockItems = [
      {
        id: "1",
        to: "user@example.com",
        subject: "Test Email",
        status: "failed" as const,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:01:00Z",
        error_message: "Connection timeout",
      },
    ];

    const mockExecute = vi.fn().mockResolvedValue({
      items: mockItems,
      total: 1,
    });

    vi.mocked(GetEmailOutboxItems).mockImplementation(() => ({
      execute: mockExecute,
    }));

    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-outbox?status=failed&limit=50&offset=0"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      ok: true,
      items: mockItems,
      total: 1,
      pagination: {
        limit: 50,
        offset: 0,
        has_more: false,
      },
    });

    expect(mockExecute).toHaveBeenCalledWith({
      status: "failed",
      limit: 50,
      offset: 0,
    });

    expect(logAccess).toHaveBeenCalledWith({
      action: "admin.email_outbox_items.read",
      method: "GET",
      resource: "/api/admin/email-outbox",
      result: "success",
      request_id: expect.any(String),
      src_ip: undefined,
      user_agent: undefined,
      meta: {
        admin_email: "admin@example.com",
        status: "failed",
        limit: 50,
        offset: 0,
        total_items: 1,
      },
    });
  });

  it("should handle server errors gracefully", async () => {
    const { validateAdminAccess } = await import("../../app/lib/admin-guard-server");
    const { GetEmailOutboxItems } = await import("../../app/lib/emails/queries/GetEmailOutboxItems");
    const { logAccess } = await import("../../app/lib/audit/auditClient");

    vi.mocked(validateAdminAccess).mockReturnValue({
      valid: true,
      adminEmail: "admin@example.com",
    });

    const mockExecute = vi.fn().mockRejectedValue(new Error("Database error"));

    vi.mocked(GetEmailOutboxItems).mockImplementation(() => ({
      execute: mockExecute,
    }));

    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-outbox"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      ok: false,
      error: "internal_server_error",
      message: "Failed to get email outbox items",
    });

    expect(logAccess).toHaveBeenCalledWith({
      action: "admin.email_outbox_items.read",
      method: "GET",
      resource: "/api/admin/email-outbox",
      result: "error",
      request_id: expect.any(String),
      src_ip: undefined,
      user_agent: undefined,
      meta: {
        error: "Database error",
      },
    });
  });
});
