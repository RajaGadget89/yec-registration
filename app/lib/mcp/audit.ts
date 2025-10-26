import { logAccess } from "../audit/auditClient";

interface AuditMeta {
  endpoint: string;
  method: string;
  apiKeyType: "public" | "admin";
  query?: Record<string, unknown>;
  status: number;
  responseBytes?: number;
  requestId: string;
}

export async function auditMCPAccess(meta: AuditMeta) {
  await logAccess({
    action: "mcp.api.access",
    method: meta.method,
    resource: meta.endpoint,
    result: String(meta.status),
    request_id: meta.requestId,
    src_ip: undefined,
    user_agent: undefined,
    latency_ms: undefined,
    meta: {
      api_key_type: meta.apiKeyType,
      response_bytes: meta.responseBytes,
      query: meta.query,
    },
  });
}
