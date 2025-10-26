"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Calendar,
  Globe,
  Hash,
  ExternalLink,
  Share2,
} from "lucide-react";

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

interface NewsDetailProps {
  article: NewsArticle;
}

export default function NewsDetail({ article }: NewsDetailProps) {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.headline,
          text: article.meta_description || article.content.substring(0, 100),
          url: window.location.href,
        });
      } catch (error) {
        console.log("Error sharing:", error);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      } catch (error) {
        console.log("Error copying to clipboard:", error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-8">
          <Link
            href="/news"
            className="inline-flex items-center text-yec-primary hover:text-yec-accent transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to News
          </Link>
        </div>

        {/* Article Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {article.image_url && (
            <div className="w-full">
              <Image
                src={article.image_url}
                alt={article.headline}
                width={800}
                height={400}
                priority
                className="w-full h-auto max-w-full object-contain"
              />
            </div>
          )}

          <div className="p-6 sm:p-8">
            {/* Meta Information */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
              <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                  <Globe className="h-3 w-3 mr-1" />
                  {article.language.toUpperCase()}
                </span>
                {article.published_at && (
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(article.published_at).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={handleShare}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </button>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {article.headline}
            </h1>

            {/* Description */}
            {article.meta_description && (
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
                {article.meta_description}
              </p>
            )}

            {/* Hashtags */}
            {article.hashtags && article.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {article.hashtags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                  >
                    <Hash className="h-3 w-3 mr-1" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Article Content */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
          <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:text-yec-primary hover:prose-a:text-yec-accent prose-strong:text-gray-900 dark:prose-strong:text-white">
            <div
              className="text-gray-700 dark:text-gray-300 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          </div>
        </div>

        {/* External Links */}
        {article.external_links && article.external_links.length > 0 && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Related Links
            </h3>
            <div className="space-y-3">
              {article.external_links.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {link.title}
                      </h4>
                      {link.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {link.description}
                        </p>
                      )}
                      <p className="text-sm text-yec-primary mt-1">
                        {link.url}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-400 ml-2" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Back to News */}
        <div className="mt-8 text-center">
          <Link
            href="/news"
            className="inline-flex items-center px-6 py-3 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to All News
          </Link>
        </div>
      </div>
    </div>
  );
}
