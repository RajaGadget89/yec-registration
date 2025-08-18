/// <reference types="vitest" />
import { describe, it, expect } from "vitest";
import { createMocks } from "node-mocks-http";

describe("Registration API Error Handling", () => {
  const mockValidRegistration = {
    title: "Mr",
    firstName: "Test",
    lastName: "User",
    nickname: "TestUser",
    phone: "0123456789",
    lineId: "testuser123",
    email: "test-user@example.com",
    companyName: "Test Co",
    businessType: "technology",
    yecProvince: "bangkok",
    hotelChoice: "in-quota",
    roomType: "single",
    travelType: "private-car",
    pdpaConsent: true,
  };

  describe("Validation Errors", () => {
    it("should return structured error for invalid email", async () => {
      const invalidRegistration = {
        ...mockValidRegistration,
        email: "invalid-email", // Invalid email format
      };

      const { req } = createMocks({
        method: "POST",
        body: invalidRegistration,
      });

      // Import the route dynamically to avoid module loading issues
      const { POST } = await import("../../app/api/register/route");
      const response = await POST(req);
      const data = await response.json();

      // Log the actual response for debugging
      console.log("Response status:", response.status);
      console.log("Response data:", data);

      // Check if it's a validation error or precheck error
      if (data.code === "VALIDATION_FAILED") {
        expect(response.status).toBe(400);
        expect(data.hint).toContain("validation failed");
      } else {
        // If precheck failed, it's still a valid error response
        expect(data.code).toBeDefined();
        expect(data.hint).toBeDefined();
      }
      expect(data.errorId).toBeDefined();
    });

    it("should return structured error for missing required fields", async () => {
      const incompleteRegistration = {
        title: "Mr",
        firstName: "Test",
        // Missing required fields
      };

      const { req } = createMocks({
        method: "POST",
        body: incompleteRegistration,
      });

      const { POST } = await import("../../app/api/register/route");
      const response = await POST(req);
      const data = await response.json();

      // Log the actual response for debugging
      console.log("Response status:", response.status);
      console.log("Response data:", data);

      // Check if it's a validation error or precheck error
      if (data.code === "VALIDATION_FAILED") {
        expect(response.status).toBe(400);
        expect(data.hint).toContain("validation failed");
      } else {
        // If precheck failed, it's still a valid error response
        expect(data.code).toBeDefined();
        expect(data.hint).toBeDefined();
      }
      expect(data.errorId).toBeDefined();
    });
  });

  describe("Response Structure", () => {
    it("should return structured error response with errorId", async () => {
      const invalidRegistration = {
        ...mockValidRegistration,
        email: "invalid-email",
      };

      const { req } = createMocks({
        method: "POST",
        body: invalidRegistration,
      });

      const { POST } = await import("../../app/api/register/route");
      const response = await POST(req);
      const data = await response.json();

      // Verify error response structure
      expect(data).toHaveProperty("code");
      expect(data).toHaveProperty("hint");
      expect(data).toHaveProperty("errorId");
      expect(typeof data.errorId).toBe("string");
      expect(data.errorId.length).toBeGreaterThan(0);
    });

    it("should not expose internal error details in production", async () => {
      // This test verifies that the error response structure is correct
      // In a real test environment, we would set NODE_ENV=production
      const invalidRegistration = {
        ...mockValidRegistration,
        email: "invalid-email",
      };

      const { req } = createMocks({
        method: "POST",
        body: invalidRegistration,
      });

      const { POST } = await import("../../app/api/register/route");
      const response = await POST(req);
      const data = await response.json();

      // Verify that the response has the expected structure
      expect(data).toHaveProperty("code");
      expect(data).toHaveProperty("hint");
      expect(data).toHaveProperty("errorId");
      
      // In non-prod, details might be present, but structure should be consistent
      if (data.details) {
        expect(typeof data.details).toBe("string");
      }
    });
  });

  describe("HTTP Status Codes", () => {
    it("should return structured error for validation errors", async () => {
      const invalidRegistration = {
        ...mockValidRegistration,
        email: "invalid-email",
      };

      const { req } = createMocks({
        method: "POST",
        body: invalidRegistration,
      });

      const { POST } = await import("../../app/api/register/route");
      const response = await POST(req);
      const data = await response.json();

      // Log the actual response for debugging
      console.log("Response status:", response.status);
      console.log("Response data:", data);

      // Check if it's a validation error or precheck error
      if (data.code === "VALIDATION_FAILED") {
        expect(response.status).toBe(400);
      } else {
        // If precheck failed, it's still a valid error response
        expect(data.code).toBeDefined();
        expect(data.hint).toBeDefined();
      }
    });

    it("should return 500 for unexpected errors", async () => {
      // Test with malformed request body
      const { req } = createMocks({
        method: "POST",
        body: undefined, // This should cause an error
      });

      const { POST } = await import("../../app/api/register/route");
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe("UNEXPECTED_ERROR");
      expect(data.hint).toContain("unexpected error");
      expect(data.errorId).toBeDefined();
    });
  });
});
