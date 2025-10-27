import { Metadata } from "next";
import { getSupabaseServerClient } from "../lib/supabase/server";
import ActivitiesListing from "./_components/ActivitiesListing";
import TopMenuBar from "../components/TopMenuBar";
import Footer from "../components/Footer";
import { buildDynamicPageMetadata } from "../lib/seo-utils";

export async function generateMetadata(): Promise<Metadata> {
  const seoConfig = await import("../lib/seo-config").then((m) =>
    m.getSEOConfig(),
  );
  return buildDynamicPageMetadata({
    title: seoConfig.activitiesTitle,
    description: seoConfig.activitiesDescription,
    canonicalPath: "/activities",
  });
}

interface ActivitiesPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    language?: string;
    sort?: string;
  }>;
}

export default async function ActivitiesPage({
  searchParams,
}: ActivitiesPageProps) {
  const supabase = await getSupabaseServerClient();

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
    .from("cms_activity_cards")
    .select(
      `
      id,
      card_slug,
      title,
      description,
      summary,
      content,
      image_url,
      icon_emoji,
      language,
      is_active,
      published_at,
      scheduled_at,
      ends_at,
      created_at,
      hashtags,
      external_links
    `,
      { count: "exact" },
    )
    .eq("is_active", true);

  // Apply search filter
  if (search) {
    query = query.or(
      `title.ilike.%${search}%,description.ilike.%${search}%,content.ilike.%${search}%`,
    );
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
      query = query.order("title", { ascending: true });
      break;
    case "reverse-alphabetical":
      query = query.order("title", { ascending: false });
      break;
    case "display_order":
      query = query.order("display_order", { ascending: true });
      break;
    default: // newest
      query = query.order("published_at", { ascending: false });
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data: activities, error, count } = await query;

  if (error) {
    console.error("Error fetching activities:", error);
  }

  const totalPages = Math.ceil((count || 0) / limit);

  return (
    <main className="min-h-screen">
      <TopMenuBar />
      <ActivitiesListing
        activities={activities || []}
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
