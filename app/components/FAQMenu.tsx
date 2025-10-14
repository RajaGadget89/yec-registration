"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FAQGroup {
  id: string;
  title: string;
  description?: string;
  language: "th" | "en";
  is_active: boolean;
  published_at: string | null;
}

interface FAQMenuProps {
  isLandingPage: boolean;
  isScrolled: boolean;
}

export default function FAQMenu({ isLandingPage, isScrolled }: FAQMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [faqGroups, setFaqGroups] = useState<FAQGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadFaqGroups = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: "1",
        limit: "50",
        is_active: "true",
        published: "true",
      });

      const response = await fetch(`/api/cms/faq-groups?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch FAQ groups");
      }

      const data = await response.json();
      setFaqGroups(data.groups || []);
    } catch (error) {
      console.error("Error loading FAQ groups:", error);
      setFaqGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFaqGroups();
  }, [loadFaqGroups]);

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const openMenu = () => {
    clearCloseTimeout();
    setIsOpen(true);
  };

  const scheduleClose = () => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => setIsOpen(false), 200);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsOpen(!isOpen);
  };

  const baseClasses = `text-lg font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-yec-accent focus:ring-offset-2 rounded px-2 py-1 ${
    isLandingPage && !isScrolled
      ? "text-white hover:text-yec-accent"
      : "text-yec-primary hover:text-yec-accent"
  }`;

  return (
    <div
      className="relative inline-block"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
      onFocusCapture={openMenu}
      onBlurCapture={scheduleClose}
    >
      <button
        onClick={handleClick}
        className={`${baseClasses} flex items-center gap-1`}
        aria-label="FAQ Menu"
        aria-expanded={isOpen}
      >
        <HelpCircle className="w-4 h-4" />
        FAQ
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
          onMouseEnter={openMenu}
          onMouseLeave={scheduleClose}
        >
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <HelpCircle className="w-5 h-5 text-yec-primary" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Frequently Asked Questions
              </h3>
            </div>

            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yec-primary mx-auto"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Loading...
                </p>
              </div>
            ) : faqGroups.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No FAQ groups available
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {faqGroups.map((group) => (
                  <Link
                    key={group.id}
                    href={`/faq/${group.id}`}
                    className="block p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-yec-primary transition-colors">
                          {group.title}
                        </h4>
                        {group.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {group.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
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
                            <span className="text-xs text-gray-400">
                              {new Date(
                                group.published_at,
                              ).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
              <Link
                href="/faq"
                className="block text-center text-sm text-yec-primary hover:text-yec-accent font-medium transition-colors"
                onClick={() => setIsOpen(false)}
              >
                View All FAQs →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
