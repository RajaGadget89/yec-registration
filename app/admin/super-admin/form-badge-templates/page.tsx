"use client";

import { useState, useEffect, useCallback } from "react";
import AdminHeader from "../../_components/AdminHeader";
import { FormType } from "../../../types/form-system";
import BadgeTemplateEditor from "./_components/BadgeTemplateEditor";

interface BadgeTemplate {
  logo_url?: string;
  title_text: string;
  subtitle_text?: string;
  background_color: string;
  text_color: string;
  fields: string[];
  layout: "vertical" | "horizontal";
  font_family?: string;
  font_size?: {
    title: number;
    subtitle: number;
    field: number;
  };
  dimensions: {
    width: number;
    height: number;
  };
}

interface FormBadgeStatus {
  form_key: string;
  form_name: string;
  has_template: boolean;
  template?: BadgeTemplate;
  badge_stats?: {
    total_registrations: number;
    badges_generated: number;
    badges_pending: number;
    badge_generation_rate: number;
  };
}

export default function FormBadgeTemplatesPage() {
  const [forms, setForms] = useState<FormType[]>([]);
  const [badgeStatus, setBadgeStatus] = useState<FormBadgeStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<FormType | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  // pagination & filters
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [_totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  const loadForms = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/cms/form-types");
      if (response.ok) {
        const data = await response.json();
        setForms(data.formTypes || []);
      }
    } catch (error) {
      console.error("Failed to load forms:", error);
    }
  }, []);

  const loadBadgeStatus = useCallback(
    async (page: number = 1) => {
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(itemsPerPage),
          search: searchTerm,
        });
        const response = await fetch(
          `/api/admin/super-admin/form-badge-templates/status?${params}`,
        );
        if (response.ok) {
          const data = await response.json();
          setBadgeStatus(data.badgeStatus || []);
          setTotalPages(data.totalPages || 1);
          setTotalItems(data.totalItems || 0);
          setCurrentPage(page);
        }
      } catch (error) {
        console.error("Failed to load badge status:", error);
      } finally {
        setLoading(false);
      }
    },
    [itemsPerPage, searchTerm],
  );

  useEffect(() => {
    loadForms();
    loadBadgeStatus(1);
  }, [loadForms, loadBadgeStatus]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    const t = setTimeout(() => loadBadgeStatus(1), 300);
    return () => clearTimeout(t);
  };

  const handlePageChange = (p: number) => loadBadgeStatus(p);

  const handleEditTemplate = (form: FormType) => {
    setSelectedForm(form);
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setSelectedForm(null);
    setShowEditor(false);
    loadBadgeStatus(); // Refresh status after changes
  };

  const getBadgeStatus = (formKey: string) => {
    return badgeStatus.find((status) => status.form_key === formKey);
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
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <AdminHeader
          compact
          title="Form Badge Templates"
          subtitle="Configure badge templates for each registration form"
        />

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Search */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
            <input
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
              placeholder="Search forms..."
            />
          </div>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Forms & Badge Template Status
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
                    Template Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Badge Stats
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {forms.map((form) => {
                  const status = getBadgeStatus(form.form_key);

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
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            status?.has_template
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          }`}
                        >
                          {status?.has_template
                            ? "Template Configured"
                            : "No Template"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {status?.badge_stats ? (
                          <div className="text-sm text-gray-900 dark:text-white">
                            <div>
                              Generated: {status.badge_stats.badges_generated} /{" "}
                              {status.badge_stats.total_registrations}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Rate: {status.badge_stats.badge_generation_rate}%
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
                          onClick={() => handleEditTemplate(form)}
                          className="text-yec-primary hover:text-yec-accent transition-colors"
                        >
                          {status?.has_template
                            ? "Edit Template"
                            : "Configure Template"}
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
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Badge Template Editor Modal */}
        {showEditor && selectedForm && (
          <BadgeTemplateEditor
            form={selectedForm}
            onClose={handleCloseEditor}
            onSave={handleCloseEditor}
          />
        )}
      </div>
    </div>
  );
}
