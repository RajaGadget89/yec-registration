import { NextRequest, NextResponse } from "next/server";
import { validateMCPApiKey } from "../../../../lib/mcp/auth";
import { rateLimit } from "../../../../lib/mcp/rate-limiter";
import { mcpContentRegistry } from "../../../../lib/mcp/content-registry";
import { auditMCPAccess } from "../../../../lib/mcp/audit";
import { getCache, setCache } from "../../../../lib/mcp/cache";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";

type Hit = { type: string; id: string; score: number; highlights?: string[] };

// Generate 768-dimensional embedding for vector search
async function generateQueryEmbedding(query: string): Promise<number[]> {
  // Use the new query embedding function with "query:" prefix
  const { generateQueryEmbedding: generateQueryEmb } = await import(
    "../../../../lib/mcp/embeddings"
  );
  return await generateQueryEmb(query);
}

async function _performVectorSearch(
  supabase: any,
  queryEmbedding: number[],
  contentTypes: string[],
  language: string,
  topK: number,
): Promise<Hit[]> {
  const hits: Hit[] = [];

  for (const type of contentTypes) {
    try {
      // Use raw SQL for proper vector similarity search
      const { data, error } = await supabase.rpc("search_embeddings", {
        query_embedding: queryEmbedding,
        content_type: type,
        language_filter: language === "all" ? null : language,
        match_threshold: 0.5,
        match_count: topK,
      });

      if (error) {
        console.error(`Vector search error for ${type}:`, error);
        continue;
      }

      (data || []).forEach((row: any) => {
        hits.push({
          type: row.type,
          id: row.item_id,
          score: row.similarity || 0.8,
          highlights: [row.content.substring(0, 200) + "..."],
        });
      });
    } catch (_error) {
      console.error(`Vector search error for ${type}:`, _error);
      continue;
    }
  }

  return hits;
}

