"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { t } from "@/app/lib/i18n";
import type { Dimension } from "@/app/lib/rbac";

interface RequestUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dimension: Dimension, notes: string) => void;
  dimension: Dimension;
  loading?: boolean;
}

export default function RequestUpdateModal({
  isOpen,
  onClose,
  onSubmit,
  dimension,
  loading = false,
}: RequestUpdateModalProps) {
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return;
    onSubmit(dimension, notes.trim());
  };

  const dimensionLabels = {
    payment: "Payment",
    profile: "Profile",
    tcc: "Chamber Card (TCC)",
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          data-testid="modal-request"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t("request_update")}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              disabled={loading}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Dimension
              </label>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100">
                {dimensionLabels[dimension]}
              </div>
            </div>

            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t("notes_required")}
              </label>
              <textarea
                id="notes"
                data-testid="input-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("explain_update")}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-gray-100 resize-none"
                rows={4}
                required
                disabled={loading}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                data-testid="btn-submit-request"
                disabled={loading || !notes.trim()}
                className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t("sending") : t("send_request")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
