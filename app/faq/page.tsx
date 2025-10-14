import { Metadata } from "next";
import { getSupabaseServiceClient } from "../lib/supabase/server";
import TopMenuBar from "../components/TopMenuBar";
import Footer from "../components/Footer";
import Link from "next/link";
import { HelpCircle, Calendar } from "lucide-react";

export const metadata: Metadata = {
  title: "FAQ - YEC Day",
  description: "Frequently asked questions and answers about YEC Day",
};

export default async function FAQPage() {
  const supabase = getSupabaseServiceClient();

  try {
    // Fetch all published FAQ groups
    const { data: groups, error } = await supabase
      .from("cms_faq_groups")
      .select("id, title, description, language, published_at, display_config")
      .eq("is_active", true)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false });

    if (error) {
      console.error("Error fetching FAQ groups:", error);
    }

    const faqGroups = groups || [];

    return (
      <main className="min-h-screen pt-24">
        <TopMenuBar />

        {/* Hero Section */}
        <section className="bg-gradient-to-r from-yec-primary to-yec-accent text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-white/20 rounded-full">
                  <HelpCircle className="w-12 h-12" />
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Frequently Asked Questions
              </h1>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto">
                Find answers to common questions about YEC Day events,
                registration, and more.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Groups */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {faqGroups.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <HelpCircle className="w-16 h-16 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No FAQ Groups Available
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Check back later for frequently asked questions.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {faqGroups.map((group) => (
                  <Link
                    key={group.id}
                    href={`/faq/${group.id}`}
                    className="group block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-yec-primary"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-yec-primary transition-colors mb-2">
                            {group.title}
                          </h3>
                          {group.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                              {group.description}
                            </p>
                          )}
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <div className="p-2 bg-yec-primary/10 rounded-full group-hover:bg-yec-primary/20 transition-colors">
                            <HelpCircle className="w-5 h-5 text-yec-primary" />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              group.language === "th"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                                : "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                            }`}
                          >
                            {group.language === "th" ? "ไทย" : "English"}
                          </span>
                          {group.published_at && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              <Calendar className="w-3 h-3" />
                              {new Date(
                                group.published_at,
                              ).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        {group.display_config?.hashtags &&
                          group.display_config.hashtags.length > 0 && (
                            <div className="flex items-center gap-1">
                              {group.display_config.hashtags
                                .slice(0, 2)
                                .map((tag: string, index: number) => (
                                  <span
                                    key={index}
                                    className="text-xs text-gray-500 dark:text-gray-400"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              {group.display_config.hashtags.length > 2 && (
                                <span className="text-xs text-gray-400">
                                  +{group.display_config.hashtags.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <Footer />
      </main>
    );
  } catch (error) {
    console.error("FAQ page error:", error);
    return (
      <main className="min-h-screen">
        <TopMenuBar />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Error Loading FAQs
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Please try again later.
            </p>
          </div>
        </div>
        <Footer />
      </main>
    );
  }
}