async function performKeywordSearch(
  supabase: any,
  q: string,
  contentTypes: string[],
  language: string,
  topK: number,
): Promise<Hit[]> {
  const hits: Hit[] = [];

  // FAQ
  if (contentTypes.includes("faq")) {
    console.log("Searching FAQ for query:", q);
    try {
      // First get active FAQ groups
      let groupQuery = supabase
        .from("cms_faq_groups")
        .select("id")
        .eq("is_active", true)
        .not("published_at", "is", null);

      if (language !== "all") {
        groupQuery = groupQuery.eq("language", language);
      }

      const { data: groups } = await groupQuery;
      console.log("FAQ groups found:", groups?.length || 0);

      if (groups && groups.length > 0) {
        const groupIds = groups.map((g: any) => g.id);

        // Then search FAQ items within those groups
        let faqQuery = supabase
          .from("cms_faq_items")
          .select("id, question, answer, language, item_order")
          .eq("is_active", true)
          .in("group_id", groupIds);

        if (language !== "all") {
          faqQuery = faqQuery.eq("language", language);
        }

        const { data, error } = await faqQuery
          .or(`question.ilike.%${q}%,answer.ilike.%${q}%`)
          .limit(topK);
        console.log("FAQ search result:", { data: data?.length || 0, error });
        (data || []).forEach((row: any) =>
          hits.push({
            type: "faq",
            id: row.id,
            score: 0.6,
            highlights: [row.question],
          }),
        );
      }
    } catch (_error) {
      console.error("FAQ search error:", _error);
    }
  }

  // Activities
  if (contentTypes.includes("activities")) {
    console.log("Searching Activities for query:", q);
    let aQuery = supabase
      .from("cms_activity_cards")
      .select("id, title, description, language")
      .eq("is_active", true);
    if (language !== "all") aQuery = aQuery.eq("language", language);
    const { data, error } = await aQuery
      .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
      .limit(topK);
    console.log("Activities search result:", {
      data: data?.length || 0,
      error,
    });
    (data || []).forEach((row: any) =>
      hits.push({
        type: "activities",
        id: row.id,
        score: 0.6,
        highlights: [row.title],
      }),
    );
  }

  // News
  if (contentTypes.includes("news")) {
    console.log("Searching News for query:", q);
    let nQuery = supabase
      .from("cms_news")
      .select("id, headline, content, language")
      .eq("is_active", true);
    if (language !== "all") nQuery = nQuery.eq("language", language);
    const { data, error } = await nQuery
      .or(`headline.ilike.%${q}%,content.ilike.%${q}%`)
      .limit(topK);
    console.log("News search result:", { data: data?.length || 0, error });
    (data || []).forEach((row: any) =>
      hits.push({
        type: "news",
        id: row.id,
        score: 0.7,
        highlights: [row.headline],
      }),
    );
  }

  // Pages
  if (contentTypes.includes("pages")) {
    console.log("Searching Pages for query:", q);
    let pQuery = supabase
      .from("cms_pages")
      .select("id, title, meta_description, language")
      .eq("is_active", true);
    if (language !== "all") pQuery = pQuery.eq("language", language);
    const { data, error } = await pQuery
      .or(`title.ilike.%${q}%,meta_description.ilike.%${q}%`)
      .limit(topK);
    console.log("Pages search result:", { data: data?.length || 0, error });
    (data || []).forEach((row: any) =>
      hits.push({
        type: "pages",
        id: row.id,
        score: 0.5,
        highlights: [row.title],
      }),
    );
  }

  return hits;
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const auth = await validateMCPApiKey(request.headers);
    if (!auth.ok)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();
    const language = url.searchParams.get("language") || "all";
    const typesParam = url.searchParams.get("types");
    const topK = Math.min(
      parseInt(url.searchParams.get("topK") || "5", 10) || 5,
      20,
    );

    const rl = rateLimit(`mcp:public:search:${auth.type || "public"}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    // Resolve content types from registry
    const enabled = await mcpContentRegistry.getEnabledTypes("public");
    const enabledTypes: string[] = enabled.map((t: any) => t.type_key);
    const requestedTypes = typesParam
      ? typesParam
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : enabledTypes;
    const contentTypes = requestedTypes.filter((t) => enabledTypes.includes(t));

    const cacheKey = `mcp:public:search:${contentTypes.join(",")}:lang=${language}:q=${q}:k=${topK}`;
    const cached = getCache<any>(cacheKey);
    if (cached) {
      const res = NextResponse.json(cached);
      res.headers.set("X-Cache", "HIT");
      return res;
    }

    const supabase = getSupabaseServiceClient();
    const hits: Hit[] = [];

    // Use vector search for semantic similarity
    if (q.length > 0) {
      console.log("\n" + "═".repeat(70));
      console.log("🔍 NEW SEARCH REQUEST");
      console.log("═".repeat(70));
      console.log(`Query: "${q}"`);
      console.log(`Types: ${contentTypes.join(", ")}`);
      console.log(`Language: ${language}`);
      console.log(`TopK: ${topK}`);
      console.log(`Has Thai characters: ${/[\u0E00-\u0E7F]/.test(q)}`);
      console.log(
        `Query length: ${q.length} chars, ${Buffer.from(q).length} bytes`,
      );

      try {
        // Generate query embedding
        console.log("\n📊 GENERATING QUERY EMBEDDING:");
        const startTime = Date.now();

        const queryEmbedding = await generateQueryEmbedding(q);

        const embedTime = Date.now() - startTime;
        console.log(`✅ Embedding generated in ${embedTime}ms`);
        console.log(`   Dimensions: ${queryEmbedding.length}`);
        console.log(
          `   First 5 values: [${queryEmbedding
            .slice(0, 5)
            .map((v) => v.toFixed(4))
            .join(", ")}]`,
        );
        console.log(
          `   Last 5 values: [${queryEmbedding
            .slice(-5)
            .map((v) => v.toFixed(4))
            .join(", ")}]`,
        );

        // Validate embedding
        const allZeros = queryEmbedding.every((v) => v === 0);
        const hasNaN = queryEmbedding.some((v) => isNaN(v));
        const hasInfinity = queryEmbedding.some((v) => !isFinite(v));
        const min = Math.min(...queryEmbedding);
        const max = Math.max(...queryEmbedding);
        const mean =
          queryEmbedding.reduce((a, b) => a + b, 0) / queryEmbedding.length;

        console.log(`   All zeros: ${allZeros ? "❌ YES" : "✅ NO"}`);
        console.log(`   Has NaN: ${hasNaN ? "❌ YES" : "✅ NO"}`);
        console.log(`   Has Infinity: ${hasInfinity ? "❌ YES" : "✅ NO"}`);
        console.log(
          `   Min: ${min.toFixed(4)}, Max: ${max.toFixed(4)}, Mean: ${mean.toFixed(4)}`,
        );

        if (allZeros || hasNaN || hasInfinity) {
          console.log("   ⚠️  WARNING: Embedding has problems!");
        }

        // Perform vector similarity search with very low threshold for debugging
        console.log("\n🔎 PERFORMING VECTOR SEARCH:");
        console.log(`   Content types: [${contentTypes.join(", ")}]`);
        console.log(
          `   Language filter: ${language === "all" ? "none (searching all)" : language}`,
        );

        const searchStartTime = Date.now();

        // Use threshold 0.0 to get ALL results for debugging
        const { data: allResults, error: searchError } = await supabase.rpc(
          "search_embeddings",
          {
            query_embedding: queryEmbedding,
            content_type: contentTypes.join(","),
            language_filter: language === "all" ? null : language,
            match_threshold: 0.0, // Get everything
            match_count: 100, // Get more results
          },
        );

        const searchTime = Date.now() - searchStartTime;
        console.log(`✅ Search completed in ${searchTime}ms`);

        if (searchError) {
          console.error("❌ Search error:", searchError);
          throw searchError;
        }

        console.log(`📊 Total results found: ${allResults?.length || 0}`);

        if (!allResults || allResults.length === 0) {
          console.log("⚠️  NO RESULTS FOUND AT ALL!");
          console.log("This could mean:");
          console.log("  1. Database has no content matching the filters");
          console.log("  2. RPC function is not working correctly");
          console.log("  3. Embedding dimensions mismatch");

          return NextResponse.json({
            hits: [],
            meta: {
              q,
              language,
              types: contentTypes,
              topK,
              threshold: 0.3,
              totalFound: 0,
              afterThreshold: 0,
              debug: {
                embeddingDimensions: queryEmbedding.length,
                searchTimeMs: searchTime,
                hasThaiChars: /[\u0E00-\u0E7F]/.test(q),
              },
            },
          });
        }

        // Analyze all results
        console.log("\n📋 ANALYZING ALL RESULTS:");

        // Find Thai content
        const thaiResults = allResults.filter(
          (hit: any) => hit.content && /[\u0E00-\u0E7F]/.test(hit.content),
        );
        console.log(`   Thai results: ${thaiResults.length}`);

        // Find English content
        const englishResults = allResults.filter(
          (hit: any) =>
            hit.content &&
            /[a-zA-Z]/.test(hit.content) &&
            !/[\u0E00-\u0E7F]/.test(hit.content),
        );
        console.log(`   English results: ${englishResults.length}`);

        // Sort by similarity
        allResults.sort(
          (a: any, b: any) => (b.similarity || 0) - (a.similarity || 0),
        );

        // Add full_url to each hit based on content type
        const hitsWithUrls = allResults.map((hit: any) => {
          const baseUrl =
            process.env.NEXT_PUBLIC_BASE_URL || "https://yec-registration.com";
          let fullUrl = "";

          switch (hit.type) {
            case "news":
              fullUrl = `${baseUrl}/news/${hit.item_id}`;
              break;
            case "activities":
              // For activities, we need to get the slug from the database
              // For now, use the item_id as fallback
              fullUrl = `${baseUrl}/activities/${hit.item_id}`;
              break;
            case "pages":
              // For pages, we need to get the slug from the database
              // For now, use the item_id as fallback
              fullUrl = `${baseUrl}/pages/${hit.item_id}`;
              break;
            case "faq":
              // For FAQ, we need to get the group and item slugs from the database
              // For now, use the item_id as fallback
              fullUrl = `${baseUrl}/faq/${hit.item_id}`;
              break;
            default:
              fullUrl = `${baseUrl}/${hit.type}/${hit.item_id}`;
          }

          return {
            ...hit,
            full_url: fullUrl,
          };
        });

        // Show top 10 results
        console.log("\n🔝 TOP 10 RESULTS (regardless of language):");
        hitsWithUrls.slice(0, 10).forEach((hit: any, i: number) => {
          const isThai = /[\u0E00-\u0E7F]/.test(hit.content || "");
          const lang = isThai ? "🇹🇭" : "🇬🇧";
          console.log(
            `   ${i + 1}. ${lang} Score: ${(hit.similarity || 0).toFixed(4)} | Type: ${hit.type} | Lang: ${hit.language}`,
          );
          console.log(`      "${(hit.content || "").substring(0, 80)}..."`);
          console.log(`      URL: ${hit.full_url}`);
        });

        // Show top Thai results specifically
        if (thaiResults.length > 0) {
          console.log("\n🇹🇭 TOP 5 THAI RESULTS:");
          thaiResults.slice(0, 5).forEach((hit: any, i: number) => {
            console.log(
              `   ${i + 1}. Score: ${(hit.similarity || 0).toFixed(4)} | Type: ${hit.type}`,
            );
            console.log(`      "${(hit.content || "").substring(0, 80)}..."`);
          });

          const topThaiScore = thaiResults[0].similarity || 0;
          console.log(`\n   Highest Thai score: ${topThaiScore.toFixed(4)}`);

          if (topThaiScore < 0.1) {
            console.log("   ❌ CRITICAL: Thai scores are extremely low!");
            console.log(
              "   This suggests the model is not working for Thai queries.",
            );
          } else if (topThaiScore < 0.3) {
            console.log("   ⚠️  WARNING: Thai scores are low.");
            console.log(
              "   Consider lowering the threshold or checking the model.",
            );
          } else if (topThaiScore < 0.5) {
            console.log("   ⚠️  CAUTION: Thai scores are moderate.");
            console.log("   You may need to lower the threshold to 0.2-0.3.");
          } else {
            console.log("   ✅ Thai scores look good!");
          }
        } else {
          console.log("\n⚠️  NO THAI RESULTS FOUND");
          console.log("   This could mean:");
          console.log("   1. No Thai content exists in the database");
          console.log("   2. Thai content was not properly indexed");
        }

        // Apply actual threshold
        const actualThreshold = 0.3;
        console.log(`\n✂️  APPLYING THRESHOLD: ${actualThreshold}`);

        const filteredHits = hitsWithUrls
          .filter((hit: any) => (hit.similarity || 0) >= actualThreshold)
          .slice(0, topK);

        console.log(`   Results above threshold: ${filteredHits.length}`);
        console.log(
          `   Final results returned: ${Math.min(filteredHits.length, topK)}`,
        );

        if (filteredHits.length === 0 && hitsWithUrls.length > 0) {
          const highestScore = hitsWithUrls[0].similarity || 0;
          console.log(`\n⚠️  NO RESULTS ABOVE THRESHOLD!`);
          console.log(`   Highest score was: ${highestScore.toFixed(4)}`);
          console.log(`   Current threshold: ${actualThreshold}`);
          console.log(
            `   Consider lowering threshold to: ${Math.max(highestScore * 0.8, 0.1).toFixed(2)}`,
          );
        }

        console.log("═".repeat(70) + "\n");

        hits.push(...filteredHits);
      } catch (_error) {
        console.error("Vector search failed:", _error);

        // Fallback to keyword search if vector search fails
        console.log("Falling back to keyword search...");
        const keywordHits = await performKeywordSearch(
          supabase,
          q,
          contentTypes,
          language,
          topK,
        );
        hits.push(...keywordHits);
      }
    }

    // Sort by heuristic score and truncate
    const ordered = hits.sort((a, b) => b.score - a.score).slice(0, topK);

    const response = {
      hits: ordered,
      meta: { q, language, types: contentTypes, topK },
    };
    setCache(cacheKey, response, 60);
    const res = NextResponse.json(response);
    res.headers.set("X-Cache", "MISS");

    try {
      await auditMCPAccess({
        endpoint: "/api/mcp/public/search",
        method: "GET",
        apiKeyType: auth.type || "public",
        status: 200,
        responseBytes: JSON.stringify(response).length,
        requestId,
      });
    } catch {}

    return res;
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
