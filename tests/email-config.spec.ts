import { describe, it, expect, beforeEach, vi } from "vitest";
import { getEmailConfig, isEmailAllowed, getEmailConfigStatus, validateEmailConfig } from "../app/lib/emails/config";

// Mock environment variables
const mockEnv = (env: Record<string, string>) => {
  vi.stubEnv("EMAIL_MODE", env.EMAIL_MODE || "");
  vi.stubEnv("EMAIL_ALLOWLIST", env.EMAIL_ALLOWLIST || "");
  vi.stubEnv("RESEND_API_KEY", env.RESEND_API_KEY || "");
  vi.stubEnv("EMAIL_FROM", env.EMAIL_FROM || "");
  vi.stubEnv("NODE_ENV", env.NODE_ENV || "development");
};

describe("Email Configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe("getEmailConfig", () => {
    it("should default to DRY_RUN mode when EMAIL_MODE not set", () => {
      mockEnv({});
      const config = getEmailConfig();
      
      expect(config.mode).toBe("DRY_RUN");
      expect(config.allowlist.size).toBe(0);
      expect(config.isProduction).toBe(false);
    });

    it("should parse EMAIL_MODE correctly", () => {
      mockEnv({ EMAIL_MODE: "FULL" });
      const config = getEmailConfig();
      
      expect(config.mode).toBe("FULL");
    });

    it("should parse EMAIL_ALLOWLIST correctly", () => {
      mockEnv({ 
        EMAIL_ALLOWLIST: "test@example.com, another@test.com, third@test.com" 
      });
      const config = getEmailConfig();
      
      expect(config.allowlist.size).toBe(3);
      expect(config.allowlist.has("test@example.com")).toBe(true);
      expect(config.allowlist.has("another@test.com")).toBe(true);
      expect(config.allowlist.has("third@test.com")).toBe(true);
    });

    it("should handle empty EMAIL_ALLOWLIST", () => {
      mockEnv({ EMAIL_ALLOWLIST: "" });
      const config = getEmailConfig();
      
      expect(config.allowlist.size).toBe(0);
    });

    it("should detect production environment", () => {
      mockEnv({ 
        NODE_ENV: "production",
        EMAIL_FROM: "test@example.com" // Required for production
      });
      const config = getEmailConfig();
      
      expect(config.isProduction).toBe(true);
    });
  });

  describe("isEmailAllowed", () => {
    it("should allow emails in production if API key is available", () => {
      mockEnv({ 
        NODE_ENV: "production",
        RESEND_API_KEY: "test-key",
        EMAIL_FROM: "test@example.com" // Required for production
      });
      
      const result = isEmailAllowed("test@example.com");
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe("allowed");
    });

    it("should block emails in production if no API key", () => {
      mockEnv({ 
        NODE_ENV: "production",
        EMAIL_FROM: "test@example.com" // Required for production
      });
      
      const result = isEmailAllowed("test@example.com");
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("no_api_key");
    });

    it("should block emails in DRY_RUN mode", () => {
      mockEnv({ EMAIL_MODE: "DRY_RUN" });
      
      const result = isEmailAllowed("test@example.com");
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("dry_run_mode");
    });

    it("should allow emails in FULL mode if in allowlist", () => {
      mockEnv({ 
        EMAIL_MODE: "FULL",
        EMAIL_ALLOWLIST: "test@example.com, another@test.com"
      });
      
      const result = isEmailAllowed("test@example.com");
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe("allowed");
    });

    it("should block emails in FULL mode if not in allowlist", () => {
      mockEnv({ 
        EMAIL_MODE: "FULL",
        EMAIL_ALLOWLIST: "allowed@example.com"
      });
      
      const result = isEmailAllowed("blocked@example.com");
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("not_in_allowlist");
    });

    it("should allow all emails in FULL mode if no allowlist configured", () => {
      mockEnv({ EMAIL_MODE: "FULL" });
      
      const result = isEmailAllowed("any@example.com");
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe("allowed");
    });

    it("should be case insensitive for email addresses", () => {
      mockEnv({ 
        EMAIL_MODE: "FULL",
        EMAIL_ALLOWLIST: "TEST@EXAMPLE.COM"
      });
      
      const result = isEmailAllowed("test@example.com");
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe("allowed");
    });
  });

  describe("getEmailConfigStatus", () => {
    it("should return complete configuration status", () => {
      mockEnv({ 
        EMAIL_MODE: "FULL",
        EMAIL_ALLOWLIST: "test@example.com",
        RESEND_API_KEY: "test-key",
        EMAIL_FROM: "noreply@example.com"
      });
      
      const status = getEmailConfigStatus();
      
      expect(status.mode).toBe("FULL");
      expect(status.allowlist).toEqual(["test@example.com"]);
      expect(status.allowlistSize).toBe(1);
      expect(status.resendConfigured).toBe(true);
      expect(status.isProduction).toBe(false);
    });
  });

  describe("validateEmailConfig", () => {
    it("should validate correct configuration", () => {
      mockEnv({ 
        EMAIL_MODE: "FULL",
        EMAIL_FROM: "noreply@example.com",
        RESEND_API_KEY: "test-key"
      });
      
      const validation = validateEmailConfig();
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should detect missing EMAIL_FROM", () => {
      mockEnv({ 
        EMAIL_MODE: "FULL",
        NODE_ENV: "production" // Only required in production
      });
      
      const validation = validateEmailConfig();
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("EMAIL_FROM not configured");
    });

    it("should detect missing RESEND_API_KEY in FULL mode", () => {
      mockEnv({ 
        EMAIL_MODE: "FULL",
        EMAIL_FROM: "noreply@example.com"
      });
      
      const validation = validateEmailConfig();
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("RESEND_API_KEY required for FULL mode");
    });

    it("should warn about DRY_RUN in production", () => {
      mockEnv({ 
        NODE_ENV: "production",
        EMAIL_MODE: "DRY_RUN",
        EMAIL_FROM: "noreply@example.com"
      });
      
      const validation = validateEmailConfig();
      
      expect(validation.valid).toBe(true);
      expect(validation.warnings).toContain("EMAIL_MODE=DRY_RUN in production environment");
    });

    it("should warn about no allowlist in FULL mode (non-prod)", () => {
      mockEnv({ 
        EMAIL_MODE: "FULL",
        EMAIL_FROM: "noreply@example.com",
        RESEND_API_KEY: "test-key"
      });
      
      const validation = validateEmailConfig();
      
      expect(validation.valid).toBe(true);
      expect(validation.warnings).toContain("No EMAIL_ALLOWLIST configured in FULL mode - all emails will be sent");
    });
  });
});
