"use client";

import { useState } from "react";
import {
  Check,
  RefreshCw,
  Loader2,
  CreditCard,
  User,
  FileText,
  AlertTriangle,
} from "lucide-react";
import type { Registration } from "../../types/database";
import { useRBAC } from "../../lib/rbac-client";
import { useToastHelpers } from "../../components/ui/toast";
import { t } from "../../lib/i18n";
import type { Dimension } from "../../lib/rbac";
import RequestUpdateModal from "./RequestUpdateModal";

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
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestDimension, setRequestDimension] = useState<Dimension | null>(
    null,
  );
  const { loading: permissionsLoading, canReview, canApprove } = useRBAC();
  const toast = useToastHelpers();

  // Optimistic state for rollback
  const [optimisticState, setOptimisticState] = useState<Registration | null>(
    null,
  );

  const handleDimensionAction = async (
    action: "request-update" | "mark-pass",
    dimension: "payment" | "profile" | "tcc",
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
    setCurrentAction(`${action}-${dimension}`);

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

  const handleRequestUpdate = (dimension: Dimension) => {
    setRequestDimension(dimension);
    setShowRequestModal(true);
  };

  const handleRequestSubmit = (dimension: Dimension, notes: string) => {
    setShowRequestModal(false);
    setRequestDimension(null);
    handleDimensionAction("request-update", dimension, notes);
  };

  const handleMarkPass = (dimension: Dimension) => {
    if (confirm(`Mark ${dimension} as passed?`)) {
      handleDimensionAction("mark-pass", dimension);
    }
  };

  // Use optimistic state if available, otherwise use original
  const displayRegistration = optimisticState || registration;

  const getDimensionStatus = (dimension: "payment" | "profile" | "tcc") => {
    const checklist = displayRegistration.review_checklist;
    if (!checklist) return "pending";
    return checklist[dimension]?.status || "pending";
  };

  const isActionDisabled = (action: string, dimension?: string) => {
    if (isLoading || permissionsLoading) return true;

    if (dimension) {
      const status = getDimensionStatus(
        dimension as "payment" | "profile" | "tcc",
      );

      // Check RBAC permissions first
      const canReviewDimension = canReview(dimension as Dimension);

      if (!canReviewDimension) return true;

      switch (action) {
        case "request-update":
          // Request Update: enabled if canReview(d) AND registration.status !== approved AND checklist[d] !== needs_update
          return (
            status === "needs_update" ||
            displayRegistration.status === "approved"
          );
        case "mark-pass":
          // Mark PASS: enabled if canReview(d) AND checklist[d] ∈ {pending,needs_update}
          return status === "passed" || status === "rejected";
        default:
          return false;
      }
    } else {
      // Approve action: enabled if canApprove() AND all dimensions are passed
      return !canApprove() || displayRegistration.status === "approved";
    }
  };

  const getActionTooltip = (
    action: string,
    dimension?: string,
  ): string | undefined => {
    if (isLoading || permissionsLoading) return "Loading...";

    if (dimension) {
      const status = getDimensionStatus(
        dimension as "payment" | "profile" | "tcc",
      );

      // Check RBAC permissions first
      const canReviewDimension = canReview(dimension as Dimension);

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
    } else {
      // Approve action
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

    return undefined;
  };

  const canApproveAll = () => {
    if (!canApprove()) return false;
    if (displayRegistration.status === "approved") return false;

    const checklist = displayRegistration.review_checklist;
    if (!checklist) return false;

    return (
      checklist.payment?.status === "passed" &&
      checklist.profile?.status === "passed" &&
      checklist.tcc?.status === "passed"
    );
  };

  const getDimensionButton = (dimension: "payment" | "profile" | "tcc") => {
    const status = getDimensionStatus(dimension);
    const isCurrentAction =
      currentAction === `request-update-${dimension}` ||
      currentAction === `mark-pass-${dimension}`;

    const dimensionConfig = {
      payment: { icon: CreditCard, label: "Payment", color: "blue" },
      profile: { icon: User, label: "Profile", color: "green" },
      tcc: { icon: FileText, label: "TCC", color: "purple" },
    };

    const config = dimensionConfig[dimension];

    return (
      <div key={dimension} className="flex flex-col gap-1">
        <div className="text-xs font-medium text-gray-600">{config.label}</div>
        <div className="flex gap-1">
          {/* Request Update Button */}
          <button
            data-testid={`btn-request-${dimension}`}
            onClick={(e) => {
              e.stopPropagation();
              handleRequestUpdate(dimension);
            }}
            disabled={isActionDisabled("request-update", dimension)}
            title={getActionTooltip("request-update", dimension)}
            className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-lg transition-all duration-300 backdrop-blur-sm border ${
              isActionDisabled("request-update", dimension)
                ? "opacity-50 cursor-not-allowed bg-gray-300 text-gray-500 border-gray-300"
                : "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
            } hover:scale-105`}
          >
            {isCurrentAction &&
            currentAction === `request-update-${dimension}` ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="whitespace-nowrap">Requesting...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3" />
                <span className="whitespace-nowrap">{t("request_update")}</span>
              </>
            )}
          </button>

          {/* Mark Pass Button */}
          <button
            data-testid={`btn-pass-${dimension}`}
            onClick={(e) => {
              e.stopPropagation();
              handleMarkPass(dimension);
            }}
            disabled={isActionDisabled("mark-pass", dimension)}
            title={getActionTooltip("mark-pass", dimension)}
            className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-lg transition-all duration-300 backdrop-blur-sm border ${
              isActionDisabled("mark-pass", dimension)
                ? "opacity-50 cursor-not-allowed bg-gray-300 text-gray-500 border-gray-300"
                : "bg-green-500 hover:bg-green-600 text-white border-green-500"
            } hover:scale-105`}
          >
            {isCurrentAction && currentAction === `mark-pass-${dimension}` ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="whitespace-nowrap">Marking...</span>
              </>
            ) : (
              <>
                <Check className="w-3 h-3" />
                <span className="whitespace-nowrap">{t("mark_pass")}</span>
              </>
            )}
          </button>
        </div>

        {/* Status Badge */}
        <div
          className={`text-xs px-2 py-1 rounded-full text-center cursor-help ${
            status === "passed"
              ? "bg-green-100 text-green-800"
              : status === "needs_update"
                ? "bg-yellow-100 text-yellow-800"
                : status === "rejected"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-800"
          }`}
          title={
            (status === "needs_update" || status === "passed") &&
            displayRegistration.review_checklist?.[dimension]?.notes
              ? displayRegistration.review_checklist[dimension].notes
              : undefined
          }
        >
          {status.replace("_", " ")}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Dimension-specific actions */}
        <div className="grid grid-cols-3 gap-2">
          {getDimensionButton("payment")}
          {getDimensionButton("profile")}
          {getDimensionButton("tcc")}
        </div>

        {/* Global Approve Action */}
        <div className="flex flex-wrap items-center gap-1 pt-2 border-t">
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

          {!canApproveAll() && canApprove() && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <AlertTriangle className="w-3 h-3" />
              <span>All dimensions must be passed</span>
            </div>
          )}
        </div>
      </div>

      {/* Request Update Modal */}
      <RequestUpdateModal
        isOpen={showRequestModal}
        onClose={() => {
          setShowRequestModal(false);
          setRequestDimension(null);
        }}
        onSubmit={handleRequestSubmit}
        dimension={requestDimension!}
        loading={isLoading && currentAction?.startsWith("request-update")}
      />
    </>
  );
}
