// Email outbox trends and alerts types

export type EmailOutboxTrendsPoint = {
  ts: string; // ISO8601, start of bucket
  queued: number; // count events/items queued in this bucket
  sent: number; // count sent in this bucket
  failed: number; // count failed in this bucket
  pending_snapshot?: number; // optional: snapshot of pending at bucket end (if available)
};

export type EmailOutboxTrends24h = {
  window: "24h";
  buckets: EmailOutboxTrendsPoint[]; // ordered ascending by ts
  summary: {
    total_queued: number;
    total_sent: number;
    total_failed: number;
    oldest_pending: string | null; // ISO8601 or null
    current_pending: number;
    success_rate_24h: number; // computed field: total_sent / max(1, total_queued)
  };
};

export type EmailOutboxAlert = {
  ok: boolean;
  reasons: Array<"PENDING_HIGH" | "OLDEST_PENDING_AGE" | "FAILURE_SPIKE">;
  details: Record<string, unknown>;
  severity: "warning" | "critical";
};

// Alert configuration
export type EmailOutboxAlertConfig = {
  pendingThreshold: number;
  oldestPendingMaxAgeMinutes: number;
  failureSpikeThreshold: number;
};

// Email outbox items for detail page
export type EmailOutboxItem = {
  id: string;
  to: string;
  subject: string;
  status: "pending" | "sent" | "failed";
  created_at: string; // ISO
  updated_at: string; // ISO
  error_message?: string; // only for failed
};

export type EmailOutboxItemsResult = {
  items: EmailOutboxItem[];
  total: number;
};

export type EmailOutboxItemsQuery = {
  status?: "pending" | "sent" | "failed";
  limit?: number;
  offset?: number;
};
