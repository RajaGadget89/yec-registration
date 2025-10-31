"use client";

import { useState } from "react";
import {
  X,
  Trash2,
  AlertTriangle,
  Users,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Participant {
  id: number;
  checker_reference_id: string;
  full_name: string;
  province?: string;
  position?: string;
}

interface DeleteConfirmationModalProps {
  participants: Participant[];
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteConfirmationModal({
  participants,
  onClose,
  onConfirm,
}: DeleteConfirmationModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const isSingleParticipant = participants.length === 1;
  const participant = isSingleParticipant ? participants[0] : null;
  const isConfirmTextValid = confirmText === "DELETE";

  const handleDelete = async () => {
    if (!isConfirmTextValid) return;

    try {
      setIsDeleting(true);
      setError(null);
      await onConfirm();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete participants",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const getCascadeWarningText = () => {
    if (isSingleParticipant) {
      return "This will also delete all related data including accommodation, events, transportation, and financial records.";
    } else {
      return "This will also delete all related data for each participant including accommodation, events, transportation, and financial records.";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Delete Participant{participants.length > 1 ? "s" : ""}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This action cannot be undone
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Participant Info */}
          {isSingleParticipant && participant ? (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="font-medium text-gray-900 dark:text-white">
                  Participant Details
                </span>
              </div>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">
                    Name:
                  </span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {participant.full_name}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">
                    Checker ID:
                  </span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {participant.checker_reference_id}
                  </span>
                </div>
                {participant.province && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">
                      Province:
                    </span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {participant.province}
                    </span>
                  </div>
                )}
                {participant.position && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">
                      Position:
                    </span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {participant.position}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="font-medium text-gray-900 dark:text-white">
                  Multiple Participants ({participants.length})
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                You are about to delete {participants.length} participants.
              </div>

              {/* Show/Hide participant list */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {showDetails ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Hide participant list
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show participant list
                  </>
                )}
              </button>

              {showDetails && (
                <div className="mt-3 max-h-32 overflow-y-auto space-y-1">
                  {participants.map((p) => (
                    <div
                      key={p.id}
                      className="text-sm text-gray-700 dark:text-gray-300"
                    >
                      • {p.full_name} ({p.checker_reference_id})
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cascade Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
                  Cascade Delete Warning
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  {getCascadeWarningText()}
                </p>
              </div>
            </div>
          </div>

          {/* Confirmation Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              To confirm deletion, type{" "}
              <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">
                DELETE
              </span>{" "}
              below:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              disabled={isDeleting}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                confirmText && !isConfirmTextValid
                  ? "border-red-300 dark:border-red-600"
                  : "border-gray-300 dark:border-gray-600"
              } ${isDeleting ? "opacity-50 cursor-not-allowed" : ""}`}
            />
            {confirmText && !isConfirmTextValid && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                Please type exactly &quot;DELETE&quot; to confirm
              </p>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <span className="text-sm text-red-800 dark:text-red-400">
                  {error}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!isConfirmTextValid || isDeleting}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete Participant{participants.length > 1 ? "s" : ""}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
