import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";
import { validateMCPApiKey } from "../../../lib/mcp/auth";

/**
 * Admin endpoint to trigger embedding generation
 * POST /api/admin/embed
 * Body: { type?: string, fullReindex?: boolean, limit?: number }
 */
export async function POST(request: NextRequest) {
  try {
    // Validate admin API key
    const auth = await validateMCPApiKey(request.headers);
    if (!auth.ok || auth.type !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, fullReindex = false, limit } = body;

    console.log("🚀 Starting embedding generation via API...");
    console.log(
      `Type: ${type || "all"}, Full reindex: ${fullReindex}, Limit: ${limit || "unlimited"}`,
    );

    const supabase = getSupabaseServiceClient();

    if (fullReindex) {
      console.log("🗑️ Clearing existing embeddings...");
      await supabase
        .from("cms_embeddings")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
    }

    const results = { processed: 0, errors: 0 };

    // Real embedding function using Transformers.js (768D)
    const { generateEmbedding768, chunkTextForEmbedding } = await import(
      "../../../lib/mcp/embeddings"
    );

    function stripHtml(html: string): string {
      return html
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    const chunkText = (text: string) => chunkTextForEmbedding(text, 350);

    async function embedContent(
      type: string,
      itemId: string,
      content: string,
      language: string,
      publishedAt: string | null,
      isActive: boolean,
    ) {
      const chunks = chunkText(stripHtml(content));

      // Delete existing embeddings for this item
      await supabase
        .from("cms_embeddings")
        .delete()
        .eq("type", type)
        .eq("item_id", itemId);

      // Generate embeddings for each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (chunk.length < 10) continue;

        try {
          const embedding = await generateEmbedding768(chunk);

          await supabase.from("cms_embeddings").insert({
            type,
            item_id: itemId,
            language,
            chunk_id: i,
            content: chunk,
            embedding: `[${embedding.join(",")}]`,
            published_at: publishedAt,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          });

          results.processed++;
        } catch (error) {
          console.error(
            `Failed to embed ${type} ${itemId} chunk ${i + 1}:`,
            error,
          );
          results.errors++;
        }
      }
    }

    const types = type ? [type] : ["news", "activities", "pages", "faq"];

    for (const contentType of types) {
      try {
        switch (contentType) {
          case "news":
            const { data: news } = await supabase
              .from("cms_news")
              .select(
                "id, headline, content, language, published_at, is_active",
              )
              .eq("is_active", true)
              .not("published_at", "is", null)
              .limit(limit || 1000);

            for (const item of news || []) {
              const content = `${item.headline}\n\n${item.content}`;
              await embedContent(
                "news",
                item.id,
                content,
                item.language,
                item.published_at,
                item.is_active,
              );
            }
            break;

          case "activities":
            const { data: activities } = await supabase
              .from("cms_activity_cards")
              .select(
                "id, title, summary, content, language, published_at, is_active",
              )
              .eq("is_active", true)
              .not("published_at", "is", null)
              .limit(limit || 1000);

            for (const item of activities || []) {
              const content = `${item.title}\n\n${item.summary || ""}\n\n${item.content}`;
              await embedContent(
                "activities",
                item.id,
                content,
                item.language,
                item.published_at,
                item.is_active,
              );
            }
            break;

          case "pages":
            const { data: pages } = await supabase
              .from("cms_pages")
              .select(
                "id, title, meta_description, language, updated_at, is_active",
              )
              .eq("is_active", true)
              .limit(limit || 1000);

            for (const item of pages || []) {
              const content = `${item.title}\n\n${item.meta_description || ""}`;
              await embedContent(
                "pages",
                item.id,
                content,
                item.language,
                item.updated_at,
                item.is_active,
              );
            }
            break;

          case "faq":
            const { data: groups } = await supabase
              .from("cms_faq_groups")
              .select(
                "id, title, description, language, published_at, is_active",
              )
              .eq("is_active", true)
              .not("published_at", "is", null)
              .limit(limit || 1000);

            for (const group of groups || []) {
              const { data: items } = await supabase
                .from("cms_faq_items")
                .select("id, question, answer, language, is_active")
                .eq("group_id", group.id)
                .eq("is_active", true);

              for (const item of items || []) {
                const content = `${item.question}\n\n${item.answer}`;
                await embedContent(
                  "faq",
                  item.id,
                  content,
                  item.language,
                  group.published_at,
                  item.is_active,
                );
              }
            }
            break;
        }
      } catch (error) {
        console.error(`Error processing ${contentType}:`, error);
        results.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Embedding generation completed",
      results,
    });
  } catch (error) {
    console.error("Embedding API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
