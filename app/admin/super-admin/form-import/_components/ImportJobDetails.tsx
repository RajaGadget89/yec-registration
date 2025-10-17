"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";

interface ImportJob {
  id: string;
  form_key: string;
  file_name: string;
  file_size: number;
  total_rows: number;
  processed_rows: number;
  successful_rows: number;
  failed_rows: number;
  status: "pending" | "processing" | "completed" | "failed";
  error_message?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface ImportItem {
  id: string;
  import_job_id: string;
  row_number: number;
  data: Record<string, any>;
  status: "pending" | "success" | "failed";
  error_message?: string;
  registration_id?: string;
  created_at: string;
}

interface ImportJobDetailsProps {
  job: ImportJob;
  onJobDeleted: () => void;
}

export default function ImportJobDetails({
  job,
  onJobDeleted,
}: ImportJobDetailsProps) {
  const [items, setItems] = useState<ImportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "success" | "failed" | "pending"
  >("all");
  const [deleting, setDeleting] = useState(false);

  const loadJobItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/super-admin/form-import/jobs/${job.id}/items`,
      );
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error("Failed to load job items:", error);
    } finally {
      setLoading(false);
    }
  }, [job.id]);

  useEffect(() => {
    loadJobItems();
  }, [job.id, loadJobItems]);

  const handleDeleteJob = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this import job? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch(
        `/api/admin/super-admin/form-import/jobs/${job.id}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        onJobDeleted();
      } else {
        const error = await response.json();
        alert(`Failed to delete job: ${error.message}`);
      }
    } catch (error) {
      console.error("Failed to delete job:", error);
      alert("Failed to delete job");
    } finally {
      setDeleting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getProgressPercentage = () => {
    if (job.total_rows === 0) return 0;
    return Math.round((job.processed_rows / job.total_rows) * 100);
  };

  const filteredItems = items.filter((item) => {
    if (filter === "all") return true;
    return item.status === filter;
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Import Job Details
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {job.file_name} • {formatFileSize(job.file_size)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadJobItems}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={handleDeleteJob}
              disabled={deleting}
              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors disabled:opacity-50"
              title="Delete Job"
            >
              {deleting ? (
                <Clock className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Job Status */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getStatusIcon(job.status)}
            <span
              className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(
                job.status,
              )}`}
            >
              {job.status.toUpperCase()}
            </span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Created {formatDate(job.created_at)}
          </div>
        </div>

        {/* Progress Bar */}
        {job.status === "processing" && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Processing...</span>
              <span>{getProgressPercentage()}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {job.total_rows}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Rows
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {job.successful_rows}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Successful
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {job.failed_rows}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Failed
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {job.processed_rows}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Processed
            </div>
          </div>
        </div>

        {job.error_message && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="text-sm text-red-700 dark:text-red-300">
              <strong>Error:</strong> {job.error_message}
            </div>
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Import Items
            </h3>
            <div className="flex items-center space-x-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Items</option>
                <option value="success">Successful</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yec-primary mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Loading items...
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No items found
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(item.status)}
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        Row {item.row_number}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {Object.keys(item.data).length} fields
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        item.status,
                      )}`}
                    >
                      {item.status.toUpperCase()}
                    </span>

                    {item.status === "success" && item.registration_id && (
                      <button
                        onClick={() => {
                          // TODO: Navigate to registration details
                          alert("Registration details not yet implemented");
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                      >
                        View Registration
                      </button>
                    )}

                    {item.status === "failed" && item.error_message && (
                      <div className="text-xs text-red-600 dark:text-red-400 max-w-xs truncate">
                        {item.error_message}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
