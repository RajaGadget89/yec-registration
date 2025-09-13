"use client";

import { useState } from "react";
import { Check, Loader2, AlertTriangle, X } from "lucide-react";
import type { Registration } from "../../types/database";
import { useRBAC } from "../../lib/rbac-client";
import { useToastHelpers } from "../../components/ui/toast";
import { t } from "../../lib/i18n";
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

  const handleApprove = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setCurrentAction("approve");

    try {
      const response = await fetch("/api/admin/approve-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registrationId: registration.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to approve registration");
      }

      const result = await response.json();

      toast.success("Registration approved successfully");

      if (onActionComplete) {
        onActionComplete(
          registration.registration_id,
          result.status || "approved",
        );
      }
    } catch (error) {
      toast.error(
        `Failed to approve registration: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsLoading(false);
      setCurrentAction(null);
    }
  };

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

    // Approve action: enabled if canApprove() AND all dimensions are passed
    if (action === "approve") {
      return !canApprove() || displayRegistration.status === "approved";
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

    // Approve action
    if (action === "approve") {
      if (!canApprove()) {
        return "Only super admin can approve registrations";
      }
      if (displayRegistration.status === "approved") {
        return "Registration is already approved";
      }
      if (!canApproveAll()) {
        return "All dimensions must be passed first";
      }
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

  const canApproveAll = () => {
    if (!canApprove()) return false;
    if (displayRegistration.status === "approved") return false;

    // Check terminal state - if registration is rejected or approved, disable approve action
    if (isTerminalState(displayRegistration)) return false;

    const checklist = displayRegistration.review_checklist;
    if (!checklist) return false;

    return (
      checklist.payment?.status === "passed" &&
      checklist.profile?.status === "passed" &&
      checklist.tcc?.status === "passed"
    );
  };

  // Dimension actions moved to DimensionActionButtons component

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Global Approve/Reject Actions */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            data-testid="btn-approve"
            onClick={(e) => {
              e.stopPropagation();
              handleApprove();
            }}
            disabled={!canApproveAll() || isLoading}
            title={getActionTooltip("approve")}
            className={`inline-flex items-center space-x-1 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-300 backdrop-blur-sm border ${
              !canApproveAll() || isLoading
                ? "opacity-50 cursor-not-allowed bg-gray-300 text-gray-500 border-gray-300"
                : "bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
            } hover:scale-105`}
          >
            {currentAction === "approve" && isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="whitespace-nowrap">Approving...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span className="whitespace-nowrap">
                  {t("approve_registration")}
                </span>
              </>
            )}
          </button>

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

          {!canApproveAll() && canApprove() && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <AlertTriangle className="w-3 h-3" />
              <span>All dimensions must be passed</span>
            </div>
          )}
        </div>
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
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to reject this registration? This action
              will be recorded.
            </p>
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
