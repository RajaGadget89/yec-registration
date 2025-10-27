"use client";

import { useState } from "react";
import {
  Search,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Target,
  Globe,
  Zap,
  Settings,
} from "lucide-react";
import SEOSettings from "./SEOSettings";

interface SEOAnalysis {
  page_title: string;
  meta_description: string;
  keywords: string[];
  readability_score: number;
  seo_score: number;
  issues: Array<{
    type: "error" | "warning" | "info";
    message: string;
    suggestion?: string;
  }>;
  recommendations: string[];
  url: string;
  analyzed_at: string;
}

export default function SEOTools() {
  const [activeTab, setActiveTab] = useState<"analyzer" | "settings">(
    "analyzer",
  );
  const [analysis, setAnalysis] = useState<SEOAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState("");

  const analyzeSEO = async () => {
    if (!url.trim()) {
      alert("Please enter a URL to analyze");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/admin/cms/seo/analyze-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze SEO");
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (error) {
      console.error("Error analyzing SEO:", error);
      alert(
        `Failed to analyze SEO: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-100 dark:bg-green-900/20";
    if (score >= 60) return "bg-yellow-100 dark:bg-yellow-900/20";
    return "bg-red-100 dark:bg-red-900/20";
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-2 mb-6">
        <nav className="flex space-x-2">
          <button
            onClick={() => setActiveTab("analyzer")}
            className={`flex items-center space-x-3 px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeTab === "analyzer"
                ? "bg-yec-primary text-white shadow-md"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <Search className="w-5 h-5" />
            <span>SEO Analyzer</span>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center space-x-3 px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeTab === "settings"
                ? "bg-yec-primary text-white shadow-md"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <Settings className="w-5 h-5" />
            <span>SEO Settings</span>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "analyzer" && (
        <div className="space-y-8">
          {/* SEO Analyzer */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  SEO Analyzer
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Analyze any URL for SEO performance and get actionable
                  recommendations
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <input
                type="url"
                placeholder="Enter URL to analyze (e.g., https://example.com)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
              />
              <button
                onClick={analyzeSEO}
                disabled={loading || !url.trim()}
                className="px-8 py-3 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Search className="h-5 w-5" />
                )}
                <span className="font-semibold">
                  {loading ? "Analyzing..." : "Analyze URL"}
                </span>
              </button>
            </div>
          </div>

          {/* Analysis Results */}
          {analysis && (
            <div className="space-y-6">
              {/* SEO Score Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      SEO Score
                    </h3>
                    <TrendingUp className="h-5 w-5 text-gray-500" />
                  </div>
                  <div
                    className={`text-3xl font-bold ${getScoreColor(analysis.seo_score)}`}
                  >
                    {analysis.seo_score}/100
                  </div>
                  <div
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${getScoreBgColor(analysis.seo_score)} ${getScoreColor(analysis.seo_score)}`}
                  >
                    {analysis.seo_score >= 80
                      ? "Excellent"
                      : analysis.seo_score >= 60
                        ? "Good"
                        : "Needs Improvement"}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Readability
                    </h3>
                    <BarChart3 className="h-5 w-5 text-gray-500" />
                  </div>
                  <div
                    className={`text-3xl font-bold ${getScoreColor(analysis.readability_score)}`}
                  >
                    {analysis.readability_score}/100
                  </div>
                  <div
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${getScoreBgColor(analysis.readability_score)} ${getScoreColor(analysis.readability_score)}`}
                  >
                    {analysis.readability_score >= 80
                      ? "Very Readable"
                      : analysis.readability_score >= 60
                        ? "Readable"
                        : "Hard to Read"}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Keywords
                    </h3>
                    <Target className="h-5 w-5 text-gray-500" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {analysis.keywords.length}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Keywords found
                  </div>
                </div>
              </div>

              {/* Page Information */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Page Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Page Title
                    </label>
                    <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      {analysis.page_title || "No title found"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Meta Description
                    </label>
                    <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      {analysis.meta_description || "No meta description found"}
                    </div>
                  </div>
                  {analysis.keywords.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Keywords
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {analysis.keywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Issues and Recommendations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Issues */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Issues Found
                  </h3>
                  <div className="space-y-3">
                    {analysis.issues.map((issue, index) => (
                      <div
                        key={index}
                        className={`flex items-start space-x-3 p-3 rounded-lg ${
                          issue.type === "error"
                            ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                            : issue.type === "warning"
                              ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                              : "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                        }`}
                      >
                        {issue.type === "error" ? (
                          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                        ) : issue.type === "warning" ? (
                          <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {issue.message}
                          </p>
                          {issue.suggestion && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {issue.suggestion}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {analysis.issues.length === 0 && (
                      <div className="text-center py-4">
                        <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          No issues found!
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recommendations */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Recommendations
                  </h3>
                  <div className="space-y-3">
                    {analysis.recommendations.map((recommendation, index) => (
                      <div
                        key={index}
                        className="flex items-start space-x-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                      >
                        <Zap className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-900 dark:text-white">
                          {recommendation}
                        </p>
                      </div>
                    ))}
                    {analysis.recommendations.length === 0 && (
                      <div className="text-center py-4">
                        <Globe className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          No recommendations available
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick SEO Tips */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick SEO Tips
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    Title Optimization
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Keep titles between 50-60 characters for optimal display in
                    search results.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    Meta Descriptions
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Write compelling meta descriptions between 150-160
                    characters.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    Keyword Density
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Use keywords naturally throughout your content, aim for 1-2%
                    density.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    Content Structure
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Use proper heading hierarchy (H1, H2, H3) to structure your
                    content.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "settings" && <SEOSettings />}
    </div>
  );
}
