"use client";

import { useState, useEffect } from "react";
import { ImportWizard } from "@/components/import/ImportWizard";
import { ImportDashboard } from "@/components/import/ImportDashboard";
import { ImportHistory } from "@/components/import/ImportHistory";
// import { ImportProgress } from '@/components/import/ImportProgress';

interface ImportSession {
  id: string;
  filename: string;
  status: "processing" | "completed" | "failed" | "rolled_back";
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  createdAt: string;
  completedAt?: string;
}

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<
    "wizard" | "dashboard" | "history"
  >("wizard");
  const [activeSession, setActiveSession] = useState<ImportSession | null>(
    null,
  );
  const [sessions, setSessions] = useState<ImportSession[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Ensure client-side rendering
  useEffect(() => {
    setIsClient(true);
    fetchImportSessions();
  }, []);

  const fetchImportSessions = async () => {
    try {
      const response = await fetch("/api/admin/import/history");
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error("Error fetching import sessions:", error);
    }
  };

  const handleSessionStart = (session: ImportSession) => {
    setActiveSession(session);
    setActiveTab("dashboard");
  };

  const handleSessionComplete = () => {
    setActiveSession(null);
    fetchImportSessions();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Google Form Import
          </h1>
          <p className="mt-2 text-gray-600">
            Import registration data from Google Forms CSV files with automatic
            processing, badge generation, and email notifications.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("wizard")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "wizard"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Import Wizard
            </button>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "dashboard"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Management Dashboard
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "history"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Import History
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow">
          {isClient ? (
            <>
              {activeTab === "wizard" && (
                <ImportWizard
                  onSessionStart={handleSessionStart}
                  onSessionComplete={handleSessionComplete}
                />
              )}

              {activeTab === "dashboard" && (
                <ImportDashboard
                  activeSession={activeSession}
                  onSessionUpdate={fetchImportSessions}
                />
              )}

              {activeTab === "history" && (
                <ImportHistory
                  sessions={sessions}
                  onSessionSelect={handleSessionStart}
                  onRefresh={fetchImportSessions}
                />
              )}
            </>
          ) : (
            <div className="p-6">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
