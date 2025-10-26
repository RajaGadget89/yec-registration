import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";

/**
 * Vercel Cron Job for Embedding Generation
 * Runs every 5 minutes to process pending embedding jobs
 * URL: /api/cron/embed
 * Cron: 0 0,5,10,15,20,25,30,35,40,45,50,55 * * * (every 5 minutes)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a Vercel cron request
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServiceClient();

    // Get pending jobs (limit to 10 per run to stay within Vercel timeout)
    const { data: jobs, error } = await supabase
      .from("embedding_jobs")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(10);

    if (error) {
      console.error("Error fetching jobs:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ message: "No pending jobs" });
    }

    console.log(`Processing ${jobs.length} embedding jobs...`);

    // Process each job
    for (const job of jobs) {
      try {
        await processEmbeddingJob(supabase, job);
      } catch (error) {
        console.error(`Failed to process job ${job.id}:`, error);
        // Mark as failed
        await supabase
          .from("embedding_jobs")
          .update({ status: "failed", processed_at: new Date().toISOString() })
          .eq("id", job.id);
      }
    }

    return NextResponse.json({
      message: `Processed ${jobs.length} jobs`,
      processed: jobs.length,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function processEmbeddingJob(supabase: any, job: any) {
  console.log(`Processing ${job.action} for ${job.type} ${job.item_id}`);

  // Mark as processing
  await supabase
    .from("embedding_jobs")
    .update({ status: "processing", processed_at: new Date().toISOString() })
    .eq("id", job.id);

  if (job.action === "delete") {
    // Delete embeddings
    await supabase.from("cms_embeddings").delete().eq("item_id", job.item_id);
  } else {
    // Fetch and process content
    const contentData = await fetchContentData(supabase, job.type, job.item_id);

    if (!contentData || !contentData.is_active) {
      // Delete embeddings for inactive items
      await supabase.from("cms_embeddings").delete().eq("item_id", job.item_id);
    } else {
      // Generate embeddings
      await generateEmbeddings(supabase, job, contentData);
    }
  }

  // Mark as completed
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
  const { generateEmbedding768, chunkTextForEmbedding } = await import(
    "../../../lib/mcp/embeddings"
  );

  function stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Prepare content based on type
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

  const chunks = chunkTextForEmbedding(stripHtml(content), 350);

  // Delete existing embeddings
  await supabase.from("cms_embeddings").delete().eq("item_id", job.item_id);

  // Generate embeddings for each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (chunk.length < 3) continue;

    const embedding = await generateEmbedding768(chunk);

    await supabase.from("cms_embeddings").insert({
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
  }
}
