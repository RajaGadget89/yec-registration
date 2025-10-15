"use client";

import { useState, useEffect } from "react";
import { FormType } from "@/app/types/form-system";
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
  const [selectedTemplateType, setSelectedTemplateType] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    loadForms();
    loadEmailStatus();
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

  const loadEmailStatus = async () => {
    try {
      const response = await fetch("/api/admin/super-admin/form-email-templates/status");
      if (response.ok) {
        const data = await response.json();
        setEmailStatus(data.emailStatus || []);
      }
    } catch (error) {
      console.error("Failed to load email status:", error);
    } finally {
      setLoading(false);
    }
  };

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
    return emailStatus.find(status => status.form_key === formKey);
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
            Form Email Templates
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure email templates for each registration form
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Forms & Email Template Status
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
                    Templates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {forms.map((form) => {
                  const status = getEmailStatus(form.form_key);
                  const templateTypes = ["tracking", "approval", "rejection", "update_request"];
                  
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
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {templateTypes.map((type) => {
                            const hasTemplate = status?.templates?.some(t => t.template_type === type);
                            return (
                              <span
                                key={type}
                                className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                  hasTemplate
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                                }`}
                              >
                                {getTemplateTypeLabel(type)}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            status?.has_templates
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          }`}
                        >
                          {status?.has_templates ? "Configured" : "Not Configured"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-wrap gap-2">
                          {templateTypes.map((type) => {
                            const hasTemplate = status?.templates?.some(t => t.template_type === type);
                            return (
                              <button
                                key={type}
                                onClick={() => handleEditTemplate(form, type)}
                                className={`text-sm px-2 py-1 rounded transition-colors ${
                                  hasTemplate
                                    ? "text-yec-primary hover:text-yec-accent"
                                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                }`}
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

          {forms.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 dark:text-gray-400">
                No forms found. Create a form first in the Form Builder.
              </div>
            </div>
          )}
        </div>

        {/* Template Editor Modal */}
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
