"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Newspaper } from "lucide-react";

interface NewsArticle {
  id: string;
  headline: string;
  content: string;
  image_url?: string;
  meta_description?: string;
  language: string;
  is_active: boolean;
  published_at?: string;
  created_at: string;
  hashtags?: string[];
  external_links?: Array<{
    title: string;
    url: string;
    description?: string;
  }>;
}

export default function NewsFeed() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadNews = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          "/api/cms/news?limit=10&sort=newest&language=all",
          {
            cache: "no-store",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (!res.ok) {
          throw new Error(`Failed to load news: ${res.status}`);
        }

        const data = await res.json();

        if (!cancelled) {
          setNews(data.data || []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("News feed error:", err);
          setError("Failed to load news");
          setNews([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadNews();

    return () => {
      cancelled = true;
    };
  }, []);

  // Strip HTML tags and truncate description to 150 characters
  const truncateDescription = (text: string, maxLength: number = 150) => {
    if (!text) return "";

    // Strip HTML tags
    const strippedText = text.replace(/<[^>]*>/g, "");

    if (strippedText.length <= maxLength) return strippedText;
    return strippedText.substring(0, maxLength).trim() + "...";
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-yec-primary">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yec-primary"></div>
              <span className="text-lg font-medium">
                Loading latest news...
              </span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Newspaper className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Latest News
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Unable to load news at this time. Please try again later.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-yec-primary mb-4">
            Latest News
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Stay updated with the latest news and announcements from YEC Day
          </p>
        </div>

        {/* News List */}
        {news.length > 0 ? (
          <div className="relative">
            {/* News List Headers */}
            <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-t-lg border-b border-gray-200 dark:border-gray-700 mb-0">
              <div className="col-span-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                IMAGE
              </div>
              <div className="col-span-8 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                HEADLINE
              </div>
              <div className="col-span-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                PUBLISHED
              </div>
            </div>

            {/* News List Items */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {news.map((article, _index) => (
                <div key={article.id} className="group">
                  {/* News List Item */}
                  <div
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    onClick={() => window.open(`/news/${article.id}`, "_blank")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        window.open(`/news/${article.id}`, "_blank");
                      }
                    }}
                    aria-label={`Read article: ${article.headline}`}
                  >
                    {/* Image */}
                    <div className="col-span-1 flex items-center">
                      {article.image_url ? (
                        <Image
                          src={article.image_url}
                          alt={article.headline}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yec-primary to-yec-accent flex items-center justify-center text-white font-bold text-lg">
                          {article.headline.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Headline and Description */}
                    <div className="col-span-8 flex flex-col justify-center">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-yec-primary transition-colors duration-200 line-clamp-1 mb-1">
                        {article.headline}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                        {truncateDescription(
                          article.meta_description ||
                            article.content ||
                            "No description available",
                        )}
                      </p>
                    </div>

                    {/* Published Date */}
                    <div className="col-span-3 flex items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {article.published_at
                          ? formatDate(article.published_at)
                          : "Draft"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* View All News Button - Top Right */}
            <div className="absolute top-0 right-0 -mt-12">
              <Link
                href="/news"
                className="group inline-flex items-center justify-center bg-gradient-to-r from-yec-primary to-yec-accent hover:from-yec-accent hover:to-yec-primary text-white font-medium px-4 py-2 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-yec-primary focus:ring-opacity-50 animate-pulse"
                aria-label="View all news articles"
              >
                <Newspaper className="h-4 w-4 mr-1" />
                <span className="text-sm">View All News</span>
                <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Newspaper className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No news available
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Check back later for the latest updates and announcements.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
