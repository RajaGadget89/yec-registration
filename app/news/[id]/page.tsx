import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSupabaseServerClient } from "../../lib/supabase/server";
import TopMenuBar from "../../components/TopMenuBar";
import Footer from "../../components/Footer";
import NewsDetail from "../_components/NewsDetail";

interface NewsDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: NewsDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const { data: article } = await supabase
    .from("cms_news")
    .select("headline, meta_description, language")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (!article) {
    return {
      title: "Article Not Found - YEC Day",
    };
  }

  return {
    title: `${article.headline} - YEC Day News`,
    description:
      article.meta_description || "Read the latest news from YEC Day",
  };
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const { data: article, error } = await supabase
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
    )
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (error || !article) {
    notFound();
  }

  return (
    <main className="min-h-screen">
      <TopMenuBar />
      <div className="pt-40">
        <NewsDetail article={article} />
      </div>
      <Footer />
    </main>
  );
}
