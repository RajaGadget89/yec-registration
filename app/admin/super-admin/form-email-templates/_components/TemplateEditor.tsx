"use client";

import { useState, useEffect } from "react";
import { FormType } from "@/app/types/form-system";

interface EmailTemplate {
  template_type: "tracking" | "approval" | "rejection" | "update_request";
  subject_template: string;
  body_variables: Record<string, any>;
  base_template: string;
  is_active: boolean;
}

interface TemplateEditorProps {
  form: FormType;
  templateType: string;
  onClose: () => void;
  onSave: () => void;
}

const BASE_TEMPLATES = {
  tracking: {
    subject: "Registration Confirmation - {{event_name}}",
    body: `
Dear {{name}},

Thank you for registering for {{event_name}}!

Your registration details:
- Tracking ID: {{tracking_id}}
- Event: {{event_name}}
- Date: {{event_date}}
- Location: {{event_location}}

Please keep this email as your confirmation.

Best regards,
{{organization_name}}
    `.trim(),
  },
  approval: {
    subject: "Registration Approved - {{event_name}}",
    body: `
Dear {{name}},

Congratulations! Your registration for {{event_name}} has been approved.

Your approved registration:
- Tracking ID: {{tracking_id}}
- Event: {{event_name}}
- Date: {{event_date}}
- Location: {{event_location}}

You will receive your badge and further instructions closer to the event date.

Best regards,
{{organization_name}}
    `.trim(),
  },
  rejection: {
    subject: "Registration Update Required - {{event_name}}",
    body: `
Dear {{name}},

Thank you for your interest in {{event_name}}. We need some additional information to process your registration.

Please review and update the following:
{{rejection_reasons}}

You can update your registration using your tracking ID: {{tracking_id}}

Best regards,
{{organization_name}}
    `.trim(),
  },
  update_request: {
    subject: "Registration Update Required - {{event_name}}",
    body: `
Dear {{name}},

We need some additional information to complete your registration for {{event_name}}.

Please provide the following:
{{update_requirements}}

You can update your registration using your tracking ID: {{tracking_id}}

Best regards,
{{organization_name}}
    `.trim(),
  },
};

const AVAILABLE_VARIABLES = {
  common: [
    "{{name}}",
    "{{email}}",
    "{{phone}}",
    "{{tracking_id}}",
    "{{event_name}}",
    "{{event_date}}",
    "{{event_location}}",
    "{{organization_name}}",
    "{{registration_date}}",
  ],
  approval: [
    "{{approval_date}}",
    "{{approver_name}}",
    "{{badge_ready_date}}",
  ],
  rejection: [
    "{{rejection_reasons}}",
    "{{rejection_date}}",
    "{{reviewer_name}}",
  ],
  update_request: [
    "{{update_requirements}}",
    "{{deadline_date}}",
    "{{contact_person}}",
  ],
};

export default function TemplateEditor({
  form,
  templateType,
  onClose,
  onSave,
}: TemplateEditorProps) {
  const [template, setTemplate] = useState<EmailTemplate>({
    template_type: templateType as any,
    subject_template: "",
    body_variables: {},
    base_template: "default",
    is_active: true,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadExistingTemplate();
    initializePreviewData();
  }, [form, templateType]);

  const loadExistingTemplate = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/super-admin/form-email-templates/${form.form_key}/${templateType}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.template) {
          setTemplate(data.template);
        } else {
          // Initialize with base template
          const baseTemplate = BASE_TEMPLATES[templateType as keyof typeof BASE_TEMPLATES];
          setTemplate({
            template_type: templateType as any,
            subject_template: baseTemplate.subject,
            body_variables: {},
            base_template: "default",
            is_active: true,
          });
        }
      }
    } catch (error) {
      console.error("Failed to load template:", error);
    } finally {
      setLoading(false);
    }
  };

  const initializePreviewData = () => {
    setPreviewData({
      name: "John Doe",
      email: "john.doe@example.com",
      phone: "+66 123 456 789",
      tracking_id: `${form.form_key.toUpperCase()}-000001`,
      event_name: form.name,
      event_date: "March 15, 2025",
      event_location: "Bangkok, Thailand",
      organization_name: "YEC Organization",
      registration_date: new Date().toLocaleDateString(),
      approval_date: new Date().toLocaleDateString(),
      approver_name: "Admin User",
      badge_ready_date: "March 10, 2025",
      rejection_reasons: "• Missing payment slip\n• Incomplete profile information",
      rejection_date: new Date().toLocaleDateString(),
      reviewer_name: "Review Team",
      update_requirements: "• Payment slip\n• Profile photo\n• Emergency contact",
      deadline_date: "March 1, 2025",
      contact_person: "Registration Team",
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(
        `/api/admin/super-admin/form-email-templates/${form.form_key}/${templateType}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ template }),
        }
      );

      if (response.ok) {
        onSave();
      } else {
        const error = await response.json();
        alert(`Failed to save template: ${error.message}`);
      }
    } catch (error) {
      console.error("Failed to save template:", error);
      alert("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const updateTemplate = (updates: Partial<EmailTemplate>) => {
    setTemplate((prev) => ({ ...prev, ...updates }));
  };

  const updateBodyVariable = (key: string, value: any) => {
    setTemplate((prev) => ({
      ...prev,
      body_variables: {
        ...prev.body_variables,
        [key]: value,
      },
    }));
  };

  const getAvailableVariables = () => {
    const common = AVAILABLE_VARIABLES.common;
    const specific = AVAILABLE_VARIABLES[templateType as keyof typeof AVAILABLE_VARIABLES] || [];
    return [...common, ...specific];
  };

  const renderPreview = (text: string) => {
    let rendered = text;
    Object.entries(previewData).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      rendered = rendered.replace(new RegExp(placeholder, 'g'), value);
    });
    return rendered;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Email Template Editor
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {form.name} - {templateType.charAt(0).toUpperCase() + templateType.slice(1)} Template
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Template Editor */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Template Configuration
              </h3>

              {/* Subject Template */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subject Template
                </label>
                <input
                  type="text"
                  value={template.subject_template}
                  onChange={(e) => updateTemplate({ subject_template: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="Enter subject template"
                />
              </div>

              {/* Body Template */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Body Template
                </label>
                <textarea
                  value={template.body_variables.body || ""}
                  onChange={(e) => updateBodyVariable("body", e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white font-mono text-sm"
                  placeholder="Enter body template"
                />
              </div>

              {/* Active Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={template.is_active}
                  onChange={(e) => updateTemplate({ is_active: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
                  Active (use this template)
                </label>
              </div>
            </div>

            {/* Variables and Preview */}
            <div className="space-y-4">
              {/* Available Variables */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  Available Variables
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Click to copy variable:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getAvailableVariables().map((variable) => (
                      <button
                        key={variable}
                        onClick={() => {
                          navigator.clipboard.writeText(variable);
                        }}
                        className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        {variable}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Preview
                  </h3>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-sm text-yec-primary hover:text-yec-accent"
                  >
                    {showPreview ? "Hide Preview" : "Show Preview"}
                  </button>
                </div>

                {showPreview && (
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-3">
                    <div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Subject:
                      </div>
                      <div className="text-sm text-gray-900 dark:text-white">
                        {renderPreview(template.subject_template)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Body:
                      </div>
                      <div className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                        {renderPreview(template.body_variables.body || "")}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Template"}
          </button>
        </div>
      </div>
    </div>
  );
}
