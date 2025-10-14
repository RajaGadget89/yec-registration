import { Metadata } from "next";
import { getSupabaseServiceClient } from "../lib/supabase/server";
import NewsListing from "./_components/NewsListing";
import TopMenuBar from "../components/TopMenuBar";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "News - YEC Day",
  description: "Latest news and updates from YEC Day",
};

interface NewsPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    language?: string;
    sort?: string;
  }>;
}

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const supabase = getSupabaseServiceClient();

  // Parse search parameters
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const limit = parseInt(params.limit || "20");
  const search = params.search || "";
  const language = params.language || "all";
  const sort = params.sort || "newest";

  // Calculate offset for pagination
  const offset = (page - 1) * limit;

  // Build query
  let query = supabase
    .from("cms_news")
    .select(
      `
      id,
      headline,
      content,
      image_url,
      meta_description,
      language,
      is_active,
      published_at,
      created_at,
      hashtags,
      external_links
    `,
      { count: "exact" },
    )
    .eq("is_active", true);

  // Apply search filter
  if (search) {
    query = query.or(`headline.ilike.%${search}%,content.ilike.%${search}%`);
  }

  // Apply language filter
  if (language !== "all") {
    query = query.eq("language", language);
  }

  // Apply sorting
  switch (sort) {
    case "oldest":
      query = query.order("published_at", { ascending: true });
      break;
    case "alphabetical":
      query = query.order("headline", { ascending: true });
      break;
    case "reverse-alphabetical":
      query = query.order("headline", { ascending: false });
      break;
    default: // newest
      query = query.order("published_at", { ascending: false });
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data: news, error, count } = await query;

  if (error) {
    console.error("Error fetching news:", error);
  }

  const totalPages = Math.ceil((count || 0) / limit);

  return (
    <main className="min-h-screen">
      <TopMenuBar />
      <NewsListing
        news={news || []}
        currentPage={page}
        totalPages={totalPages}
        totalCount={count || 0}
        limit={limit}
        searchParams={params}
      />
      <Footer />
    </main>
  );
}
