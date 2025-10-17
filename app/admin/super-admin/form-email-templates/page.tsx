"use client";

import { useState, useEffect, useCallback } from "react";
import { Search } from "lucide-react";
import { FormType } from "../../../types/form-system";
import TemplateEditor from "./_components/TemplateEditor";

interface EmailTemplate {
  template_type: "tracking" | "approval" | "rejection" | "update_request";
  subject_template: string;
  body_variables: Record<string, any>;
  base_template: string;
  is_active: boolean;
}

interface FormEmailStatus {
  form_key: string;
  form_name: string;
  templates: EmailTemplate[];
  has_templates: boolean;
}

export default function FormEmailTemplatesPage() {
  const [forms, setForms] = useState<FormType[]>([]);
  const [emailStatus, setEmailStatus] = useState<FormEmailStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<FormType | null>(null);
  const [selectedTemplateType, setSelectedTemplateType] = useState<
    string | null
  >(null);
  const [showEditor, setShowEditor] = useState(false);
  // pagination & filters
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [_totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const loadEmailStatus = useCallback(
    async (page: number = 1) => {
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(itemsPerPage),
          search: searchTerm,
          status: statusFilter,
        });
        const response = await fetch(
          `/api/admin/super-admin/form-email-templates/status?${params}`,
        );
        if (response.ok) {
          const data = await response.json();
          setEmailStatus(data.emailStatus || []);
          setTotalPages(data.totalPages || 1);
          setTotalItems(data.totalItems || 0);
          setCurrentPage(page);
        }
      } catch (error) {
        console.error("Failed to load email status:", error);
      } finally {
        setLoading(false);
      }
    },
    [itemsPerPage, searchTerm, statusFilter],
  );

  useEffect(() => {
    loadForms();
    loadEmailStatus(1);
  }, [loadForms, loadEmailStatus]);

  useEffect(() => {
    const t = setTimeout(() => loadEmailStatus(1), 300);
    return () => clearTimeout(t);
  }, [searchTerm, statusFilter, loadEmailStatus]);

  const handlePageChange = (p: number) => loadEmailStatus(p);

  const handleEditTemplate = (form: FormType, templateType: string) => {
    setSelectedForm(form);
    setSelectedTemplateType(templateType);
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setSelectedForm(null);
    setSelectedTemplateType(null);
    setShowEditor(false);
    loadEmailStatus(); // Refresh status after changes
  };

  const getEmailStatus = (formKey: string) => {
    return emailStatus.find((status) => status.form_key === formKey);
  };

  const getTemplateTypeLabel = (type: string) => {
    const labels = {
      tracking: "Tracking Email",
      approval: "Approval Email",
      rejection: "Rejection Email",
      update_request: "Update Request Email",
    };
    return labels[type as keyof typeof labels] || type;
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
        {/* Header card to match News Management */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 p-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
              Form Email Templates
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Create, edit, and manage email templates per registration form
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[75vh] flex flex-col">
          {/* Search & Filters */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="relative w-full sm:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
                  placeholder="Search forms..."
                />
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Status</option>
                  <option value="configured">Configured</option>
                  <option value="not_configured">Not Configured</option>
                </select>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Forms & Email Template Status
            </h2>
          </div>

          {/* Scrollable table area to keep page height compact */}
          <div className="overflow-x-auto flex-1">
            <div className="max-h-[58vh] overflow-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Form
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Templates
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {forms.map((form) => {
                    const status = getEmailStatus(form.form_key);
                    const templateTypes = [
                      "tracking",
                      "approval",
                      "rejection",
                      "update_request",
                    ];

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
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {templateTypes.map((type) => {
                              const hasTemplate = status?.templates?.some(
                                (t) => t.template_type === type,
                              );
                              return (
                                <span
                                  key={type}
                                  className={`inline-flex px-2 py-1 text-xs rounded-full ${hasTemplate ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" : "bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400"}`}
                                >
                                  {getTemplateTypeLabel(type)}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${status?.has_templates ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"}`}
                          >
                            {status?.has_templates
                              ? "Configured"
                              : "Not Configured"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {templateTypes.map((type) => {
                              const hasTemplate = status?.templates?.some(
                                (t) => t.template_type === type,
                              );
                              return (
                                <button
                                  key={type}
                                  onClick={() => handleEditTemplate(form, type)}
                                  className={`px-2 py-1 rounded transition-colors ${hasTemplate ? "text-yec-primary hover:text-yec-accent" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"}`}
                                >
                                  {getTemplateTypeLabel(type)}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {forms.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 dark:text-gray-400">
                No forms found. Create a form first in the Form Builder.
              </div>
            </div>
          )}

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

        {showEditor && selectedForm && selectedTemplateType && (
          <TemplateEditor
            form={selectedForm}
            templateType={selectedTemplateType}
            onClose={handleCloseEditor}
            onSave={handleCloseEditor}
          />
        )}
      </div>
    </div>
  );
}
