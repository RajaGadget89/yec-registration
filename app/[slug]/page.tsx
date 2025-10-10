import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildPageMetadata } from "../lib/seo-utils";
import HeroSection from "../components/cms/sections/Hero";
import RichTextSection from "../components/cms/sections/RichText";
import GallerySection from "../components/cms/sections/Gallery";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/cms/pages/${params.slug}`,
      { cache: "no-store" },
    );
    if (!res.ok) return { title: "Page not found" };
    const { page } = await res.json();
    return buildPageMetadata({
      title: page?.title || params.slug,
      description: page?.meta_description,
    });
  } catch {
    return { title: params.slug };
  }
}

export default async function CmsPage({ params }: Props) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/cms/pages/${params.slug}`,
    { cache: "no-store" },
  );
  if (res.status === 404) {
    notFound();
  }
  if (!res.ok) {
    notFound();
  }
  const { page, sections } = await res.json();

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        {page.title}
      </h1>
      {page.meta_description && (
        <p className="text-gray-700 dark:text-gray-300 mb-8">
          {page.meta_description}
        </p>
      )}
      {/* Basic section renderer */}
      {Array.isArray(sections) && sections.length > 0 ? (
        <div className="space-y-8">
          {sections.map((s: any) => {
            const type = String(s.section_type || "").toLowerCase();
            if (type === "hero") {
              return (
                <HeroSection key={s.id} title={s.title} content={s.content} />
              );
            }
            if (
              type === "rich_text" ||
              type === "richtext" ||
              type === "text"
            ) {
              return (
                <RichTextSection
                  key={s.id}
                  title={s.title}
                  content={s.content}
                />
              );
            }
            if (type === "gallery") {
              return (
                <GallerySection
                  key={s.id}
                  title={s.title}
                  content={s.content}
                />
              );
            }
            return (
              <section
                key={s.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
              >
                {s.title && (
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {s.title}
                  </h2>
                )}
                <pre className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                  {typeof s.content === "string"
                    ? s.content
                    : JSON.stringify(s.content, null, 2)}
                </pre>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="text-gray-500 dark:text-gray-400 text-sm">
          No sections yet.
        </div>
      )}
    </main>
  );
}
