/**
 * Test file for Request Update Pricing Calculator
 *
 * This test verifies that the Request Update pricing calculator
 * correctly preserves Early Bird pricing for users who registered
 * before the Early Bird deadline, regardless of when they make updates.
 */

import { RequestUpdatePricingCalculator } from "../lib/requestUpdatePricingCalculator";

// Mock data for testing
const mockRegistrationId = "test-registration-id";
const mockEarlyBirdRegistrationTime = new Date("2025-09-10T10:00:00Z"); // Before Early Bird deadline
const mockLateRegistrationTime = new Date("2025-09-20T10:00:00Z"); // After Early Bird deadline
const mockEarlyBirdDeadline = new Date("2025-09-15T10:00:00Z");

// Mock pricing configuration
const mockPricingConfig = {
  early_bird_deadline: mockEarlyBirdDeadline.toISOString(),
  allow_in_quota_after_early_bird: true,
  early_bird_prices: {
    out_of_quota: 1199,
    in_quota_double: 1999,
    in_quota_single: 2699,
  },
  normal_prices: {
    out_of_quota: 2299,
    in_quota_double: 2999,
    in_quota_single: 4999,
  },
};

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => ({
          data: {
            created_at: mockEarlyBirdRegistrationTime.toISOString(),
            price_applied: 2699,
            currency: "THB",
            selected_package_code: "in-quota-single",
            is_early_bird: true,
            price_breakdown: {
              basePrice: 1999,
              roomSurcharge: 700,
              total: 2699,
            },
          },
          error: null,
        })),
      })),
    })),
  })),
};

// Mock the getSupabaseServiceClient function
jest.mock("../lib/supabase-server", () => ({
  getSupabaseServiceClient: () => mockSupabaseClient,
}));

describe("RequestUpdatePricingCalculator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("calculateUpdatePrice", () => {
    it("should preserve Early Bird pricing for users who registered before deadline", async () => {
      // Mock event settings response
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { pricing_config: mockPricingConfig },
            error: null,
          })),
        })),
      });

      // Mock registration response
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: {
                created_at: mockEarlyBirdRegistrationTime.toISOString(),
                price_applied: 2699,
                currency: "THB",
                selected_package_code: "in-quota-single",
                is_early_bird: true,
                price_breakdown: {
                  basePrice: 1999,
                  roomSurcharge: 700,
                  total: 2699,
                },
              },
              error: null,
            })),
          })),
        })),
      });

      const result = await RequestUpdatePricingCalculator.calculateUpdatePrice(
        mockRegistrationId,
        "in-quota",
        "single",
      );

      expect(result.isEarlyBird).toBe(true);
      expect(result.price).toBe(2699); // Early Bird price
      expect(result.packageCode).toBe("in-quota-single");
    });

    it("should use normal pricing for users who registered after deadline", async () => {
      // Mock event settings response
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { pricing_config: mockPricingConfig },
            error: null,
          })),
        })),
      });

      // Mock registration response with late registration
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: {
                created_at: mockLateRegistrationTime.toISOString(),
                price_applied: 4999,
                currency: "THB",
                selected_package_code: "in-quota-single",
                is_early_bird: false,
                price_breakdown: {
                  basePrice: 4999,
                  roomSurcharge: 0,
                  total: 4999,
                },
              },
              error: null,
            })),
          })),
        })),
      });

      const result = await RequestUpdatePricingCalculator.calculateUpdatePrice(
        mockRegistrationId,
        "in-quota",
        "single",
      );

      expect(result.isEarlyBird).toBe(false);
      expect(result.price).toBe(4999); // Normal price
      expect(result.packageCode).toBe("in-quota-single");
    });

    it("should handle out-of-quota hotel choice correctly", async () => {
      // Mock event settings response
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { pricing_config: mockPricingConfig },
            error: null,
          })),
        })),
      });

      // Mock registration response
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: {
                created_at: mockEarlyBirdRegistrationTime.toISOString(),
                price_applied: 1199,
                currency: "THB",
                selected_package_code: "out-of-quota",
                is_early_bird: true,
                price_breakdown: {
                  basePrice: 1199,
                  roomSurcharge: 0,
                  total: 1199,
                },
              },
              error: null,
            })),
          })),
        })),
      });

      const result = await RequestUpdatePricingCalculator.calculateUpdatePrice(
        mockRegistrationId,
        "out-of-quota",
        null,
      );

      expect(result.isEarlyBird).toBe(true);
      expect(result.price).toBe(1199); // Early Bird out-of-quota price
      expect(result.packageCode).toBe("out-of-quota");
    });
  });

  describe("validateUpdateRequest", () => {
    it("should validate update requests correctly", async () => {
      // Mock event settings response
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { pricing_config: mockPricingConfig },
            error: null,
          })),
        })),
      });

      // Mock registration response
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: {
                created_at: mockEarlyBirdRegistrationTime.toISOString(),
                hotel_choice: "in-quota",
                room_type: "single",
              },
              error: null,
            })),
          })),
        })),
      });

      const result = await RequestUpdatePricingCalculator.validateUpdateRequest(
        mockRegistrationId,
        "in-quota",
        "single",
      );

      expect(result.valid).toBe(true);
    });
  });
});

export {};
