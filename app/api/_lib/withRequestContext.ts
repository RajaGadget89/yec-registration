import { ApiHandler } from "./types";

export function withRequestContext(h: ApiHandler): ApiHandler {
  return async (req, ctx) => {
    // Add request-scoped context here if any
    return await h(req, ctx); // ✅ ensure the inner result is returned
  };
}
