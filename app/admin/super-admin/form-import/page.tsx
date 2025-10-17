"use client";

import { useState, useEffect } from "react";
import { FormType } from "../../../types/form-system";
import ImportJobList from "./_components/ImportJobList";
import ImportJobCreator from "./_components/ImportJobCreator";
import ImportJobDetails from "./_components/ImportJobDetails";

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

interface ImportStats {
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  total_imported: number;
  total_failed: number;
}

export default function FormImportPage() {
  const [forms, setForms] = useState<FormType[]>([]);
  const [selectedForm, setSelectedForm] = useState<FormType | null>(null);
  const [importJobs, setImportJobs] = useState<ImportJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<ImportJob | null>(null);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"jobs" | "create" | "details">(
    "jobs",
  );

  useEffect(() => {
    loadForms();
  }, []);

  useEffect(() => {
    if (selectedForm) {
      loadImportJobs(selectedForm.form_key);
      loadImportStats(selectedForm.form_key);
    }
  }, [selectedForm]);

  const loadForms = async () => {
    try {
      const response = await fetch("/api/admin/cms/form-types");
      if (response.ok) {
        const data = await response.json();
        setForms(data.formTypes || []);
        if (data.formTypes && data.formTypes.length > 0) {
          setSelectedForm(data.formTypes[0]);
        }
      }
    } catch (error) {
      console.error("Failed to load forms:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadImportJobs = async (formKey: string) => {
    try {
      const response = await fetch(
        `/api/admin/super-admin/form-import/jobs?form_key=${formKey}`,
      );
      if (response.ok) {
        const data = await response.json();
        setImportJobs(data.jobs || []);
      }
    } catch (error) {
      console.error("Failed to load import jobs:", error);
    }
  };

  const loadImportStats = async (formKey: string) => {
    try {
      const response = await fetch(
        `/api/admin/super-admin/form-import/stats?form_key=${formKey}`,
      );
      if (response.ok) {
        const data = await response.json();
        setImportStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to load import stats:", error);
    }
  };

  const handleJobCreated = () => {
    if (selectedForm) {
      loadImportJobs(selectedForm.form_key);
      loadImportStats(selectedForm.form_key);
    }
    setActiveTab("jobs");
  };

  const handleJobSelected = (job: ImportJob) => {
    setSelectedJob(job);
    setActiveTab("details");
  };

  const handleJobDeleted = () => {
    if (selectedForm) {
      loadImportJobs(selectedForm.form_key);
      loadImportStats(selectedForm.form_key);
    }
    setSelectedJob(null);
    setActiveTab("jobs");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-gray-200 dark:bg-gray-700 rounded"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Form Import Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Import registrations for specific forms via CSV/Excel files
          </p>
        </div>

        {/* Form Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Form:
            </label>
            <select
              value={selectedForm?.form_key || ""}
              onChange={(e) => {
                const form = forms.find((f) => f.form_key === e.target.value);
                setSelectedForm(form || null);
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yec-primary focus:border-transparent"
            >
              <option value="">Select a form...</option>
              {forms.map((form) => (
                <option key={form.id} value={form.form_key}>
                  {form.name} ({form.form_key})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedForm && (
          <>
            {/* Import Statistics */}
            {importStats && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {importStats.total_jobs}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Total Jobs
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {importStats.completed_jobs}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Completed
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {importStats.failed_jobs}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Failed
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {importStats.total_imported}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Imported
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {importStats.total_failed}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Failed Rows
                  </div>
                </div>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-8 px-6">
                  <button
                    onClick={() => setActiveTab("jobs")}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "jobs"
                        ? "border-yec-primary text-yec-primary"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Import Jobs
                  </button>
                  <button
                    onClick={() => setActiveTab("create")}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "create"
                        ? "border-yec-primary text-yec-primary"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Create Import
                  </button>
                  {selectedJob && (
                    <button
                      onClick={() => setActiveTab("details")}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === "details"
                          ? "border-yec-primary text-yec-primary"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Job Details
                    </button>
                  )}
                </nav>
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              {activeTab === "jobs" && (
                <ImportJobList
                  form={selectedForm}
                  jobs={importJobs}
                  onJobSelected={handleJobSelected}
                  onJobDeleted={handleJobDeleted}
                />
              )}

              {activeTab === "create" && (
                <ImportJobCreator
                  form={selectedForm}
                  onJobCreated={handleJobCreated}
                />
              )}

              {activeTab === "details" && selectedJob && (
                <ImportJobDetails
                  job={selectedJob}
                  onJobDeleted={handleJobDeleted}
                />
              )}
            </div>
          </>
        )}

        {!selectedForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <div className="text-gray-500 dark:text-gray-400">
              No forms available. Create a form first in the Form Builder.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
