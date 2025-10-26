import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";
import { validateMCPApiKey } from "../../../lib/mcp/auth";

/**
 * Manual embedding trigger for immediate processing
 * POST /api/admin/embed-now
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
    const { limit = 10 } = body;

    const supabase = getSupabaseServiceClient();

    // Get pending jobs
    console.log(`[EMBED-NOW] Fetching pending jobs (limit: ${limit})`);
    const { data: jobs, error } = await supabase
      .from("embedding_jobs")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      console.error(`[EMBED-NOW] Database error fetching jobs:`, error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    console.log(
      `[EMBED-NOW] Found ${jobs?.length || 0} pending jobs:`,
      jobs?.map((j) => ({ id: j.id, type: j.type, action: j.action })),
    );

    if (!jobs || jobs.length === 0) {
      console.log(`[EMBED-NOW] No pending jobs found`);
      return NextResponse.json({ message: "No pending jobs" });
    }

    // Process jobs immediately
    let processed = 0;
    for (const job of jobs) {
      try {
        console.log(
          `[EMBED-NOW] Processing job ${processed + 1}/${jobs.length}:`,
          { id: job.id, type: job.type },
        );
        await processJobImmediately(supabase, job);
        processed++;
        console.log(`[EMBED-NOW] Successfully processed job ${job.id}`);
      } catch (error) {
        console.error(`[EMBED-NOW] Failed to process job ${job.id}:`, error);
      }
    }

    return NextResponse.json({
      message: `Processed ${processed} jobs`,
      processed,
    });
  } catch (error) {
    console.error("Manual embed error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function processJobImmediately(supabase: any, job: any) {
  console.log(`[JOB] Processing job:`, {
    id: job.id,
    type: job.type,
    action: job.action,
    itemId: job.item_id,
  });

  // Mark as processing
  await supabase
    .from("embedding_jobs")
    .update({ status: "processing", processed_at: new Date().toISOString() })
    .eq("id", job.id);

  if (job.action === "delete") {
    console.log(`[JOB] Deleting embeddings for item: ${job.item_id}`);
    await supabase.from("cms_embeddings").delete().eq("item_id", job.item_id);
  } else {
    // Fetch content and generate embeddings
    console.log(`[JOB] Fetching content data for:`, {
      type: job.type,
      itemId: job.item_id,
    });
    const contentData = await fetchContentData(supabase, job.type, job.item_id);
    console.log(`[JOB] Content data fetched:`, {
      found: !!contentData,
      isActive: contentData?.is_active,
      hasContent: !!(
        contentData?.headline ||
        contentData?.title ||
        contentData?.question
      ),
    });

    if (contentData && contentData.is_active) {
      console.log(`[JOB] Generating embeddings for active content`);
      await generateEmbeddings(supabase, job, contentData);
    } else {
      console.log(
        `[JOB] Content not found or inactive, deleting existing embeddings`,
      );
      await supabase.from("cms_embeddings").delete().eq("item_id", job.item_id);
    }
  }

  // Mark as completed
  console.log(`[JOB] Marking job as completed:`, job.id);
  await supabase
    .from("embedding_jobs")
    .update({ status: "completed" })
    .eq("id", job.id);
}

async function fetchContentData(supabase: any, type: string, itemId: string) {
  const tableMap: any = {
    cms_news: "cms_news",
    cms_activity_cards: "cms_activity_cards",
    cms_pages: "cms_pages",
    cms_faq_items: "cms_faq_items",
  };

  const { data } = await supabase
    .from(tableMap[type])
    .select("*")
    .eq("id", itemId)
    .single();

  return data;
}

async function generateEmbeddings(supabase: any, job: any, contentData: any) {
  console.log(`[EMBEDDING] Starting embedding generation for job:`, {
    jobId: job.id,
    type: job.type,
    itemId: job.item_id,
  });

  const { generateDocumentEmbedding, chunkTextForEmbedding } = await import(
    "../../../lib/mcp/embeddings"
  );

  function stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Prepare content
  let content = "";
  switch (job.type) {
    case "cms_news":
      content = `${contentData.headline}\n\n${contentData.content}`;
      break;
    case "cms_activity_cards":
      content = `${contentData.title}\n\n${contentData.summary || ""}\n\n${contentData.content}`;
      break;
    case "cms_pages":
      content = `${contentData.title}\n\n${contentData.meta_description || ""}`;
      break;
    case "cms_faq_items":
      content = `${contentData.question}\n\n${contentData.answer}`;
      break;
  }

  console.log(`[EMBEDDING] Content prepared:`, {
    contentLength: content.length,
    type: job.type,
  });

  const chunks = chunkTextForEmbedding(stripHtml(content), 350);
  console.log(`[EMBEDDING] Text chunked into ${chunks.length} chunks`);

  // Delete existing embeddings
  console.log(
    `[EMBEDDING] Deleting existing embeddings for item: ${job.item_id}`,
  );
  const { error: deleteError } = await supabase
    .from("cms_embeddings")
    .delete()
    .eq("item_id", job.item_id);

  if (deleteError) {
    console.error(`[EMBEDDING] Delete error:`, deleteError);
  } else {
    console.log(`[EMBEDDING] Existing embeddings deleted successfully`);
  }

  // Generate embeddings
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (chunk.length < 3) {
      console.log(
        `[EMBEDDING] Skipping chunk ${i} (too short: ${chunk.length} chars)`,
      );
      continue;
    }

    console.log(
      `[EMBEDDING] Processing chunk ${i}/${chunks.length} (${chunk.length} chars)`,
    );

    try {
      const embedding = await generateDocumentEmbedding(chunk);
      console.log(
        `[EMBEDDING] Generated embedding for chunk ${i}, dimensions: ${embedding.length}`,
      );

      const { error: insertError } = await supabase
        .from("cms_embeddings")
        .insert({
          type: job.type.replace("cms_", ""),
          item_id: job.item_id,
          language: contentData.language,
          chunk_id: i,
          content: chunk,
          embedding: `[${embedding.join(",")}]`,
          published_at: contentData.published_at || contentData.updated_at,
          is_active: contentData.is_active,
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error(`[EMBEDDING] Insert error for chunk ${i}:`, insertError);
      } else {
        console.log(`[EMBEDDING] Successfully inserted chunk ${i}`);
      }
    } catch (error) {
      console.error(`[EMBEDDING] Error processing chunk ${i}:`, error);
    }
  }

  console.log(`[EMBEDDING] Completed embedding generation for job: ${job.id}`);
}
