import { getSupabaseServiceClient } from "./supabase-server";
import { createHash } from "crypto";

export interface TokenValidationResult {
  success: boolean;
  registration_id: string;
  dimension: string;
  admin_email: string;
  notes: string;
  message: string;
}

export interface TokenData {
  token_id: string;
  token: string;
  registration_id: string;
  dimension: string;
  admin_email: string;
  notes?: string;
}

/**
 * Token Service for secure deep-link token management
 * Handles token creation, validation, and secure storage
 */
export class TokenService {
  /**
   * Create a secure deep-link token
   * Returns token_id (UUID) for event emission, stores token securely
   */
  static async createToken(
    registrationId: string,
    dimension: "payment" | "profile" | "tcc",
    adminEmail: string,
    notes?: string,
  ): Promise<string> {
    const supabase = getSupabaseServiceClient();

    try {
      const { data: tokenId, error } = await supabase.rpc(
        "create_deep_link_token",
        {
          p_registration_id: registrationId,
          p_dimension: dimension,
          p_admin_email: adminEmail,
          p_notes: notes,
        },
      );

      if (error || !tokenId) {
        console.error("Failed to create deep-link token:", error);
        throw new Error("Token creation failed");
      }

      // Return only the token_id - the actual token is stored securely in DB
      return tokenId;
    } catch (error) {
      console.error("Token creation error:", error);
      throw new Error("Failed to create secure token");
    }
  }

  /**
   * Validate a token by token_id
   * Returns validation result without exposing the actual token
   */
  static async validateTokenById(
    tokenId: string,
  ): Promise<TokenValidationResult> {
    const supabase = getSupabaseServiceClient();

    try {
      const { data: validation, error } = await supabase.rpc(
        "validate_deep_link_token_by_id",
        {
          p_token_id: tokenId,
        },
      );

      if (error || !validation || !validation[0]) {
        console.error("Token validation error:", error);
        return {
          success: false,
          registration_id: "",
          dimension: "",
          admin_email: "",
          notes: "",
          message: "Token validation failed",
        };
      }

      const result = validation[0];
      return {
        success: result.success,
        registration_id: result.registration_id,
        dimension: result.dimension,
        admin_email: result.admin_email,
        notes: result.notes || "",
        message: result.message,
      };
    } catch (error) {
      console.error("Token validation error:", error);
      return {
        success: false,
        registration_id: "",
        dimension: "",
        admin_email: "",
        notes: "",
        message: "Token validation failed",
      };
    }
  }

  /**
   * Mark a token as used by token_id
   */
  static async markTokenAsUsed(tokenId: string): Promise<boolean> {
    const supabase = getSupabaseServiceClient();

    try {
      const { data: success, error } = await supabase.rpc(
        "mark_deep_link_token_used_by_id",
        {
          p_token_id: tokenId,
        },
      );

      if (error) {
        console.error("Failed to mark token as used:", error);
        return false;
      }

      return success || false;
    } catch (error) {
      console.error("Mark token as used error:", error);
      return false;
    }
  }

  /**
   * Get token data by token_id (for email generation)
   * This method is used internally by the email service
   */
  static async getTokenDataForEmail(
    tokenId: string,
  ): Promise<TokenData | null> {
    const supabase = getSupabaseServiceClient();

    try {
      const { data: tokens, error } = await supabase
        .from("deep_link_tokens")
        .select(
          "token_id, token, registration_id, dimension, admin_email, notes",
        )
        .eq("token_id", tokenId)
        .eq("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .limit(1);

      if (error || !tokens || tokens.length === 0) {
        console.error("Failed to get token data for email:", error);
        return null;
      }

      const token = tokens[0];
      return {
        token_id: token.token_id,
        token: token.token, // This is the actual token needed for the URL
        registration_id: token.registration_id,
        dimension: token.dimension,
        admin_email: token.admin_email,
        notes: token.notes,
      };
    } catch (error) {
      console.error("Get token data error:", error);
      return null;
    }
  }

  /**
   * Generate a secure hash for a token with salt
   */
  static hashToken(token: string, salt: string): string {
    return createHash("sha256")
      .update(token + salt)
      .digest("hex");
  }

  /**
   * Verify a token against its hash
   */
  static verifyToken(token: string, salt: string, hash: string): boolean {
    const computedHash = this.hashToken(token, salt);
    return computedHash === hash;
  }
}
