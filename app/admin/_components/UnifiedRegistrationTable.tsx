"use client";

import { useRouter } from "next/navigation";
import { Eye, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import type { UnifiedRegistration } from "../../lib/admin/unifiedRegistrationService";

interface UnifiedRegistrationTableProps {
  registrations: UnifiedRegistration[];
  loading: boolean;
  onRegistrationSelect: (registration: UnifiedRegistration) => void;
}

export default function UnifiedRegistrationTable({
  registrations,
  loading,
  onRegistrationSelect,
}: UnifiedRegistrationTableProps) {
  const _router = useRouter();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "waiting_for_review":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "pending":
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "waiting_for_review":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "pending":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFormTypeBadge = (formType: string, formName: string) => {
    if (formType === "traditional") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          YEC Day
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
        {formName}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 dark:bg-gray-700"></div>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-gray-200 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Registration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Form Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {registrations.map((registration) => (
              <tr
                key={registration.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => onRegistrationSelect(registration)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {registration.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {registration.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {registration.email}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                        {registration.tracking_id}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getFormTypeBadge(
                    registration.form_type,
                    registration.form_name,
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getStatusIcon(registration.status)}
                    <span
                      className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        registration.status,
                      )}`}
                    >
                      {registration.status.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(registration.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRegistrationSelect(registration);
                    }}
                    className="text-yec-primary hover:text-yec-accent transition-colors flex items-center"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {registrations.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            No registrations found matching your criteria.
          </div>
        </div>
      )}
    </div>
  );
}
