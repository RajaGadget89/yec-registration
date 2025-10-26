"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Play,
  RefreshCw,
  Database,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface EmbeddingJob {
  id: string;
  type: string;
  item_id: string;
  action: string;
  status: string;
  created_at: string;
  processed_at?: string;
}

export default function EmbeddingTriggerPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [jobs, setJobs] = useState<EmbeddingJob[]>([]);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [limit, setLimit] = useState<string>("10");
  const [fullReindex, setFullReindex] = useState(false);

  const contentTypes = [
    { value: "all", label: "All Types" },
    { value: "news", label: "News" },
    { value: "activities", label: "Activities" },
    { value: "pages", label: "Pages" },
    { value: "faq", label: "FAQ" },
  ];

  const handleTriggerEmbedding = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/embed-direct", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer mcp_admin_c965ab92c0f984ff3ebc2f1c2caf3fdc",
        },
        body: JSON.stringify({
          type: selectedType === "all" ? undefined : selectedType,
          limit: parseInt(limit),
          fullReindex,
        }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        console.log("Embedding generation completed successfully");
      }
    } catch (_error) {
      setResult({ error: "Failed to trigger embedding generation" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await fetch("/api/admin/embedding-jobs", {
        headers: {
          Authorization: "Bearer mcp_admin_c965ab92c0f984ff3ebc2f1c2caf3fdc",
        },
      });
      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (_error) {
      console.error("Failed to fetch jobs:", _error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white text-blue-800">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Processing
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/admin/mcp-management"
              className="flex items-center text-blue-600 hover:text-blue-700"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </Link>
          </div>
          <button
            onClick={fetchJobs}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Jobs
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Embedding Trigger
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Manually trigger embedding generation for CMS content
          </p>
        </div>

        {/* Filter and Action Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search embeddings..."
                  className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>All Status</option>
                <option>Pending</option>
                <option>Processing</option>
                <option>Completed</option>
                <option>Failed</option>
              </select>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>10 per page</option>
                <option>25 per page</option>
                <option>50 per page</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedType("all");
                  setLimit("20");
                  setFullReindex(true);
                }}
                className="px-4 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-white transition-colors"
              >
                Reindex All
              </button>
              <button
                onClick={handleTriggerEmbedding}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold text-base"
                style={{ color: "white", fontWeight: "600" }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                    <span style={{ color: "white", fontWeight: "600" }}>
                      Processing...
                    </span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2 inline" />
                    <span style={{ color: "white", fontWeight: "600" }}>
                      Trigger Generation
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trigger Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-4">
              <Database className="w-6 h-6 mr-3 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Trigger Embedding Generation
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Generate embeddings for CMS content to enable vector search
            </p>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="type"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Content Type
                </label>
                <select
                  id="type"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {contentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="limit"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Job Limit
                </label>
                <input
                  id="limit"
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  placeholder="Number of jobs to process"
                  min="1"
                  max="50"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="fullReindex"
                  type="checkbox"
                  checked={fullReindex}
                  onChange={(e) => setFullReindex(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="fullReindex" className="text-sm text-gray-700">
                  Full Reindex (clear existing embeddings)
                </label>
              </div>

              {result && (
                <div
                  className={`p-3 rounded-md ${
                    result.error
                      ? "bg-red-50 border border-red-200"
                      : "bg-green-50 border border-green-200"
                  }`}
                >
                  <pre className="text-sm whitespace-pre-wrap">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Jobs Status */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              Recent Jobs
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Status of recent embedding generation jobs
            </p>

            {jobs.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No jobs found</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {jobs.slice(0, 10).map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{job.type}</span>
                        <span className="text-sm text-gray-500">
                          #{job.item_id.slice(0, 8)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {job.action} •{" "}
                        {new Date(job.created_at).toLocaleString()}
                      </div>
                    </div>
                    {getStatusBadge(job.status)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
            Quick Actions
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Common embedding operations
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={() => {
                setSelectedType("news");
                setLimit("5");
                setFullReindex(false);
              }}
            >
              Process Latest News
            </button>
            <button
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={() => {
                setSelectedType("all");
                setLimit("20");
                setFullReindex(true);
              }}
            >
              Reindex All
            </button>
            <button
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={() => {
                setSelectedType("activities");
                setLimit("10");
                setFullReindex(false);
              }}
            >
              Update Activities
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
