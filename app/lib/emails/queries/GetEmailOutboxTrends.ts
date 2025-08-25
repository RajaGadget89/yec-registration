import { EmailOutboxTrends24h, EmailOutboxTrendsPoint } from "../types";
import { getServiceRoleClient } from "../../supabase-server";

/**
 * Core use case for getting email outbox trends data
 * Provides 24-hour time-series aggregated by hour
 */
export class GetEmailOutboxTrends {
  /**
   * Execute the query to get trends data
   */
  async execute(): Promise<EmailOutboxTrends24h> {
    try {
      const supabase = getServiceRoleClient();

      // Get the last 24 hours of data, aggregated by hour
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      // Query for queued emails (created in each hour)
      const { data: queuedData, error: queuedError } = await supabase
        .from("email_outbox")
        .select("created_at")
        .gte("created_at", twentyFourHoursAgo.toISOString());

      if (queuedError) {
        throw new Error(
          `Failed to query queued emails: ${queuedError.message}`,
        );
      }

      // Query for sent emails (sent_at in each hour)
      const { data: sentData, error: sentError } = await supabase
        .from("email_outbox")
        .select("sent_at")
        .eq("status", "sent")
        .gte("sent_at", twentyFourHoursAgo.toISOString())
        .not("sent_at", "is", null);

      if (sentError) {
        throw new Error(`Failed to query sent emails: ${sentError.message}`);
      }

      // Query for failed emails (updated_at in each hour where status = failed)
      const { data: failedData, error: failedError } = await supabase
        .from("email_outbox")
        .select("updated_at")
        .eq("status", "failed")
        .gte("updated_at", twentyFourHoursAgo.toISOString());

      if (failedError) {
        throw new Error(
          `Failed to query failed emails: ${failedError.message}`,
        );
      }

      // Get current pending count and oldest pending
      const { data: pendingData, error: pendingError } = await supabase
        .from("email_outbox")
        .select("created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (pendingError) {
        throw new Error(
          `Failed to query pending emails: ${pendingError.message}`,
        );
      }

      // Generate 24 hourly buckets
      const buckets = this.generateHourlyBuckets(twentyFourHoursAgo);

      // Aggregate data into buckets
      this.aggregateIntoBuckets(
        buckets,
        queuedData || [],
        sentData || [],
        failedData || [],
      );

      // Calculate summary
      const summary = this.calculateSummary(buckets, pendingData || []);

      return {
        window: "24h",
        buckets,
        summary,
      };
    } catch (error) {
      console.error("[TRENDS] Failed to get email outbox trends:", error);
      throw new Error(
        `Failed to get email outbox trends: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Generate 24 hourly buckets starting from the given time
   */
  private generateHourlyBuckets(startTime: Date): EmailOutboxTrendsPoint[] {
    const buckets: EmailOutboxTrendsPoint[] = [];

    for (let i = 0; i < 24; i++) {
      const bucketStart = new Date(startTime);
      bucketStart.setHours(bucketStart.getHours() + i);

      buckets.push({
        ts: bucketStart.toISOString(),
        queued: 0,
        sent: 0,
        failed: 0,
        pending_snapshot: 0,
      });
    }

    return buckets;
  }

  /**
   * Aggregate email data into hourly buckets
   */
  private aggregateIntoBuckets(
    buckets: EmailOutboxTrendsPoint[],
    queuedData: Array<{ created_at: string }>,
    sentData: Array<{ sent_at: string }>,
    failedData: Array<{ updated_at: string }>,
  ): void {
    // Aggregate queued emails
    queuedData.forEach((item) => {
      const bucketIndex = this.getBucketIndex(item.created_at, buckets);
      if (bucketIndex >= 0) {
        buckets[bucketIndex].queued++;
      }
    });

    // Aggregate sent emails
    sentData.forEach((item) => {
      const bucketIndex = this.getBucketIndex(item.sent_at, buckets);
      if (bucketIndex >= 0) {
        buckets[bucketIndex].sent++;
      }
    });

    // Aggregate failed emails
    failedData.forEach((item) => {
      const bucketIndex = this.getBucketIndex(item.updated_at, buckets);
      if (bucketIndex >= 0) {
        buckets[bucketIndex].failed++;
      }
    });
  }

  /**
   * Get the bucket index for a given timestamp
   */
  private getBucketIndex(
    timestamp: string,
    buckets: EmailOutboxTrendsPoint[],
  ): number {
    const date = new Date(timestamp);

    for (let i = 0; i < buckets.length; i++) {
      const bucketStart = new Date(buckets[i].ts);
      const bucketEnd = new Date(bucketStart);
      bucketEnd.setHours(bucketEnd.getHours() + 1);

      if (date >= bucketStart && date < bucketEnd) {
        return i;
      }
    }

    return -1; // Not found
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(
    buckets: EmailOutboxTrendsPoint[],
    pendingData: Array<{ created_at: string }>,
  ): EmailOutboxTrends24h["summary"] {
    const total_queued = buckets.reduce(
      (sum, bucket) => sum + bucket.queued,
      0,
    );
    const total_sent = buckets.reduce((sum, bucket) => sum + bucket.sent, 0);
    const total_failed = buckets.reduce(
      (sum, bucket) => sum + bucket.failed,
      0,
    );
    const current_pending = pendingData.length;
    const oldest_pending =
      pendingData.length > 0 ? pendingData[0].created_at : null;
    const success_rate_24h = total_queued > 0 ? total_sent / total_queued : 0;

    return {
      total_queued,
      total_sent,
      total_failed,
      oldest_pending,
      current_pending,
      success_rate_24h,
    };
  }
}
