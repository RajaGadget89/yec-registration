import {
  EmailOutboxItemsResult,
  EmailOutboxItemsQuery,
  EmailOutboxItem,
} from "../types";
import { getServiceRoleClient } from "../../supabase-server";

/**
 * Core use case for getting email outbox items with pagination and filtering
 */
export class GetEmailOutboxItems {
  /**
   * Execute the query to get outbox items
   */
  async execute(query: EmailOutboxItemsQuery): Promise<EmailOutboxItemsResult> {
    try {
      const supabase = getServiceRoleClient();

      const { status, limit = 50, offset = 0 } = query;

      // Build the query
      let supabaseQuery = supabase
        .from("email_outbox")
        .select(
          "id, to_email, subject, status, created_at, updated_at, last_error",
          { count: "exact" },
        );

      // Apply status filter if provided
      if (status) {
        supabaseQuery = supabaseQuery.eq("status", status);
      }

      // Apply pagination
      supabaseQuery = supabaseQuery
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      // Execute the query
      const { data, error, count } = await supabaseQuery;

      if (error) {
        throw new Error(`Failed to query email outbox items: ${error.message}`);
      }

      // Transform the data to match the expected contract
      const items: EmailOutboxItem[] = (data || []).map((item) => ({
        id: (item as any).id,
        to: (item as any).to_email,
        subject: (item as any).subject || "No subject",
        status: (item as any).status,
        created_at: (item as any).created_at,
        updated_at: (item as any).updated_at,
        error_message: (item as any).last_error || undefined,
      }));

      return {
        items,
        total: count || 0,
      };
    } catch (error) {
      console.error(
        "[EMAIL_OUTBOX_ITEMS] Failed to get email outbox items:",
        error,
      );
      throw new Error(
        `Failed to get email outbox items: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
