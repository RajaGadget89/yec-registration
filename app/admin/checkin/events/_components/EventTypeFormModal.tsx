"use client";

import { useEffect, useState } from "react";

export type BusinessRuleCategory = "MULTIPLE_ALLOWED" | "ONE_TIME_ONLY";

export interface EventTypeModel {
  id?: string;
  name: string;
  description: string;
  is_active: boolean;
  is_default: boolean;
  business_rule_category: BusinessRuleCategory;
}

export default function EventTypeFormModal({
  open,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initial?: Partial<EventTypeModel>;
  onClose: () => void;
  onSubmit: (payload: EventTypeModel) => void;
}) {
  const [form, setForm] = useState<EventTypeModel>({
    id: initial?.id,
    name: initial?.name || "",
    description: initial?.description || "",
    is_active: initial?.is_active ?? true,
    is_default: initial?.is_default ?? false,
    business_rule_category:
      (initial?.business_rule_category as BusinessRuleCategory) ||
      "MULTIPLE_ALLOWED",
  });

  // Sync form when switching between create/edit or selecting a different item
  useEffect(() => {
    if (!open) return;
    setForm({
      id: initial?.id,
      name: initial?.name || "",
      description: initial?.description || "",
      is_active: initial?.is_active ?? true,
      is_default: initial?.is_default ?? false,
      business_rule_category:
        (initial?.business_rule_category as BusinessRuleCategory) ||
        "MULTIPLE_ALLOWED",
    });
  }, [
    open,
    initial?.id,
    initial?.name,
    initial?.description,
    initial?.is_active,
    initial?.is_default,
    initial?.business_rule_category,
  ]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {form.id ? "Edit Event Type" : "Create Event Type"}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yec-primary focus:border-yec-primary"
              placeholder="Enter type name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yec-primary focus:border-yec-primary"
              placeholder="Enter description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Rule
            </label>
            <select
              value={form.business_rule_category}
              onChange={(e) =>
                setForm({
                  ...form,
                  business_rule_category: e.target
                    .value as BusinessRuleCategory,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yec-primary focus:border-yec-primary"
            >
              <option value="MULTIPLE_ALLOWED">Multiple Allowed</option>
              <option value="ONE_TIME_ONLY">One-Time Only</option>
            </select>
          </div>

          <div className="flex items-center space-x-6">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-yec-primary focus:ring-yec-primary border-gray-300 rounded"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
              />
              <span className="ml-2 text-sm text-gray-700">Active</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-yec-primary focus:ring-yec-primary border-gray-300 rounded"
                checked={form.is_default}
                onChange={(e) =>
                  setForm({ ...form, is_default: e.target.checked })
                }
              />
              <span className="ml-2 text-sm text-gray-700">Default</span>
            </label>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-200 flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 bg-yec-primary text-white py-2 px-4 rounded-md hover:bg-yec-accent"
          >
            {form.id ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
