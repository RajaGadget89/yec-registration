import { getSupabaseServiceClient } from "./supabase-server";
import { verifyStorageBuckets } from "./storage-bucket-setup";

export interface PrecheckResult {
  success: boolean;
  code?: string;
  hint?: string;
  details?: string;
}

/**
 * Precheck function to validate preconditions for registration
 * Returns structured error responses for expected issues
 */
export async function precheckRegistration(): Promise<PrecheckResult> {
  try {
    // 1. Check if event settings exist and are active
    const supabase = getSupabaseServiceClient();
    const { data: eventSettings, error } = await supabase
      .from("event_settings")
      .select("registration_deadline_utc, early_bird_deadline_utc")
      .single();

    if (error || !eventSettings) {
      return {
        success: false,
        code: "EVENT_CONFIG_MISSING",
        hint: "Event settings not configured. Run 'npm run seed:staging' to set up default configuration.",
        details: error?.message || "No event_settings record found",
      };
    }

    // 2. Check if registration deadline has passed
    const now = new Date();
    const registrationDeadline = new Date(eventSettings.registration_deadline_utc);
    
    if (now > registrationDeadline) {
      return {
        success: false,
        code: "REGISTRATION_CLOSED",
        hint: "Registration deadline has passed. Contact administrators for assistance.",
        details: `Deadline: ${registrationDeadline.toISOString()}, Current: ${now.toISOString()}`,
      };
    }

    // 3. Check if storage buckets exist
    try {
      const bucketResult = await verifyStorageBuckets();
      if (!bucketResult.exists) {
        return {
          success: false,
          code: "STORAGE_PRECONDITION_FAILED",
          hint: "Required storage buckets not configured. Contact administrators.",
          details: bucketResult.missing?.join(", ") || "Storage bucket verification failed",
        };
      }
    } catch (bucketError) {
      return {
        success: false,
        code: "STORAGE_PRECONDITION_FAILED",
        hint: "Storage bucket verification failed. Contact administrators.",
        details: bucketError instanceof Error ? bucketError.message : "Unknown storage error",
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      code: "UNEXPECTED_ERROR",
      hint: "Unexpected error during precheck. Please try again.",
      details: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
