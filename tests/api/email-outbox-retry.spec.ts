import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../../app/api/admin/email-outbox/retry/route";

// Mock the admin guard
vi.mock("../../app/lib/admin-guard-server", () => ({
  validateAdminAccess: vi.fn(),
}));

// Mock the core use case
vi.mock("../../app/lib/emails/commands/RetryEmailDispatch", () => ({
  RetryEmailDispatch: vi.fn().mockImplementation(() => ({
    execute: vi.fn(),
  })),
}));

// Mock the audit client
vi.mock("../../app/lib/audit/auditClient", () => ({
  logAccess: vi.fn(),
}));

describe("POST /api/admin/email-outbox/retry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 for unauthorized access", async () => {
    const { validateAdminAccess } = await import("../../app/lib/admin-guard-server");
    vi.mocked(validateAdminAccess).mockReturnValue({
      valid: false,
      adminEmail: null,
    });

    const request = new NextRequest("http://localhost:3000/api/admin/email-outbox/retry", {
      method: "POST",
      body: JSON.stringify({ ids: ["1", "2"] }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({
      ok: false,
      error: "unauthorized",
    });
  });

  it("should return 400 for missing ids array", async () => {
    const { validateAdminAccess } = await import("../../app/lib/admin-guard-server");
    vi.mocked(validateAdminAccess).mockReturnValue({
      valid: true,
      adminEmail: "admin@example.com",
    });

    const request = new NextRequest("http://localhost:3000/api/admin/email-outbox/retry", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      ok: false,
      error: "invalid_request",
      message: "ids array is required and must not be empty",
    });
  });

  it("should return 400 for empty ids array", async () => {
    const { validateAdminAccess } = await import("../../app/lib/admin-guard-server");
    vi.mocked(validateAdminAccess).mockReturnValue({
      valid: true,
      adminEmail: "admin@example.com",
    });

    const request = new NextRequest("http://localhost:3000/api/admin/email-outbox/retry", {
      method: "POST",
      body: JSON.stringify({ ids: [] }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      ok: false,
      error: "invalid_request",
      message: "ids array is required and must not be empty",
    });
  });

  it("should return 400 for too many ids", async () => {
    const { validateAdminAccess } = await import("../../app/lib/admin-guard-server");
    vi.mocked(validateAdminAccess).mockReturnValue({
      valid: true,
      adminEmail: "admin@example.com",
    });

    const ids = Array.from({ length: 101 }, (_, i) => `id-${i}`);
    const request = new NextRequest("http://localhost:3000/api/admin/email-outbox/retry", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      ok: false,
      error: "invalid_request",
      message: "Cannot retry more than 100 emails at once",
    });
  });

  it("should return 400 for non-string ids", async () => {
    const { validateAdminAccess } = await import("../../app/lib/admin-guard-server");
    vi.mocked(validateAdminAccess).mockReturnValue({
      valid: true,
      adminEmail: "admin@example.com",
    });

    const request = new NextRequest("http://localhost:3000/api/admin/email-outbox/retry", {
      method: "POST",
      body: JSON.stringify({ ids: ["1", 2, "3"] }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      ok: false,
      error: "invalid_request",
      message: "All ids must be strings",
    });
  });

  it("should retry emails successfully", async () => {
    const { validateAdminAccess } = await import("../../app/lib/admin-guard-server");
    const { RetryEmailDispatch } = await import("../../app/lib/emails/commands/RetryEmailDispatch");
    const { logAccess } = await import("../../app/lib/audit/auditClient");

    vi.mocked(validateAdminAccess).mockReturnValue({
      valid: true,
      adminEmail: "admin@example.com",
    });

    const mockExecute = vi.fn().mockResolvedValue(undefined);

    vi.mocked(RetryEmailDispatch).mockImplementation(() => ({
      execute: mockExecute,
    }));

    const request = new NextRequest("http://localhost:3000/api/admin/email-outbox/retry", {
      method: "POST",
      body: JSON.stringify({ 
        ids: ["1", "2", "3"],
        reason: "Manual retry"
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      ok: true,
      message: "Successfully queued 3 emails for retry",
      retried_count: 3,
    });

    expect(mockExecute).toHaveBeenCalledWith(
      ["1", "2", "3"],
      "admin@example.com",
      "Manual retry"
    );

    expect(logAccess).toHaveBeenCalledWith({
      action: "admin.email_outbox_retry",
      method: "POST",
      resource: "/api/admin/email-outbox/retry",
      result: "success",
      request_id: expect.any(String),
      src_ip: undefined,
      user_agent: undefined,
      meta: {
        admin_email: "admin@example.com",
        email_ids: ["1", "2", "3"],
        reason: "Manual retry",
        retry_count: 3,
      },
    });
  });

  it("should handle not found error from core", async () => {
    const { validateAdminAccess } = await import("../../app/lib/admin-guard-server");
    const { RetryEmailDispatch } = await import("../../app/lib/emails/commands/RetryEmailDispatch");

    vi.mocked(validateAdminAccess).mockReturnValue({
      valid: true,
      adminEmail: "admin@example.com",
    });

    const mockExecute = vi.fn().mockRejectedValue(new Error("No emails found with ids: 1, 2"));

    vi.mocked(RetryEmailDispatch).mockImplementation(() => ({
      execute: mockExecute,
    }));

    const request = new NextRequest("http://localhost:3000/api/admin/email-outbox/retry", {
      method: "POST",
      body: JSON.stringify({ ids: ["1", "2"] }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({
      ok: false,
      error: "not_found",
      message: "No emails found with ids: 1, 2",
    });
  });

  it("should handle invalid status error from core", async () => {
    const { validateAdminAccess } = await import("../../app/lib/admin-guard-server");
    const { RetryEmailDispatch } = await import("../../app/lib/emails/commands/RetryEmailDispatch");

    vi.mocked(validateAdminAccess).mockReturnValue({
      valid: true,
      adminEmail: "admin@example.com",
    });

    const mockExecute = vi.fn().mockRejectedValue(
      new Error("Cannot retry emails that are not in failed status")
    );

    vi.mocked(RetryEmailDispatch).mockImplementation(() => ({
      execute: mockExecute,
    }));

    const request = new NextRequest("http://localhost:3000/api/admin/email-outbox/retry", {
      method: "POST",
      body: JSON.stringify({ ids: ["1"] }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      ok: false,
      error: "invalid_status",
      message: "Cannot retry emails that are not in failed status",
    });
  });

  it("should handle generic server errors", async () => {
    const { validateAdminAccess } = await import("../../app/lib/admin-guard-server");
    const { RetryEmailDispatch } = await import("../../app/lib/emails/commands/RetryEmailDispatch");
    const { logAccess } = await import("../../app/lib/audit/auditClient");

    vi.mocked(validateAdminAccess).mockReturnValue({
      valid: true,
      adminEmail: "admin@example.com",
    });

    const mockExecute = vi.fn().mockRejectedValue(new Error("Database connection failed"));

    vi.mocked(RetryEmailDispatch).mockImplementation(() => ({
      execute: mockExecute,
    }));

    const request = new NextRequest("http://localhost:3000/api/admin/email-outbox/retry", {
      method: "POST",
      body: JSON.stringify({ ids: ["1"] }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      ok: false,
      error: "internal_server_error",
      message: "Failed to retry emails",
    });

    expect(logAccess).toHaveBeenCalledWith({
      action: "admin.email_outbox_retry",
      method: "POST",
      resource: "/api/admin/email-outbox/retry",
      result: "error",
      request_id: expect.any(String),
      src_ip: undefined,
      user_agent: undefined,
      meta: {
        error: "Database connection failed",
      },
    });
  });
});
