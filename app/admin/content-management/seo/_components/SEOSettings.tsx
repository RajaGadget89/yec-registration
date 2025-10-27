"use client";

import { useState, useEffect } from "react";
import {
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Settings,
} from "lucide-react";
import OGImageUpload from "./OGImageUpload";

interface SEOConfig {
  seo_site_name?: string;
  seo_site_title_suffix?: string;
  seo_default_description?: string;
  seo_og_image_url?: string;
  seo_twitter_handle?: string;
  seo_activities_title?: string;
  seo_activities_description?: string;
  seo_news_title?: string;
  seo_news_description?: string;
  seo_faq_title?: string;
  seo_faq_description?: string;
  seo_robots_allow?: string[];
  seo_robots_disallow?: string[];
}

export default function SEOSettings() {
  const [config, setConfig] = useState<SEOConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Load current configuration
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/cms/seo-config");
      if (response.ok) {
        const data = await response.json();
        setConfig(data.seoConfig || {});
      } else {
        setMessage({ type: "error", text: "Failed to load SEO configuration" });
      }
    } catch (_error) {
      setMessage({ type: "error", text: "Error loading configuration" });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const response = await fetch("/api/admin/cms/seo-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setMessage({
          type: "success",
          text: "SEO configuration saved successfully!",
        });
      } else {
        const errorData = await response.json();
        setMessage({
          type: "error",
          text: errorData.error || "Failed to save configuration",
        });
      }
    } catch (_error) {
      setMessage({ type: "error", text: "Error saving configuration" });
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (field: keyof SEOConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const updateArrayField = (
    field: "seo_robots_allow" | "seo_robots_disallow",
    value: string,
  ) => {
    const array = value.split("\n").filter((item) => item.trim());
    updateConfig(field, array);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-yec-primary" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">
          Loading configuration...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center space-x-3 ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
              : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Basic SEO Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Basic SEO Settings
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure your site&apos;s core SEO metadata
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              Site Name
            </label>
            <input
              type="text"
              value={config.seo_site_name || ""}
              onChange={(e) => updateConfig("seo_site_name", e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
              placeholder="YEC Day"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Used in Open Graph and social sharing
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              Title Suffix
            </label>
            <input
              type="text"
              value={config.seo_site_title_suffix || ""}
              onChange={(e) =>
                updateConfig("seo_site_title_suffix", e.target.value)
              }
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
              placeholder="YEC Day"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Appended to all page titles (e.g., &quot;Page Title - YEC
              Day&quot;)
            </p>
          </div>

          <div className="lg:col-span-2 space-y-2">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              Default Meta Description
            </label>
            <textarea
              value={config.seo_default_description || ""}
              onChange={(e) =>
                updateConfig("seo_default_description", e.target.value)
              }
              rows={4}
              maxLength={160}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white text-sm resize-none"
              placeholder="Default description for pages without specific meta descriptions"
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Keep between 150-160 characters for optimal display
              </p>
              <span
                className={`text-xs font-medium ${
                  (config.seo_default_description?.length || 0) > 160
                    ? "text-red-500"
                    : (config.seo_default_description?.length || 0) > 150
                      ? "text-yellow-500"
                      : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {config.seo_default_description?.length || 0}/160
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              Open Graph Image
            </label>
            <OGImageUpload
              value={config.seo_og_image_url || ""}
              onChange={(url) => updateConfig("seo_og_image_url", url)}
              disabled={loading || saving}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              Twitter Handle
            </label>
            <input
              type="text"
              value={config.seo_twitter_handle || ""}
              onChange={(e) =>
                updateConfig("seo_twitter_handle", e.target.value)
              }
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
              placeholder="@yecday"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Twitter handle for Twitter Cards (include @ symbol)
            </p>
          </div>
        </div>
      </div>

      {/* Content Type Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
            <Settings className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Content Type Settings
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure default titles and descriptions for each content type
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Activities */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">
                  A
                </span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                Activities
              </h4>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                  Page Title
                </label>
                <input
                  type="text"
                  value={config.seo_activities_title || ""}
                  onChange={(e) =>
                    updateConfig("seo_activities_title", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-600 dark:text-white text-sm"
                  placeholder="Activities"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Title for the activities listing page
                </p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                  Meta Description
                </label>
                <input
                  type="text"
                  value={config.seo_activities_description || ""}
                  onChange={(e) =>
                    updateConfig("seo_activities_description", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-600 dark:text-white text-sm"
                  placeholder="Explore all available activities and events"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Description for search engines
                </p>
              </div>
            </div>
          </div>

          {/* News */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 dark:text-purple-400 font-bold text-sm">
                  N
                </span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                News
              </h4>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                  Page Title
                </label>
                <input
                  type="text"
                  value={config.seo_news_title || ""}
                  onChange={(e) =>
                    updateConfig("seo_news_title", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-600 dark:text-white text-sm"
                  placeholder="News"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Title for the news listing page
                </p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                  Meta Description
                </label>
                <input
                  type="text"
                  value={config.seo_news_description || ""}
                  onChange={(e) =>
                    updateConfig("seo_news_description", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-600 dark:text-white text-sm"
                  placeholder="Latest news and updates"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Description for search engines
                </p>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <span className="text-orange-600 dark:text-orange-400 font-bold text-sm">
                  F
                </span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                FAQ
              </h4>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                  Page Title
                </label>
                <input
                  type="text"
                  value={config.seo_faq_title || ""}
                  onChange={(e) =>
                    updateConfig("seo_faq_title", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-600 dark:text-white text-sm"
                  placeholder="FAQ"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Title for the FAQ listing page
                </p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                  Meta Description
                </label>
                <input
                  type="text"
                  value={config.seo_faq_description || ""}
                  onChange={(e) =>
                    updateConfig("seo_faq_description", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-600 dark:text-white text-sm"
                  placeholder="Frequently asked questions and answers"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Description for search engines
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Robots.txt Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
            <Settings className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Robots.txt Configuration
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Control which pages search engines can crawl
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              Allowed Paths
            </label>
            <textarea
              value={config.seo_robots_allow?.join("\n") || ""}
              onChange={(e) =>
                updateArrayField("seo_robots_allow", e.target.value)
              }
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white text-sm font-mono resize-none"
              placeholder="/&#10;/activities&#10;/news&#10;/faq"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              One path per line. These paths will be accessible to search
              engines.
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              Disallowed Paths
            </label>
            <textarea
              value={config.seo_robots_disallow?.join("\n") || ""}
              onChange={(e) =>
                updateArrayField("seo_robots_disallow", e.target.value)
              }
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white text-sm font-mono resize-none"
              placeholder="/admin/&#10;/api/&#10;/checker/&#10;/preview/&#10;/_next/"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              One path per line. These paths will be blocked from search
              engines.
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveConfig}
          disabled={saving}
          className="px-8 py-4 bg-yec-primary text-white rounded-xl hover:bg-yec-accent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          {saving ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          <span className="font-semibold">
            {saving ? "Saving Configuration..." : "Save SEO Configuration"}
          </span>
        </button>
      </div>
    </div>
  );
}
