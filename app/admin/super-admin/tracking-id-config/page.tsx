"use client";

import { useState, useEffect } from "react";
import { FormType } from "@/app/types/form-system";
import TrackingIdConfigEditor from "./_components/TrackingIdConfigEditor";

interface TrackingIdConfig {
  prefix: string;
  sequence_start: number;
  sequence_length: number;
  format: string; // e.g., "PREFIX-000001"
  is_active: boolean;
}

interface FormTrackingStatus {
  form_key: string;
  form_name: string;
  has_config: boolean;
  current_sequence?: number;
  last_generated?: string;
  config?: TrackingIdConfig;
}

export default function TrackingIdConfigPage() {
  const [forms, setForms] = useState<FormType[]>([]);
  const [trackingStatus, setTrackingStatus] = useState<FormTrackingStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<FormType | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    loadForms();
    loadTrackingStatus();
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

  const loadTrackingStatus = async () => {
    try {
      const response = await fetch("/api/admin/super-admin/tracking-id-config/status");
      if (response.ok) {
        const data = await response.json();
        setTrackingStatus(data.trackingStatus || []);
      }
    } catch (error) {
      console.error("Failed to load tracking status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTracking = (form: FormType) => {
    setSelectedForm(form);
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setSelectedForm(null);
    setShowEditor(false);
    loadTrackingStatus(); // Refresh status after changes
  };

  const getTrackingStatus = (formKey: string) => {
    return trackingStatus.find(status => status.form_key === formKey);
  };

  const generatePreviewId = (config: TrackingIdConfig) => {
    const paddedSequence = config.sequence_start.toString().padStart(config.sequence_length, '0');
    return config.format.replace('PREFIX', config.prefix).replace('000000', paddedSequence);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
            Tracking ID Configuration
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure tracking ID format and sequence for each registration form
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Forms & Tracking ID Status
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
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Current Sequence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Preview ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {forms.map((form) => {
                  const status = getTrackingStatus(form.form_key);
                  const previewId = status?.config ? generatePreviewId(status.config) : "—";
                  
                  return (
                    <tr key={form.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
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
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            status?.has_config
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          }`}
                        >
                          {status?.has_config ? "Configured" : "Not Configured"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {status?.current_sequence !== undefined ? status.current_sequence : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-mono">
                        {previewId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEditTracking(form)}
                          className="text-yec-primary hover:text-yec-accent transition-colors"
                        >
                          {status?.has_config ? "Edit Configuration" : "Configure Tracking ID"}
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

        {/* Tracking ID Config Editor Modal */}
        {showEditor && selectedForm && (
          <TrackingIdConfigEditor
            form={selectedForm}
            onClose={handleCloseEditor}
            onSave={handleCloseEditor}
          />
        )}
      </div>
    </div>
  );
}
