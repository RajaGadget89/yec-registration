"use client";

import { useState } from "react";
import {
  Check,
  RefreshCw,
  Loader2,
  CreditCard,
  User,
  FileText,
} from "lucide-react";
import type { Registration } from "../../types/database";
import { useRBAC } from "../../lib/rbac-client";
import { useToastHelpers } from "../../components/ui/toast";
import { t } from "../../lib/i18n";

import RequestUpdateModal from "./RequestUpdateModal";

interface DimensionActionButtonsProps {
  registration: Registration;
  dimension: "payment" | "profile" | "tcc";
  onActionComplete?: (registrationId: string, newStatus: string) => void;
}

export default function DimensionActionButtons({
  registration,
  dimension,
  onActionComplete,
}: DimensionActionButtonsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const { loading: permissionsLoading, canReview } = useRBAC();
  const toast = useToastHelpers();

  // Optimistic state for rollback
  const [optimisticState, setOptimisticState] = useState<Registration | null>(
    null,
  );

  const handleDimensionAction = async (
    action: "request-update" | "mark-pass",
    notes?: string,
  ) => {
    if (isLoading) return;

    // Apply optimistic update
    const optimisticUpdate = {
      ...registration,
      review_checklist: {
        ...registration.review_checklist,
        [dimension]: {
          ...registration.review_checklist?.[dimension],
          status: action === "mark-pass" ? "passed" : "needs_update",
          notes: notes || registration.review_checklist?.[dimension]?.notes,
        },
      },
    };
    setOptimisticState(optimisticUpdate);

    setIsLoading(true);
    setCurrentAction(action);

    try {
      const endpoint =
        action === "request-update"
          ? "/api/admin/request-update"
          : "/api/admin/mark-pass";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registrationId: registration.registration_id,
          dimension,
          notes,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} ${dimension}`);
      }

      const result = await response.json();

      // Revert optimistic update
      setOptimisticState(null);

      toast.success(
        `${action === "request-update" ? "Update requested" : "Marked as passed"} for ${dimension}`,
      );

      if (onActionComplete) {
        onActionComplete(
          registration.registration_id,
          result.status || registration.status,
        );
      }
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticState(null);
      toast.error(
        `Failed to ${action} ${dimension}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsLoading(false);
      setCurrentAction(null);
    }
  };

  const handleRequestUpdate = () => {
    setShowRequestModal(true);
  };

  const handleRequestSubmit = (notes: string) => {
    setShowRequestModal(false);
    handleDimensionAction("request-update", notes);
  };

  const handleMarkPass = () => {
    if (confirm(`Mark ${dimension} as passed?`)) {
      handleDimensionAction("mark-pass");
    }
  };

  // Use optimistic state if available, otherwise use original
  const displayRegistration = optimisticState || registration;

  const getDimensionStatus = () => {
    const checklist = displayRegistration.review_checklist;
    if (!checklist) return "pending";
    return checklist[dimension]?.status || "pending";
  };

  const isActionDisabled = (action: string) => {
    if (isLoading || permissionsLoading) return true;

    const status = getDimensionStatus();

    // Check RBAC permissions first
    const canReviewDimension = canReview(dimension);

    if (!canReviewDimension) return true;

    switch (action) {
      case "request-update":
        // Request Update: enabled if canReview(d) AND registration.status !== approved AND checklist[d] !== needs_update
        return (
          status === "needs_update" || displayRegistration.status === "approved"
        );
      case "mark-pass":
        // Mark PASS: enabled if canReview(d) AND checklist[d] ∈ {pending,needs_update}
        return status === "passed" || status === "rejected";
      default:
        return false;
    }
  };

  const getActionTooltip = (action: string): string | undefined => {
    if (isLoading || permissionsLoading) return "Loading...";

    const status = getDimensionStatus();

    // Check RBAC permissions first
    const canReviewDimension = canReview(dimension);

    if (!canReviewDimension) {
      return `No permission to review ${dimension}`;
    }

    switch (action) {
      case "request-update":
        if (status === "needs_update") {
          return `${dimension} already needs update`;
        }
        if (displayRegistration.status === "approved") {
          return "Registration is already approved";
        }
        break;
      case "mark-pass":
        if (status === "passed") {
          return `${dimension} is already passed`;
        }
        if (status === "rejected") {
          return `${dimension} is rejected`;
        }
        break;
    }

    return undefined;
  };

  const getDimensionConfig = () => {
    switch (dimension) {
      case "payment":
        return { icon: CreditCard, label: "Payment", color: "blue" };
      case "profile":
        return { icon: User, label: "Profile", color: "green" };
      case "tcc":
        return { icon: FileText, label: "TCC", color: "purple" };
      default:
        return { icon: User, label: dimension, color: "gray" };
    }
  };

  const config = getDimensionConfig();

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <config.icon className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            {config.label} Review
          </span>
        </div>

        <div className="flex gap-2">
          {/* Request Update Button */}
          <button
            data-testid={`${dimension}-request-update`}
            onClick={handleRequestUpdate}
            disabled={isActionDisabled("request-update")}
            title={getActionTooltip("request-update")}
            className={`inline-flex items-center space-x-1 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-300 backdrop-blur-sm border ${
              isActionDisabled("request-update")
                ? "opacity-50 cursor-not-allowed bg-gray-300 text-gray-500 border-gray-300"
                : "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
            } hover:scale-105`}
          >
            {currentAction === "request-update" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="whitespace-nowrap">Requesting...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span className="whitespace-nowrap">{t("request_update")}</span>
              </>
            )}
          </button>

          {/* Mark Pass Button */}
          <button
            data-testid={`${dimension}-mark-pass`}
            onClick={handleMarkPass}
            disabled={isActionDisabled("mark-pass")}
            title={getActionTooltip("mark-pass")}
            className={`inline-flex items-center space-x-1 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-300 backdrop-blur-sm border ${
              isActionDisabled("mark-pass")
                ? "opacity-50 cursor-not-allowed bg-gray-300 text-gray-500 border-gray-300"
                : "bg-green-500 hover:bg-green-600 text-white border-green-500"
            } hover:scale-105`}
          >
            {currentAction === "mark-pass" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="whitespace-nowrap">Marking...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span className="whitespace-nowrap">{t("mark_pass")}</span>
              </>
            )}
          </button>
        </div>

        {/* Status Badge */}
        <div
          className={`text-xs px-2 py-1 rounded-full text-center cursor-help ${
            getDimensionStatus() === "passed"
              ? "bg-green-100 text-green-800"
              : getDimensionStatus() === "needs_update"
                ? "bg-yellow-100 text-yellow-800"
                : getDimensionStatus() === "rejected"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-800"
          }`}
          title={
            (getDimensionStatus() === "needs_update" ||
              getDimensionStatus() === "passed") &&
            displayRegistration.review_checklist?.[dimension]?.notes
              ? displayRegistration.review_checklist[dimension].notes
              : undefined
          }
        >
          {getDimensionStatus().replace("_", " ")}
        </div>
      </div>

      {/* Request Update Modal */}
      <RequestUpdateModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSubmit={handleRequestSubmit}
        dimension={dimension}
        loading={isLoading && currentAction === "request-update"}
      />
    </>
  );
}
