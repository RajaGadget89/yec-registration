"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";

interface PreviewContent {
  id: string;
  type: "page" | "news" | "activity-card" | "hero-video";
  title: string;
  content: any;
  device_type: "desktop" | "tablet" | "mobile";
  is_published: boolean;
  last_updated: string;
}

export default function ContentPreviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [content, setContent] = useState<PreviewContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const type = params.type as string;
  const id = params.id as string;
  const device = searchParams.get("device") || "desktop";

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);

        // Fetch content based on type
        let response;
        switch (type) {
          case "page":
            response = await fetch(`/api/admin/cms/pages/${id}`);
            break;
          case "news":
            response = await fetch(`/api/admin/cms/news/${id}`);
            break;
          case "activity-card":
            response = await fetch(`/api/admin/cms/activity-cards/${id}`);
            break;
          case "hero-video":
            response = await fetch(`/api/admin/cms/hero-videos/${id}`);
            break;
          default:
            throw new Error("Invalid content type");
        }

        if (!response.ok) {
          throw new Error("Failed to fetch content");
        }

        const data = await response.json();
        setContent(data);
      } catch (err) {
        console.error("Error fetching content:", err);
        setError(err instanceof Error ? err.message : "Failed to load content");
      } finally {
        setLoading(false);
      }
    };

    if (type && id) {
      fetchContent();
    }
  }, [type, id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yec-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Preview Error
          </h2>
          <p className="text-gray-600 dark:text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            No Content Found
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            The requested content could not be found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${
        device === "mobile"
          ? "max-w-sm mx-auto"
          : device === "tablet"
            ? "max-w-2xl mx-auto"
            : "w-full"
      }`}
    >
      {/* Device indicator */}
      <div className="bg-yec-primary text-white text-center py-2 text-sm font-medium">
        Preview Mode - {device.toUpperCase()} View
      </div>

      {/* Content preview */}
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {content.title}
          </h1>

          <div className="space-y-4">
            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
              <span className="capitalize">{content.type}</span>
              <span>•</span>
              <span>Device: {device}</span>
              <span>•</span>
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  content.is_published
                    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
                }`}
              >
                {content.is_published ? "Published" : "Draft"}
              </span>
            </div>

            <div className="mt-6">
              <p className="text-gray-700 dark:text-gray-300">
                This is a preview of the {content.type} content. The actual
                content rendering would be implemented based on the specific
                content type.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
