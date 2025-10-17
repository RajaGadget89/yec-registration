"use client";

import { useState } from "react";
import { FormType } from "../../../../types/form-system";
import {
  Download,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
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

interface ImportJobListProps {
  form: FormType;
  jobs: ImportJob[];
  onJobSelected: (job: ImportJob) => void;
  onJobDeleted: () => void;
}

export default function ImportJobList({
  form,
  jobs,
  onJobSelected,
  onJobDeleted,
}: ImportJobListProps) {
  const [deletingJob, setDeletingJob] = useState<string | null>(null);

  const handleDeleteJob = async (jobId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this import job? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      setDeletingJob(jobId);
      const response = await fetch(
        `/api/admin/super-admin/form-import/jobs/${jobId}`,
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
      setDeletingJob(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "processing":
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      case "pending":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "processing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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

  const getProgressPercentage = (job: ImportJob) => {
    if (job.total_rows === 0) return 0;
    return Math.round((job.processed_rows / job.total_rows) * 100);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Import Jobs for {form.name}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {jobs.length} job{jobs.length !== 1 ? "s" : ""} found
          </p>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400 mb-4">
            No import jobs found for this form
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Create your first import job to get started
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getStatusIcon(job.status)}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {job.file_name}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>{formatFileSize(job.file_size)}</span>
                        <span>{job.total_rows} rows</span>
                        <span>Created {formatDate(job.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 mb-3">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        job.status,
                      )}`}
                    >
                      {job.status.toUpperCase()}
                    </span>
                    {job.status === "processing" && (
                      <span className="text-sm text-blue-600 dark:text-blue-400">
                        Processing... {getProgressPercentage(job)}%
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {job.status === "processing" && (
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-3">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getProgressPercentage(job)}%` }}
                      ></div>
                    </div>
                  )}

                  {/* Results Summary */}
                  {job.status === "completed" && (
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-green-600 dark:text-green-400">
                        ✓ {job.successful_rows} successful
                      </span>
                      {job.failed_rows > 0 && (
                        <span className="text-red-600 dark:text-red-400">
                          ✗ {job.failed_rows} failed
                        </span>
                      )}
                    </div>
                  )}

                  {job.status === "failed" && job.error_message && (
                    <div className="text-sm text-red-600 dark:text-red-400">
                      Error: {job.error_message}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onJobSelected(job)}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {job.status === "completed" && (
                    <button
                      onClick={() => {
                        // TODO: Implement download functionality
                        alert("Download functionality not yet implemented");
                      }}
                      className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      title="Download Results"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteJob(job.id)}
                    disabled={deletingJob === job.id}
                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete Job"
                  >
                    {deletingJob === job.id ? (
                      <Clock className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
