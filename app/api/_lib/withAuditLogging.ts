import { ApiHandler } from "./types";

export function withAuditLogging(event: string, h: ApiHandler): ApiHandler {
  return async (req, ctx) => {
    const t0 = Date.now();
    try {
      const res = await h(req, ctx); // ✅ await & return
      // Log success (non-blocking)
      queueMicrotask(() =>
        console.log("[audit.ok]", {
          event,
          ms: Date.now() - t0,
          actor: ctx.me?.email,
        }),
      );
      return res;
    } catch (e: any) {
      queueMicrotask(() =>
        console.warn("[audit.err]", {
          event,
          ms: Date.now() - t0,
          err: String(e?.message || e),
          actor: ctx.me?.email,
        }),
      );
      // rethrow so outer catch can map to JSON
      throw e;
    }
  };
}
