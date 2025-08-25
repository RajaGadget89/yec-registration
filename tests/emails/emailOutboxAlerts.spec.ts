import { describe, it, expect, beforeEach } from 'vitest';
import { EmailOutboxAlertEvaluator } from '../../app/lib/emails/alerts/EmailOutboxAlertEvaluator';
import { EmailOutboxTrends24h } from '../../app/lib/emails/types';

describe('EmailOutboxAlertEvaluator', () => {
  let evaluator: EmailOutboxAlertEvaluator;

  beforeEach(() => {
    evaluator = new EmailOutboxAlertEvaluator({
      pendingThreshold: 50,
      oldestPendingMaxAgeMinutes: 30,
      failureSpikeThreshold: 10
    });
  });

  describe('evaluate', () => {
    it('should return ok: true when no alerts are triggered', () => {
      const trends: EmailOutboxTrends24h = {
        window: "24h",
        buckets: [
          {
            ts: "2025-01-27T23:00:00.000Z",
            queued: 5,
            sent: 10,
            failed: 2,
            pending_snapshot: 3
          }
        ],
        summary: {
          total_queued: 20,
          total_sent: 15,
          total_failed: 5,
          oldest_pending: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
          current_pending: 10,
          success_rate_24h: 0.75
        }
      };

      const result = evaluator.evaluate(trends);

      expect(result.ok).toBe(true);
      expect(result.reasons).toEqual([]);
      expect(result.details).toEqual({});
      expect(result.severity).toBe("warning");
    });

    it('should trigger PENDING_HIGH alert when pending count exceeds threshold', () => {
      const trends: EmailOutboxTrends24h = {
        window: "24h",
        buckets: [],
        summary: {
          total_queued: 20,
          total_sent: 15,
          total_failed: 5,
          oldest_pending: null,
          current_pending: 75, // Above threshold of 50
          success_rate_24h: 0.75
        }
      };

      const result = evaluator.evaluate(trends);

      expect(result.ok).toBe(false);
      expect(result.reasons).toContain("PENDING_HIGH");
      expect(result.details.pending_count).toBe(75);
      expect(result.details.pending_threshold).toBe(50);
      expect(result.severity).toBe("warning"); // 75 is not >= 50 * 2 (100)
    });

    it('should trigger OLDEST_PENDING_AGE alert when oldest pending is too old', () => {
      const oldTimestamp = new Date(Date.now() - 45 * 60 * 1000).toISOString(); // 45 minutes ago
      
      const trends: EmailOutboxTrends24h = {
        window: "24h",
        buckets: [],
        summary: {
          total_queued: 20,
          total_sent: 15,
          total_failed: 5,
          oldest_pending: oldTimestamp,
          current_pending: 10,
          success_rate_24h: 0.75
        }
      };

      const result = evaluator.evaluate(trends);

      expect(result.ok).toBe(false);
      expect(result.reasons).toContain("OLDEST_PENDING_AGE");
      expect(result.details.oldest_pending_age_minutes).toBeGreaterThan(30);
      expect(result.details.oldest_pending_max_age_minutes).toBe(30);
      expect(result.details.oldest_pending_timestamp).toBe(oldTimestamp);
      expect(result.severity).toBe("warning"); // 45 minutes is not >= 30 * 2 (60 minutes)
    });

    it('should trigger FAILURE_SPIKE alert when last hour failures exceed threshold', () => {
      const trends: EmailOutboxTrends24h = {
        window: "24h",
        buckets: [
          {
            ts: "2025-01-27T22:00:00.000Z",
            queued: 5,
            sent: 10,
            failed: 3,
            pending_snapshot: 2
          },
          {
            ts: "2025-01-27T23:00:00.000Z", // Last hour
            queued: 5,
            sent: 10,
            failed: 15, // Above threshold of 10
            pending_snapshot: 2
          }
        ],
        summary: {
          total_queued: 20,
          total_sent: 15,
          total_failed: 5,
          oldest_pending: null,
          current_pending: 10,
          success_rate_24h: 0.75
        }
      };

      const result = evaluator.evaluate(trends);

      expect(result.ok).toBe(false);
      expect(result.reasons).toContain("FAILURE_SPIKE");
      expect(result.details.last_hour_failures).toBe(15);
      expect(result.details.failure_spike_threshold).toBe(10);
      expect(result.severity).toBe("critical"); // FAILURE_SPIKE is always critical
    });

    it('should trigger multiple alerts when multiple conditions are met', () => {
      const oldTimestamp = new Date(Date.now() - 45 * 60 * 1000).toISOString(); // 45 minutes ago
      
      const trends: EmailOutboxTrends24h = {
        window: "24h",
        buckets: [
          {
            ts: "2025-01-27T23:00:00.000Z", // Last hour
            queued: 5,
            sent: 10,
            failed: 15, // Above threshold
            pending_snapshot: 2
          }
        ],
        summary: {
          total_queued: 20,
          total_sent: 15,
          total_failed: 5,
          oldest_pending: oldTimestamp,
          current_pending: 75, // Above threshold
          success_rate_24h: 0.75
        }
      };

      const result = evaluator.evaluate(trends);

      expect(result.ok).toBe(false);
      expect(result.reasons).toContain("PENDING_HIGH");
      expect(result.reasons).toContain("OLDEST_PENDING_AGE");
      expect(result.reasons).toContain("FAILURE_SPIKE");
      expect(result.reasons.length).toBe(3);
      expect(result.severity).toBe("critical"); // Multiple critical conditions
    });

    it('should handle empty buckets array gracefully', () => {
      const trends: EmailOutboxTrends24h = {
        window: "24h",
        buckets: [],
        summary: {
          total_queued: 20,
          total_sent: 15,
          total_failed: 5,
          oldest_pending: null,
          current_pending: 10,
          success_rate_24h: 0.75
        }
      };

      const result = evaluator.evaluate(trends);

      expect(result.ok).toBe(true);
      expect(result.reasons).toEqual([]);
      expect(result.severity).toBe("warning");
    });

    it('should handle null oldest_pending gracefully', () => {
      const trends: EmailOutboxTrends24h = {
        window: "24h",
        buckets: [],
        summary: {
          total_queued: 20,
          total_sent: 15,
          total_failed: 5,
          oldest_pending: null,
          current_pending: 10,
          success_rate_24h: 0.75
        }
      };

      const result = evaluator.evaluate(trends);

      expect(result.ok).toBe(true);
      expect(result.reasons).toEqual([]);
      expect(result.severity).toBe("warning");
    });
  });

  describe('configuration', () => {
    it('should use custom configuration when provided', () => {
      const customEvaluator = new EmailOutboxAlertEvaluator({
        pendingThreshold: 100,
        oldestPendingMaxAgeMinutes: 60,
        failureSpikeThreshold: 20
      });

      const trends: EmailOutboxTrends24h = {
        window: "24h",
        buckets: [],
        summary: {
          total_queued: 20,
          total_sent: 15,
          total_failed: 5,
          oldest_pending: null,
          current_pending: 75, // Above default threshold but below custom threshold
          success_rate_24h: 0.75
        }
      };

      const result = customEvaluator.evaluate(trends);

      expect(result.ok).toBe(true); // Should not trigger because custom threshold is higher
      expect(result.severity).toBe("warning");
    });

    it('should use environment variables as defaults', () => {
      // Save original env vars
      const originalPendingThreshold = process.env.EMAIL_OUTBOX_PENDING_THRESHOLD;
      const originalMaxAge = process.env.EMAIL_OUTBOX_OLDEST_PENDING_MAX_AGE_MINUTES;
      const originalFailureThreshold = process.env.EMAIL_OUTBOX_FAILURE_SPIKE_THRESHOLD;

      // Set custom env vars
      process.env.EMAIL_OUTBOX_PENDING_THRESHOLD = "25";
      process.env.EMAIL_OUTBOX_OLDEST_PENDING_MAX_AGE_MINUTES = "15";
      process.env.EMAIL_OUTBOX_FAILURE_SPIKE_THRESHOLD = "5";

      const envEvaluator = new EmailOutboxAlertEvaluator();

      const trends: EmailOutboxTrends24h = {
        window: "24h",
        buckets: [],
        summary: {
          total_queued: 20,
          total_sent: 15,
          total_failed: 5,
          oldest_pending: null,
          current_pending: 30, // Above env threshold of 25
          success_rate_24h: 0.75
        }
      };

      const result = envEvaluator.evaluate(trends);

      expect(result.ok).toBe(false);
      expect(result.reasons).toContain("PENDING_HIGH");
      expect(result.details.pending_threshold).toBe(25);
      expect(result.severity).toBe("warning"); // 30 is not >= 25 * 2

      // Restore original env vars
      process.env.EMAIL_OUTBOX_PENDING_THRESHOLD = originalPendingThreshold;
      process.env.EMAIL_OUTBOX_OLDEST_PENDING_MAX_AGE_MINUTES = originalMaxAge;
      process.env.EMAIL_OUTBOX_FAILURE_SPIKE_THRESHOLD = originalFailureThreshold;
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = evaluator.getConfig();

      expect(config.pendingThreshold).toBe(50);
      expect(config.oldestPendingMaxAgeMinutes).toBe(30);
      expect(config.failureSpikeThreshold).toBe(10);
    });

    it('should return a copy of the configuration', () => {
      const config1 = evaluator.getConfig();
      const config2 = evaluator.getConfig();

      expect(config1).not.toBe(config2); // Should be different objects
      expect(config1).toEqual(config2); // But with same values
    });
  });
});
