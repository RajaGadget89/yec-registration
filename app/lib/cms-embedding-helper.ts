import {
  generateDocumentEmbedding,
  chunkTextForEmbedding,
} from "./mcp/embeddings";

interface NewsContent {
  headline: string;
  content: string;
}

interface PageContent {
  title: string;
  meta_description?: string;
  sections?: Array<{ content: string }>;
}

interface ActivityContent {
  title: string;
  summary?: string;
  content?: string;
}

interface FAQContent {
  question: string;
  answer: string;
}

type ContentData = NewsContent | PageContent | ActivityContent | FAQContent;

/**
 * Generate and store embeddings for CMS content
 * @param supabase - Supabase client instance
 * @param contentType - Type of content (news, activities, pages, faq)
 * @param itemId - Unique identifier for the content item
 * @param content - Content data to embed
 * @param language - Language of the content
 */
export async function generateAndStoreEmbeddings(
  supabase: any,
  contentType: "news" | "activities" | "pages" | "faq",
  itemId: string,
  content: ContentData,
  language: string,
): Promise<void> {
  try {
    console.log(
      `[EMBEDDING] Generating embeddings for ${contentType} item ${itemId}`,
    );

    // Extract text based on content type
    const textToEmbed = extractTextForEmbedding(contentType, content);

    if (!textToEmbed.trim()) {
      console.log(
        `[EMBEDDING] No text content found for ${contentType} item ${itemId}, skipping embedding generation`,
      );
      return;
    }

    // Chunk if needed (>350 chars)
    const chunks = chunkTextForEmbedding(textToEmbed, 350);
    console.log(
      `[EMBEDDING] Generated ${chunks.length} chunks for ${contentType} item ${itemId}`,
    );

    // Remove existing embeddings first
    await supabase.from("cms_embeddings").delete().eq("item_id", itemId);

    // Generate and store embeddings for each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(
        `[EMBEDDING] Processing chunk ${i + 1}/${chunks.length} for ${contentType} item ${itemId}`,
      );

      const embedding = await generateDocumentEmbedding(chunk);

      await supabase.from("cms_embeddings").insert({
        item_id: itemId,
        content: chunk,
        embedding: JSON.stringify(embedding),
        type: contentType,
        language: language,
        chunk_id: i, // Set the chunk ID (0, 1, 2, etc.)
        is_active: true,
        published_at: new Date().toISOString(),
      });
    }

    console.log(
      `[EMBEDDING] Successfully generated ${chunks.length} embeddings for ${contentType} item ${itemId}`,
    );
  } catch (error) {
    console.error(
      `[EMBEDDING] Failed to generate embeddings for ${contentType} item ${itemId}:`,
      error,
    );
    // Don't throw - let the main operation continue
  }
}

/**
 * Extract text content for embedding based on content type
 */
function extractTextForEmbedding(
  contentType: string,
  content: ContentData,
): string {
  switch (contentType) {
    case "news":
      const news = content as NewsContent;
      return `${news.headline} ${news.content}`.trim();

    case "pages":
      const page = content as PageContent;
      const sectionsText = page.sections?.map((s) => s.content).join(" ") || "";
      return `${page.title} ${page.meta_description || ""} ${sectionsText}`.trim();

    case "activities":
      const activity = content as ActivityContent;
      return `${activity.title} ${activity.summary || ""} ${activity.content || ""}`.trim();

    case "faq":
      const faq = content as FAQContent;
      return `${faq.question} ${faq.answer}`.trim();

    default:
      return "";
  }
}

/**
 * Remove all embeddings for a content item
 * @param supabase - Supabase client instance
 * @param itemId - Unique identifier for the content item
 */
export async function removeEmbeddings(
  supabase: any,
  itemId: string,
): Promise<void> {
  try {
    console.log(`[EMBEDDING] Removing embeddings for item ${itemId}`);

    const { error } = await supabase
      .from("cms_embeddings")
      .delete()
      .eq("item_id", itemId);

    if (error) {
      console.error(
        `[EMBEDDING] Failed to remove embeddings for item ${itemId}:`,
        error,
      );
    } else {
      console.log(
        `[EMBEDDING] Successfully removed embeddings for item ${itemId}`,
      );
    }
  } catch (error) {
    console.error(
      `[EMBEDDING] Error removing embeddings for item ${itemId}:`,
      error,
    );
    // Don't throw - let the main operation continue
  }
}

/**
 * Generate and store embeddings for FAQ items (special handling for language inheritance)
 * @param supabase - Supabase client instance
 * @param itemId - FAQ item ID
 * @param content - FAQ content data
 */
export async function generateAndStoreFAQEmbeddings(
  supabase: any,
  itemId: string,
  content: FAQContent,
): Promise<void> {
  try {
    console.log(`[EMBEDDING] Generating embeddings for FAQ item ${itemId}`);

    // Get the group language for this FAQ item
    const { data: faqItem, error: itemError } = await supabase
      .from("cms_faq_items")
      .select("group_id")
      .eq("id", itemId)
      .single();

    if (itemError || !faqItem) {
      console.error(
        `[EMBEDDING] Failed to fetch FAQ item ${itemId}:`,
        itemError,
      );
      return;
    }

    const { data: faqGroup, error: groupError } = await supabase
      .from("cms_faq_groups")
      .select("language")
      .eq("id", faqItem.group_id)
      .single();

    if (groupError || !faqGroup) {
      console.error(
        `[EMBEDDING] Failed to fetch FAQ group for item ${itemId}:`,
        groupError,
      );
      return;
    }

    const language = faqGroup.language || "th";
    console.log(
      `[EMBEDDING] FAQ item ${itemId} inherits language '${language}' from group`,
    );

    // Use the regular embedding function with the group's language
    await generateAndStoreEmbeddings(
      supabase,
      "faq",
      itemId,
      content,
      language,
    );
  } catch (error) {
    console.error(
      `[EMBEDDING] Failed to generate FAQ embeddings for item ${itemId}:`,
      error,
    );
    // Don't throw - let the main operation continue
  }
}

/**
 * Remove embeddings for multiple items (useful for FAQ group deletion)
 * @param supabase - Supabase client instance
 * @param itemIds - Array of item IDs to remove embeddings for
 */
export async function removeEmbeddingsBatch(
  supabase: any,
  itemIds: string[],
): Promise<void> {
  if (itemIds.length === 0) return;

  try {
    console.log(`[EMBEDDING] Removing embeddings for ${itemIds.length} items`);

    const { error } = await supabase
      .from("cms_embeddings")
      .delete()
      .in("item_id", itemIds);

    if (error) {
      console.error(`[EMBEDDING] Failed to remove batch embeddings:`, error);
    } else {
      console.log(
        `[EMBEDDING] Successfully removed embeddings for ${itemIds.length} items`,
      );
    }
  } catch (error) {
    console.error(`[EMBEDDING] Error removing batch embeddings:`, error);
    // Don't throw - let the main operation continue
  }
}
