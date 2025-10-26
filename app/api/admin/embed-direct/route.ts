import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";
import { validateMCPApiKey } from "../../../lib/mcp/auth";

/**
 * Direct embedding trigger (no jobs table needed)
 * POST /api/admin/embed-direct
 * Body: { type?, limit? }
 */
export async function POST(request: NextRequest) {
  try {
    // Validate admin API key
    const auth = await validateMCPApiKey(request.headers);
    if (!auth.ok || auth.type !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, limit = 10 } = body;

    const supabase = getSupabaseServiceClient();

    console.log(`🚀 Direct embedding for ${type || "all"} (limit: ${limit})`);

    // Real embedding function with document prefix
    // const { generateDocumentEmbedding } = await import("../../../lib/mcp/embeddings");

    // function stripHtml(html: string): string {
    //   return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    // }

    // function chunkText(text: string, maxTokens: number = 1000): string[] {
    //   const words = text.split(/\s+/);
    //   const chunks: string[] = [];
    //   let currentChunk = '';
    //
    //   for (const word of words) {
    //     if ((currentChunk + ' ' + word).length > maxTokens && currentChunk.length > 0) {
    //       chunks.push(currentChunk.trim());
    //       currentChunk = word;
    //     } else {
    //       currentChunk += (currentChunk ? ' ' : '') + word;
    //     }
    //   }
    //
    //   if (currentChunk.trim()) {
    //     chunks.push(currentChunk.trim());
    //   }
    //
    //   return chunks;
    // }

    const results = { processed: 0, errors: 0 };

    // Process based on type
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
              .limit(limit);

            for (const item of news || []) {
              const content = `${item.headline}\n\n${item.content}`;
              await processItem(
                supabase,
                "news",
                item.id,
                content,
                item.language,
                item.published_at,
                item.is_active,
              );
              results.processed++;
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
              .limit(limit);

            for (const item of activities || []) {
              const content = `${item.title}\n\n${item.summary || ""}\n\n${item.content}`;
              await processItem(
                supabase,
                "activities",
                item.id,
                content,
                item.language,
                item.published_at,
                item.is_active,
              );
              results.processed++;
            }
            break;

          case "pages":
            const { data: pages } = await supabase
              .from("cms_pages")
              .select(
                "id, title, meta_description, language, updated_at, is_active",
              )
              .eq("is_active", true)
              .limit(limit);

            for (const item of pages || []) {
              const content = `${item.title}\n\n${item.meta_description || ""}`;
              await processItem(
                supabase,
                "pages",
                item.id,
                content,
                item.language,
                item.updated_at,
                item.is_active,
              );
              results.processed++;
            }
            break;

          case "faq":
            const { data: faqItems } = await supabase
              .from("cms_faq_items")
              .select("id, question, answer, group_id, is_active")
              .eq("is_active", true)
              .limit(limit);

            for (const item of faqItems || []) {
              // Get group info
              const { data: group } = await supabase
                .from("cms_faq_groups")
                .select("published_at, language")
                .eq("id", item.group_id)
                .single();

              const content = `${item.question}\n\n${item.answer}`;
              await processItem(
                supabase,
                "faq",
                item.id,
                content,
                group?.language || "en",
                group?.published_at,
                item.is_active,
              );
              results.processed++;
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
      message: "Direct embedding completed",
      results,
    });
  } catch (error) {
    console.error("Direct embed error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

async function processItem(
  supabase: any,
  type: string,
  itemId: string,
  content: string,
  language: string,
  publishedAt: string | null,
  isActive: boolean,
) {
  const { generateDocumentEmbedding } = await import(
    "../../../lib/mcp/embeddings"
  );

  function stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function chunkText(text: string, maxTokens: number = 1000): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let currentChunk = "";

    for (const word of words) {
      if (
        (currentChunk + " " + word).length > maxTokens &&
        currentChunk.length > 0
      ) {
        chunks.push(currentChunk.trim());
        currentChunk = word;
      } else {
        currentChunk += (currentChunk ? " " : "") + word;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  const chunks = chunkText(stripHtml(content));
  console.log(
    `[EMBED-DIRECT] Processing item ${itemId} (${type}): ${chunks.length} chunks`,
  );

  // Delete existing embeddings for this item
  console.log(
    `[EMBED-DIRECT] Deleting existing embeddings for item: ${itemId}`,
  );
  const { error: deleteError } = await supabase
    .from("cms_embeddings")
    .delete()
    .eq("item_id", itemId);

  if (deleteError) {
    console.error(`[EMBED-DIRECT] Delete error:`, deleteError);
  } else {
    console.log(`[EMBED-DIRECT] Existing embeddings deleted successfully`);
  }

  // Generate embeddings for each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (chunk.length < 3) {
      console.log(
        `[EMBED-DIRECT] Skipping chunk ${i} (too short: ${chunk.length} chars)`,
      );
      continue;
    }

    console.log(
      `[EMBED-DIRECT] Processing chunk ${i}/${chunks.length} (${chunk.length} chars)`,
    );

    try {
      const embedding = await generateDocumentEmbedding(chunk);
      console.log(
        `[EMBED-DIRECT] Generated embedding for chunk ${i}, dimensions: ${embedding.length}`,
      );

      const { error: insertError } = await supabase
        .from("cms_embeddings")
        .insert({
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

      if (insertError) {
        console.error(
          `[EMBED-DIRECT] Insert error for chunk ${i}:`,
          insertError,
        );
      } else {
        console.log(`[EMBED-DIRECT] Successfully inserted chunk ${i}`);
      }
    } catch (error) {
      console.error(`[EMBED-DIRECT] Error processing chunk ${i}:`, error);
    }
  }

  console.log(`[EMBED-DIRECT] Completed processing item: ${itemId}`);
}
