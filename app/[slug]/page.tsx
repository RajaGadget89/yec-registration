import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildPageMetadata } from "../lib/seo-utils";
import TopMenuBar from "../components/TopMenuBar";
import Footer from "../components/Footer";
import HeroSection from "../components/cms/sections/Hero";
import RichTextSection from "../components/cms/sections/RichText";
import GallerySection from "../components/cms/sections/Gallery";
import BannerSection from "../components/cms/sections/Banner";
import ActivityCardsSection from "../components/cms/sections/ActivityCards";
import FAQSection from "../components/cms/sections/FAQ";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params;
    // Properly decode the slug to handle Thai characters
    const decodedSlug = decodeURIComponent(slug);
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/cms/pages/${decodedSlug}`,
      { cache: "no-store" },
    );
    if (!res.ok) return { title: "Page not found" };
    const { page } = await res.json();
    return buildPageMetadata({
      title: page?.title || slug,
      description: page?.meta_description,
    });
  } catch {
    const { slug } = await params;
    // Properly decode the slug to handle Thai characters
    const decodedSlug = decodeURIComponent(slug);
    return { title: decodedSlug };
  }
}

export default async function CmsPage({ params }: Props) {
  const { slug } = await params;
  // Properly decode the slug to handle Thai characters
  const decodedSlug = decodeURIComponent(slug);
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/cms/pages/${decodedSlug}`,
    { cache: "no-store" },
  );
  if (res.status === 404) {
    notFound();
  }
  if (!res.ok) {
    notFound();
  }
  const { page, sections } = await res.json();

  // Check if first section is a hero section
  const firstSection = sections?.[0];
  const isFirstSectionHero =
    firstSection?.section_type?.toLowerCase() === "hero";

  return (
    <main className="min-h-screen">
      <TopMenuBar />

      {/* Render sections */}
      {Array.isArray(sections) && sections.length > 0 ? (
        <>
          {/* Show page title and meta description only if first section is not hero */}
          {!isFirstSectionHero && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                {page.title}
              </h1>
              {page.meta_description && (
                <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl">
                  {page.meta_description}
                </p>
              )}
            </div>
          )}

          {sections.map((s: any, _index: number) => {
            const type = String(s.section_type || "").toLowerCase();

            if (type === "hero") {
              // Full-width hero like landing page
              return (
                <HeroSection key={s.id} title={s.title} content={s.content} />
              );
            }

            // Wrap non-hero sections in the standard landing container width
            return (
              <div
                key={s.id}
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
              >
                {type === "content" ||
                type === "rich_text" ||
                type === "richtext" ||
                type === "text" ? (
                  <RichTextSection title={s.title} content={s.content} />
                ) : type === "gallery" ? (
                  <GallerySection title={s.title} content={s.content} />
                ) : type === "banner" ? (
                  <BannerSection title={s.title} content={s.content} />
                ) : type === "activity_cards" ? (
                  <ActivityCardsSection title={s.title} content={s.content} />
                ) : type === "faq" ? (
                  <FAQSection title={s.title} content={s.content} />
                ) : (
                  <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg">
                    {s.title && (
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        {s.title}
                      </h2>
                    )}
                    <pre className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                      {typeof s.content === "string"
                        ? s.content
                        : JSON.stringify(s.content, null, 2)}
                    </pre>
                  </section>
                )}
              </div>
            );
          })}
        </>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {page.title}
          </h1>
          {page.meta_description && (
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              {page.meta_description}
            </p>
          )}
          <div className="text-gray-500 dark:text-gray-400 text-sm">
            No sections yet.
          </div>
        </div>
      )}
      <Footer />
    </main>
  );
}
