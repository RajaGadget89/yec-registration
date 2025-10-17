"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  User,
  CreditCard,
  Building,
} from "lucide-react";
// Remove server-side import - we'll handle this in the page component

interface FormApprovalReviewProps {
  registration: any;
  formType: any;
  formKey: string;
  approverId: string;
}

export default function FormApprovalReview({
  registration,
  formType,
  formKey,
  approverId,
}: FormApprovalReviewProps) {
  const router = useRouter();
  const [approvalResult, setApprovalResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const checkApprovalEligibility = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/review/form/${formKey}/${registration.id}/can-approve`,
      );
      const result = await response.json();
      setApprovalResult(result);
    } catch (error) {
      console.error("Error checking approval eligibility:", error);
    } finally {
      setLoading(false);
    }
  }, [formKey, registration.id]);

  useEffect(() => {
    checkApprovalEligibility();
  }, [formKey, registration.id, checkApprovalEligibility]);

  const handleApprove = async () => {
    try {
      setActionLoading(true);
      const response = await fetch(
        `/api/admin/review/form/${formKey}/${registration.id}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            approverId,
            notes,
          }),
        },
      );
      const result = await response.json();

      if (result.success) {
        alert("Registration approved successfully!");
        router.push("/admin/unified");
      } else {
        alert(`Failed to approve: ${result.message}`);
      }
    } catch (error) {
      console.error("Error approving registration:", error);
      alert("Error approving registration");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(
        `/api/admin/review/form/${formKey}/${registration.id}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            approverId,
            reason: rejectionReason,
          }),
        },
      );
      const result = await response.json();

      if (result.success) {
        alert("Registration rejected successfully!");
        router.push("/admin/unified");
      } else {
        alert(`Failed to reject: ${result.message}`);
      }
    } catch (error) {
      console.error("Error rejecting registration:", error);
      alert("Error rejecting registration");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDimensionPass = async (dimension: string) => {
    try {
      setActionLoading(true);
      const response = await fetch(
        `/api/admin/review/form/${formKey}/${registration.id}/mark-pass`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dimension,
            approverId,
          }),
        },
      );
      const result = await response.json();

      if (result.success) {
        alert(result.message);
        checkApprovalEligibility(); // Refresh approval status
      } else {
        alert(`Failed to mark dimension pass: ${result.message}`);
      }
    } catch (error) {
      console.error("Error marking dimension pass:", error);
      alert("Error marking dimension pass");
    } finally {
      setActionLoading(false);
    }
  };

  const getDimensionIcon = (dimension: string) => {
    switch (dimension) {
      case "profile":
        return <User className="w-5 h-5" />;
      case "payment":
        return <CreditCard className="w-5 h-5" />;
      case "tcc":
        return <Building className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getDimensionStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "rejected":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "waiting_for_review":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case "pending":
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Form Registration Review
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {formType.name} - {registration.tracking_id}
              </p>
            </div>
            <button
              onClick={() => router.push("/admin/unified")}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Registration Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Registration Status
            </h2>
            <div className="flex items-center space-x-2">
              {getStatusIcon(registration.status)}
              <span
                className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  registration.status === "approved"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : registration.status === "rejected"
                      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                }`}
              >
                {registration.status.replace(/_/g, " ").toUpperCase()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">
                Tracking ID:
              </span>
              <span className="ml-2 font-mono text-gray-900 dark:text-white">
                {registration.tracking_id}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Created:</span>
              <span className="ml-2 text-gray-900 dark:text-white">
                {formatDate(registration.created_at)}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Updated:</span>
              <span className="ml-2 text-gray-900 dark:text-white">
                {formatDate(registration.updated_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Approval Workflow */}
        {approvalResult && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Approval Workflow
            </h2>

            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Workflow Type:
                </span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {approvalResult.new_dimension_status &&
                  Object.keys(approvalResult.new_dimension_status).length > 0
                    ? Object.keys(approvalResult.new_dimension_status)
                        .join(", ")
                        .toUpperCase()
                    : "No approval required"}
                </span>
              </div>
            </div>

            {/* Dimension Status */}
            {Object.entries(approvalResult.new_dimension_status).map(
              ([dimension, status]) => (
                <div
                  key={dimension}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-2"
                >
                  <div className="flex items-center space-x-3">
                    {getDimensionIcon(dimension)}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                      {dimension} Verification
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDimensionStatusColor(
                        status as string,
                      )}`}
                    >
                      {(status as string).toUpperCase()}
                    </span>
                    {(status as string) !== "submitted" && (
                      <button
                        onClick={() => handleDimensionPass(dimension)}
                        disabled={actionLoading}
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        Mark Pass
                      </button>
                    )}
                  </div>
                </div>
              ),
            )}

            {/* Missing Requirements */}
            {approvalResult.missing_requirements.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                  Missing Requirements:
                </h3>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                  {approvalResult.missing_requirements.map(
                    (req: any, index: number) => (
                      <li key={index}>{req}</li>
                    ),
                  )}
                </ul>
              </div>
            )}

            {/* Approval Status */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center space-x-2">
                {approvalResult.can_approve ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {approvalResult.message}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Registration Data */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Registration Data
          </h2>
          <div className="space-y-3">
            {Object.entries(registration.core_data || {}).map(
              ([key, value]) => (
                <div key={key} className="flex justify-between items-start">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 capitalize">
                    {key.replace(/_/g, " ")}:
                  </span>
                  <span className="text-sm text-gray-900 dark:text-white text-right max-w-md">
                    {typeof value === "string" ? value : JSON.stringify(value)}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Actions
          </h2>

          {approvalResult?.can_approve ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Approval Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yec-primary focus:border-transparent"
                  placeholder="Add any notes about this approval..."
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {actionLoading ? "Approving..." : "Approve Registration"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rejection Reason
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yec-primary focus:border-transparent"
                  placeholder="Please provide a reason for rejection..."
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleReject}
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  {actionLoading ? "Rejecting..." : "Reject Registration"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
