"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Link,
  Hash,
  Share2,
  ExternalLink,
} from "lucide-react";

type FAQProps = {
  title?: string;
  content?: any;
};

interface FAQGroup {
  id: string;
  title: string;
  description?: string;
  language: string;
  is_active: boolean;
  display_config: {
    links: Array<{ text: string; url: string; icon?: string }>;
    hashtags: string[];
    share_enabled: boolean;
    share_title: string;
    share_text: string;
  };
  published_at?: string;
  created_at: string;
  updated_at: string;
  items: FAQItem[];
}

interface FAQItem {
  id: string;
  group_id: string;
  question: string;
  answer: string;
  item_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function FAQSection({ title, content }: FAQProps) {
  const [faqGroup, setFaqGroup] = useState<FAQGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const faqGroupId = content?.faq_group_id;

  useEffect(() => {
    if (!faqGroupId) {
      setError("No FAQ group selected");
      setLoading(false);
      return;
    }

    const loadFAQGroup = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/cms/faq-groups/${faqGroupId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("FAQ group not found");
          } else {
            setError("Failed to load FAQ group");
          }
          return;
        }

        const data = await response.json();
        setFaqGroup(data);
      } catch (error) {
        console.error("Error loading FAQ group:", error);
        setError("Failed to load FAQ group");
      } finally {
        setLoading(false);
      }
    };

    loadFAQGroup();
  }, [faqGroupId]);

  const toggleItem = (itemId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleShare = () => {
    if (!faqGroup?.display_config.share_enabled) return;

    const shareData = {
      title: faqGroup.display_config.share_title || faqGroup.title,
      text:
        faqGroup.display_config.share_text ||
        `Check out this FAQ: ${faqGroup.title}`,
      url: window.location.href,
    };

    if (navigator.share) {
      navigator.share(shareData).catch(console.error);
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard
        .writeText(shareData.url)
        .then(() => {
          alert("Link copied to clipboard!");
        })
        .catch(console.error);
    }
  };

  if (loading) {
    return (
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg">
        <div className="text-center py-8">
          <div className="text-gray-500 dark:text-gray-400">Loading FAQ...</div>
        </div>
      </section>
    );
  }

  if (error || !faqGroup) {
    return (
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg">
        <div className="text-center py-8">
          <div className="text-red-500 dark:text-red-400">
            {error || "FAQ group not available"}
          </div>
        </div>
      </section>
    );
  }

  const { items = [] } = faqGroup;

  return (
    <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg">
      {title && (
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
          {title}
        </h2>
      )}

      {faqGroup.description && (
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
          {faqGroup.description}
        </p>
      )}

      {/* FAQ Items */}
      {items.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-500 dark:text-gray-400">
            No FAQ items available.
          </div>
        </div>
      ) : (
        <div className="space-y-4 mb-8">
          {items.map((item) => {
            const isExpanded = expandedItems.has(item.id);

            return (
              <div
                key={item.id}
                className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleItem(item.id)}
                  className="w-full px-6 py-4 text-left bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-between"
                >
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white pr-4">
                    {item.question}
                  </h3>
                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-600">
                    <div
                      className="prose dark:prose-invert max-w-none prose-lg prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:text-yec-primary hover:prose-a:text-yec-accent prose-strong:text-gray-900 dark:prose-strong:text-white"
                      dangerouslySetInnerHTML={{ __html: item.answer }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Group Metadata */}
      {(faqGroup.display_config.links.length > 0 ||
        faqGroup.display_config.hashtags.length > 0 ||
        faqGroup.display_config.share_enabled) && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {/* Related Links */}
            {faqGroup.display_config.links.length > 0 && (
              <div className="flex items-center gap-2">
                <Link className="w-4 h-4 text-gray-500" />
                <span className="text-gray-500 dark:text-gray-400">Links:</span>
                <div className="flex flex-wrap gap-2">
                  {faqGroup.display_config.links.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-yec-primary hover:text-yec-accent transition-colors flex items-center gap-1"
                    >
                      {link.text}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Hashtags */}
            {faqGroup.display_config.hashtags.length > 0 && (
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-gray-500" />
                <span className="text-gray-500 dark:text-gray-400">Tags:</span>
                <div className="flex flex-wrap gap-1">
                  {faqGroup.display_config.hashtags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-xs"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Share Button */}
            {faqGroup.display_config.share_enabled && (
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-3 py-1 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors text-sm"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
