import { NextRequest, NextResponse } from "next/server";
import { validateMCPApiKey } from "../../../../lib/mcp/auth";
import { rateLimit } from "../../../../lib/mcp/rate-limiter";
import { mcpContentRegistry } from "../../../../lib/mcp/content-registry";
import { auditMCPAccess } from "../../../../lib/mcp/audit";
import { getCache, setCache } from "../../../../lib/mcp/cache";

/**
 * MCP Comprehensive Endpoint - COMPLETE DATA VERSION
 * Aggregates data from all CMS APIs to provide comprehensive content
 * This replaces the old direct database access approach
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    // API key validation
    const auth = await validateMCPApiKey(request.headers);
    if (!auth.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const language = url.searchParams.get("language") || "all";
    const search = url.searchParams.get("search") || "";
    const include_metadata =
      url.searchParams.get("include_metadata") === "true";
    const include_related = url.searchParams.get("include_related") === "true";
    const debug =
      url.searchParams.get("debug") === "1" ||
      url.searchParams.get("debug") === "true";
    const typesParam = url.searchParams.get("types"); // comma-separated list

    // Rate limit by API key type
    const rl = rateLimit(`mcp:public:comprehensive:${auth.type || "public"}`);
    if (!rl.allowed) {
      const res = NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
      res.headers.set(
        "X-RateLimit-Limit",
        String(process.env.MCP_RATE_LIMIT_MAX_REQUESTS || 1000),
      );
      res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
      res.headers.set("X-RateLimit-Reset", String(rl.reset));
      return res;
    }

    // Respect MCP content registry (exposure rules)
    const enabledTypes = (
      await mcpContentRegistry.getEnabledTypes("public")
    ).map((t: any) => t.type_key);
    const requestedTypes = typesParam
      ? typesParam
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : enabledTypes;
    const contentTypes = requestedTypes.filter((t) => enabledTypes.includes(t));

    // Cache key respects query + content types
    const cacheKey = `mcp:public:comprehensive:${contentTypes.join(",")}:lang=${language}:q=${search}:meta=${include_metadata}:rel=${include_related}`;
    const cached = getCache<any>(cacheKey);
    if (!debug && cached) {
      const cachedRes = NextResponse.json(cached);
      cachedRes.headers.set("X-Cache", "HIT");
      return cachedRes;
    }

    // Helper to robustly fetch JSON from internal APIs with proper headers and timeouts
    const baseUrl = `${url.protocol}//${url.host}`;
    const authHeader = request.headers.get("authorization") || "";

    // Prefer in-process handler invocation to avoid network fetch failures
    const callRoute = async (type: string, pathname: string) => {
      try {
        // Dynamically import the route handler
        const mod = await (async () => {
          switch (type) {
            case "faq":
              return await import("../../../../api/cms/faq/route");
            case "activities":
              return await import("../../../../api/cms/activities/route");
            case "news":
              return await import("../../../../api/cms/news/route");
            case "pages":
              return await import("../../../../api/cms/pages/route");
            default:
              throw new Error(`unknown type ${type}`);
          }
        })();

        const reqUrl = `${baseUrl}${pathname}`;
        const nextReq = new NextRequest(reqUrl, {
          method: "GET",
          headers: authHeader
            ? { Authorization: authHeader, Accept: "application/json" }
            : { Accept: "application/json" },
        });
        const res = await mod.GET(nextReq as any);
        if (!res.ok) {
          const text = await res.text();
          return {
            type,
            data: [],
            error: `status ${res.status}: ${text?.slice(0, 200)}`,
          };
        }
        try {
          const json = await res.json();
          return { type, data: json.data || [], meta: json.meta };
        } catch (e: any) {
          return {
            type,
            data: [],
            error: `invalid json: ${e?.message || "parse error"}`,
          };
        }
      } catch (e: any) {
        return {
          type,
          data: [],
          error: e?.message || "handler failed",
          _stack: e?.stack,
        } as any;
      }
    };

    // Fetch data from all CMS APIs in parallel
    const apiCalls: Promise<any>[] = [];
    if (contentTypes.includes("faq"))
      apiCalls.push(
        callRoute(
          "faq",
          `/api/cms/faq?language=${language}&search=${search}&include_metadata=${include_metadata}`,
        ),
      );
    if (contentTypes.includes("activities"))
      apiCalls.push(
        callRoute(
          "activities",
          `/api/cms/activities?language=${language}&search=${search}&include_metadata=${include_metadata}&include_related=${include_related}`,
        ),
      );
    if (contentTypes.includes("news"))
      apiCalls.push(
        callRoute(
          "news",
          `/api/cms/news?language=${language}&search=${search}&include_metadata=${include_metadata}&include_related=${include_related}`,
        ),
      );
    if (contentTypes.includes("pages"))
      apiCalls.push(
        callRoute(
          "pages",
          `/api/cms/pages?language=${language}&search=${search}&include_metadata=${include_metadata}`,
        ),
      );

    // Wait for all API calls to complete
    const results = await Promise.all(apiCalls);

    // Build comprehensive response
    const response: any = {
      system: {
        operational: true,
        registration_open: false, // Could be fetched from system settings
        event_dates: { start: null, end: null }, // Could be fetched from event settings
        statistics: { total_registered: null }, // Could be fetched from registration system
        available_content_types: contentTypes,
        api_version: "2.0.0",
        data_completeness: "comprehensive",
      },
      content: {
        faq: results.find((r) => r.type === "faq")?.data || [],
        activities: results.find((r) => r.type === "activities")?.data || [],
        news: results.find((r) => r.type === "news")?.data || [],
        pages: results.find((r) => r.type === "pages")?.data || [],
      },
      metadata: {
        total_items: results.reduce(
          (sum, result) => sum + (result.data?.length || 0),
          0,
        ),
        content_breakdown: {
          faq: results.find((r) => r.type === "faq")?.data?.length || 0,
          activities:
            results.find((r) => r.type === "activities")?.data?.length || 0,
          news: results.find((r) => r.type === "news")?.data?.length || 0,
          pages: results.find((r) => r.type === "pages")?.data?.length || 0,
        },
        language,
        search,
        include_metadata,
        include_related,
        timestamp: new Date().toISOString(),
        data_quality: "high", // Could be calculated based on completeness
        freshness: "current", // Could be calculated based on last update times
      },
      // Add detailed metadata for each content type if requested
      ...(include_metadata && {
        detailed_metadata: {
          faq: results.find((r) => r.type === "faq")?.meta || {},
          activities: results.find((r) => r.type === "activities")?.meta || {},
          news: results.find((r) => r.type === "news")?.meta || {},
          pages: results.find((r) => r.type === "pages")?.meta || {},
        },
      }),
      // Add any errors that occurred during fetching
      errors: results
        .filter((r) => (r as any).error)
        .map((r) => ({ type: (r as any).type, error: (r as any).error })),
    };

    if (debug) {
      response.debug = {
        baseUrl,
        forwardedAuthHeader: !!authHeader,
        headerPrefix: authHeader ? authHeader.split(" ")[0] : null,
        errorsDetailed: results
          .filter((r) => (r as any).error)
          .map((r) => ({
            type: (r as any).type,
            error: (r as any).error,
            stack: (r as any)._stack,
          })),
      };
    }

    // Cache for 60s (skip when debug)
    if (!debug) setCache(cacheKey, response, 60);

    const res = NextResponse.json(response);
    if (!debug) res.headers.set("X-Cache", "MISS");
    res.headers.set("X-Content-Types", contentTypes.join(","));

    // Audit access (non-blocking)
    try {
      await auditMCPAccess({
        endpoint: "/api/mcp/public/comprehensive",
        method: "GET",
        apiKeyType: auth.type || "public",
        status: 200,
        responseBytes: JSON.stringify(response).length,
        requestId,
      });
    } catch {}
    return res;
  } catch (error) {
    console.error("MCP Comprehensive API Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
