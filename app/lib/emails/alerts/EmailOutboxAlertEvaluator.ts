import {
  EmailOutboxAlert,
  EmailOutboxTrends24h,
  EmailOutboxAlertConfig,
} from "../types";

/**
 * Pure logic evaluator for email outbox alerts
 * Takes trends data and config thresholds to determine alert status
 */
export class EmailOutboxAlertEvaluator {
  private config: EmailOutboxAlertConfig;

  constructor(config?: Partial<EmailOutboxAlertConfig>) {
    this.config = {
      pendingThreshold: parseInt(
        process.env.EMAIL_OUTBOX_PENDING_THRESHOLD || "50",
      ),
      oldestPendingMaxAgeMinutes: parseInt(
        process.env.EMAIL_OUTBOX_OLDEST_PENDING_MAX_AGE_MINUTES || "30",
      ),
      failureSpikeThreshold: parseInt(
        process.env.EMAIL_OUTBOX_FAILURE_SPIKE_THRESHOLD || "10",
      ),
      ...config,
    };
  }

  /**
   * Evaluate alerts based on trends data
   */
  evaluate(trends: EmailOutboxTrends24h): EmailOutboxAlert {
    const reasons: EmailOutboxAlert["reasons"] = [];
    const details: Record<string, unknown> = {};
    let severity: "warning" | "critical" = "warning";

    // Check pending count threshold
    if (trends.summary.current_pending > this.config.pendingThreshold) {
      reasons.push("PENDING_HIGH");
      details.pending_count = trends.summary.current_pending;
      details.pending_threshold = this.config.pendingThreshold;

      // Critical if pending count is 2x threshold
      if (trends.summary.current_pending >= this.config.pendingThreshold * 2) {
        severity = "critical";
      }
    }

    // Check oldest pending age
    if (trends.summary.oldest_pending) {
      const oldestPendingAge = this.calculateAgeInMinutes(
        trends.summary.oldest_pending,
      );
      if (oldestPendingAge > this.config.oldestPendingMaxAgeMinutes) {
        reasons.push("OLDEST_PENDING_AGE");
        details.oldest_pending_age_minutes = oldestPendingAge;
        details.oldest_pending_max_age_minutes =
          this.config.oldestPendingMaxAgeMinutes;
        details.oldest_pending_timestamp = trends.summary.oldest_pending;

        // Critical if age is 2x threshold
        if (oldestPendingAge >= this.config.oldestPendingMaxAgeMinutes * 2) {
          severity = "critical";
        }
      }
    }

    // Check failure spike in last hour
    const lastHourFailures = this.getLastHourFailures(trends);
    if (lastHourFailures > this.config.failureSpikeThreshold) {
      reasons.push("FAILURE_SPIKE");
      details.last_hour_failures = lastHourFailures;
      details.failure_spike_threshold = this.config.failureSpikeThreshold;

      // Critical if failure spike is present
      severity = "critical";
    }

    return {
      ok: reasons.length === 0,
      reasons,
      details,
      severity,
    };
  }

  /**
   * Calculate age in minutes from ISO8601 timestamp
   */
  private calculateAgeInMinutes(timestamp: string): number {
    const timestampDate = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestampDate.getTime();
    return Math.floor(diffMs / (1000 * 60));
  }

  /**
   * Get failure count from the last hour bucket
   */
  private getLastHourFailures(trends: EmailOutboxTrends24h): number {
    if (trends.buckets.length === 0) {
      return 0;
    }

    // Get the most recent bucket (last in the array)
    const lastBucket = trends.buckets[trends.buckets.length - 1];
    return lastBucket.failed;
  }

  /**
   * Get current configuration
   */
  getConfig(): EmailOutboxAlertConfig {
    return { ...this.config };
  }
}
