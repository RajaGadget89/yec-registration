import { Metadata } from "next";
import { getSupabaseServiceClient } from "../../lib/supabase/server";
import TopMenuBar from "../../components/TopMenuBar";
import Footer from "../../components/Footer";
import ShareButton from "../../components/ShareButton";
import { notFound } from "next/navigation";

interface FAQPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: FAQPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const supabase = getSupabaseServiceClient();
    const { data: group } = await supabase
      .from("cms_faq_groups")
      .select("title, description")
      .eq("id", id)
      .eq("is_active", true)
      .not("published_at", "is", null)
      .single();

    if (!group) {
      return {
        title: "FAQ Not Found - YEC Day",
        description: "The requested FAQ group could not be found.",
      };
    }

    return {
      title: `${group.title} - YEC Day`,
      description:
        group.description || `Frequently asked questions about ${group.title}`,
    };
  } catch (_error) {
    return {
      title: "FAQ - YEC Day",
      description: "Frequently asked questions",
    };
  }
}

export default async function FAQPage({ params }: FAQPageProps) {
  const { id } = await params;
  const supabase = getSupabaseServiceClient();

  try {
    // Fetch FAQ group
    const { data: group, error: groupError } = await supabase
      .from("cms_faq_groups")
      .select("id, title, description, language, display_config, published_at")
      .eq("id", id)
      .eq("is_active", true)
      .not("published_at", "is", null)
      .single();

    if (groupError || !group) {
      notFound();
    }

    // Fetch FAQ items
    const { data: items, error: itemsError } = await supabase
      .from("cms_faq_items")
      .select("id, question, answer, item_order")
      .eq("group_id", id)
      .eq("is_active", true)
      .order("item_order", { ascending: true });

    if (itemsError) {
      console.error("Error fetching FAQ items:", itemsError);
    }

    const faqItems = items || [];

    return (
      <main className="min-h-screen pt-24">
        <TopMenuBar />

        {/* Hero Section */}
        <section className="bg-gradient-to-r from-yec-primary to-yec-accent text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {group.title}
              </h1>
              {group.description && (
                <p className="text-xl text-blue-100 max-w-3xl mx-auto">
                  {group.description}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* FAQ Content */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {faqItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg
                    className="w-16 h-16 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No Questions Available
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  This FAQ group doesn&apos;t have any questions yet.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {faqItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                  >
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                        {item.question}
                      </h3>
                      <div
                        className="text-gray-700 dark:text-gray-300 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: item.answer }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Display Configuration */}
            {group.display_config && (
              <div className="mt-12">
                {/* Related Links */}
                {group.display_config.links &&
                  group.display_config.links.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Related Links
                      </h3>
                      <div className="space-y-2">
                        {group.display_config.links.map(
                          (link: any, _index: number) => (
                            <a
                              key={link.url || link.text || _index}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-yec-primary transition-colors"
                            >
                              <div className="font-medium text-gray-900 dark:text-white break-words">
                                {link.text}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-all whitespace-normal overflow-hidden">
                                {link.url}
                              </div>
                            </a>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                {/* Hashtags */}
                {group.display_config.hashtags &&
                  group.display_config.hashtags.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Tags
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {group.display_config.hashtags.map(
                          (tag: string, _index: number) => (
                            <span
                              key={`${tag}-${_index}`}
                              className="px-3 py-1 bg-yec-primary text-white rounded-full text-sm font-medium"
                            >
                              {tag}
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                {/* Share Button */}
                {group.display_config.share_enabled && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Share This FAQ
                    </h3>
                    <ShareButton
                      title={group.display_config.share_title || group.title}
                      text={
                        group.display_config.share_text || group.description
                      }
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <Footer />
      </main>
    );
  } catch (_error) {
    console.error("FAQ page error:", _error);
    notFound();
  }
}
