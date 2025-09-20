"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import type { Registration } from "../../types/database";
import { useRBAC } from "../../lib/rbac-client";
import { useToastHelpers } from "../../components/ui/toast";
import {
  isTerminalState,
  getTerminalStateTooltip,
} from "../../lib/registration-utils";

interface ActionButtonsProps {
  registration: Registration;
  onActionComplete?: (registrationId: string, newStatus: string) => void;
}

export default function ActionButtons({
  registration,
  onActionComplete,
}: ActionButtonsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  // Request modal state moved to DimensionActionButtons component
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState<string>("");
  const {
    loading: permissionsLoading,
    canReview: _canReview,
    canApprove,
  } = useRBAC();
  const toast = useToastHelpers();

  // Optimistic state for rollback
  const [optimisticState, _setOptimisticState] = useState<Registration | null>(
    null,
  );

  // Dimension action function moved to DimensionActionButtons component

  // Approve flow removed per policy: approval happens automatically when all three dimensions pass

  const handleReject = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setCurrentAction("reject");
    setShowRejectModal(false);

    try {
      const response = await fetch(
        `/api/admin/registrations/${registration.id}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: "other",
            rejectNote: rejectReason || undefined,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to reject registration");
      }

      const result = await response.json();

      toast.success("Registration rejected successfully");

      if (onActionComplete) {
        onActionComplete(
          registration.registration_id,
          result.status || "rejected",
        );
      }
    } catch (error) {
      toast.error(
        `Failed to reject registration: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsLoading(false);
      setCurrentAction(null);
      setRejectReason("");
    }
  };

  // Dimension action handlers moved to DimensionActionButtons component

  // Use optimistic state if available, otherwise use original
  const displayRegistration = optimisticState || registration;

  const _getDimensionStatus = (dimension: "payment" | "profile" | "tcc") => {
    const checklist = displayRegistration.review_checklist;
    if (!checklist) return "pending";
    return checklist[dimension]?.status || "pending";
  };

  const isActionDisabled = (action: string) => {
    if (isLoading || permissionsLoading) return true;

    // Check terminal state for main actions - if registration is rejected or approved, disable actions
    if (isTerminalState(displayRegistration)) {
      return true;
    }

    // Reject action: enabled if canApprove() AND registration is not already rejected
    if (action === "reject") {
      return !canApprove() || displayRegistration.status === "rejected";
    }
    return false;
  };

  const getActionTooltip = (action: string): string | undefined => {
    if (isLoading || permissionsLoading) return "Loading...";

    // Check terminal state for main actions - show terminal state tooltip
    if (isTerminalState(displayRegistration)) {
      return getTerminalStateTooltip(displayRegistration);
    }

    // Reject action
    if (action === "reject") {
      if (!canApprove()) {
        return "Only super admin can reject registrations";
      }
      if (displayRegistration.status === "rejected") {
        return "Registration is already rejected";
      }
    }

    return undefined;
  };

  // Approve-all check removed; approval is automatic via backend logic

  // Dimension actions moved to DimensionActionButtons component

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Global Reject Action (hidden when already rejected) */}
        {displayRegistration.status !== "rejected" && (
          <div className="flex flex-wrap items-center gap-1">
            <button
              data-testid="btn-reject"
              onClick={(e) => {
                e.stopPropagation();
                setShowRejectModal(true);
              }}
              disabled={isActionDisabled("reject") || isLoading}
              title={getActionTooltip("reject")}
              className={`inline-flex items-center space-x-1 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-300 backdrop-blur-sm border ${
                isActionDisabled("reject") || isLoading
                  ? "opacity-50 cursor-not-allowed bg-gray-300 text-gray-500 border-gray-300"
                  : "bg-red-500 hover:bg-red-600 text-white border-red-500"
              } hover:scale-105`}
            >
              {currentAction === "reject" && isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="whitespace-nowrap">Rejecting...</span>
                </>
              ) : (
                <>
                  <X className="w-4 h-4" />
                  <span className="whitespace-nowrap">Reject</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Request Update Modal moved to DimensionActionButtons component */}

      {/* Reject Confirmation Modal */}
      {showRejectModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowRejectModal(false)}
        >
          <div
            role="dialog"
            data-testid="registration-reject-dialog"
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Reject Registration
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-3">
              Are you sure you want to reject this registration? This action
              will be recorded.
            </p>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reason (will be sent to user)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="Enter a short reason..."
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {isLoading && currentAction === "reject"
                  ? "Rejecting..."
                  : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
