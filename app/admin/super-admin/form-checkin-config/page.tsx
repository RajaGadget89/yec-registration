"use client";

import { useState, useEffect } from "react";
import { FormType } from "../../../types/form-system";
import CheckinConfigEditor from "./_components/CheckinConfigEditor";

interface CheckinEvent {
  id: string;
  name: string;
  description?: string;
  event_date: string;
  location?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FormCheckinPoint {
  id: string;
  form_key: string;
  checkin_event_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface _FormCheckinConfig {
  form_key: string;
  form_name: string;
  checkin_points: FormCheckinPoint[];
  available_events: CheckinEvent[];
}

interface FormCheckinStatus {
  form_key: string;
  form_name: string;
  checkin_points: FormCheckinPoint[];
  available_events: CheckinEvent[];
  stats?: {
    total_registrations: number;
    checked_in: number;
    not_checked_in: number;
    checkin_rate: number;
    by_event: Record<string, { total: number; checked_in: number }>;
  };
}

export default function FormCheckinConfigPage() {
  const [forms, setForms] = useState<FormType[]>([]);
  const [checkinStatus, setCheckinStatus] = useState<FormCheckinStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<FormType | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    loadForms();
    loadCheckinStatus();
  }, []);

  const loadForms = async () => {
    try {
      const response = await fetch("/api/admin/cms/form-types");
      if (response.ok) {
        const data = await response.json();
        setForms(data.formTypes || []);
      }
    } catch (error) {
      console.error("Failed to load forms:", error);
    }
  };

  const loadCheckinStatus = async () => {
    try {
      const response = await fetch(
        "/api/admin/super-admin/form-checkin-config/status",
      );
      if (response.ok) {
        const data = await response.json();
        setCheckinStatus(data.checkinStatus || []);
      }
    } catch (error) {
      console.error("Failed to load check-in status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditConfig = (form: FormType) => {
    setSelectedForm(form);
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setSelectedForm(null);
    setShowEditor(false);
    loadCheckinStatus(); // Refresh status after changes
  };

  const getCheckinStatus = (formKey: string) => {
    return checkinStatus.find((status) => status.form_key === formKey);
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
            Form Check-in Configuration
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure check-in points for each registration form
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Forms & Check-in Configuration
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Form
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Check-in Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Check-in Stats
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {forms.map((form) => {
                  const status = getCheckinStatus(form.form_key);

                  return (
                    <tr
                      key={form.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {form.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {form.form_key}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {status?.checkin_points?.length || 0} points
                          configured
                        </div>
                        {status?.checkin_points &&
                          status.checkin_points.length > 0 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {status.checkin_points
                                .map((point) => point.checkin_event_id)
                                .join(", ")}
                            </div>
                          )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {status?.stats ? (
                          <div className="text-sm text-gray-900 dark:text-white">
                            <div>
                              Checked in: {status.stats.checked_in} /{" "}
                              {status.stats.total_registrations}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Rate: {status.stats.checkin_rate}%
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            No data
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEditConfig(form)}
                          className="text-yec-primary hover:text-yec-accent transition-colors"
                        >
                          Configure Check-in
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {forms.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 dark:text-gray-400">
                No forms found. Create a form first in the Form Builder.
              </div>
            </div>
          )}
        </div>

        {/* Check-in Configuration Editor Modal */}
        {showEditor && selectedForm && (
          <CheckinConfigEditor
            form={selectedForm}
            onClose={handleCloseEditor}
            onSave={handleCloseEditor}
          />
        )}
      </div>
    </div>
  );
}
