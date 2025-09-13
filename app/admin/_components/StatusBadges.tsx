"use client";

import { CreditCard, User, FileText } from "lucide-react";
import type { Registration } from "../../types/database";

interface StatusBadgesProps {
  registration: Registration;
}

export default function StatusBadges({ registration }: StatusBadgesProps) {
  const getDimensionStatus = (dimension: "payment" | "profile" | "tcc") => {
    const checklist = registration.review_checklist;
    if (!checklist) return "pending";
    return checklist[dimension]?.status || "pending";
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return {
          bgColor: "bg-gray-100 dark:bg-gray-700",
          textColor: "text-gray-700 dark:text-gray-300",
          borderColor: "border-gray-300 dark:border-gray-600",
          icon: "⏳",
        };
      case "needs_update":
        return {
          bgColor: "bg-orange-100 dark:bg-orange-900/30",
          textColor: "text-orange-700 dark:text-orange-300",
          borderColor: "border-orange-300 dark:border-orange-600",
          icon: "⚠️",
        };
      case "passed":
        return {
          bgColor: "bg-green-100 dark:bg-green-900/30",
          textColor: "text-green-700 dark:text-green-300",
          borderColor: "border-green-300 dark:border-green-600",
          icon: "✅",
        };
      case "rejected":
        return {
          bgColor: "bg-red-100 dark:bg-red-900/30",
          textColor: "text-red-700 dark:text-red-300",
          borderColor: "border-red-300 dark:border-red-600",
          icon: "❌",
        };
      default:
        return {
          bgColor: "bg-gray-100 dark:bg-gray-700",
          textColor: "text-gray-700 dark:text-gray-300",
          borderColor: "border-gray-300 dark:border-gray-600",
          icon: "❓",
        };
    }
  };

  const getDimensionConfig = (dimension: string) => {
    switch (dimension) {
      case "payment":
        return {
          label: "Payment",
          icon: CreditCard,
          description: "Payment verification",
        };
      case "profile":
        return {
          label: "Profile",
          icon: User,
          description: "Profile information",
        };
      case "tcc":
        return {
          label: "TCC",
          icon: FileText,
          description: "Chamber of Commerce card",
        };
      default:
        return {
          label: dimension,
          icon: User,
          description: "Review dimension",
        };
    }
  };

  const renderBadge = (dimension: "payment" | "profile" | "tcc") => {
    const status = getDimensionStatus(dimension);
    const statusConfig = getStatusConfig(status);
    const dimensionConfig = getDimensionConfig(dimension);
    const Icon = dimensionConfig.icon;

    return (
      <div
        key={dimension}
        className={`inline-flex items-center space-x-1 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all duration-200 ${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor}`}
        title={`${dimensionConfig.description}: ${status.replace("_", " ")}`}
      >
        <Icon className="h-4 w-4" />
        <span className="text-sm">{statusConfig.icon}</span>
        <span className="whitespace-nowrap">{dimensionConfig.label}</span>
      </div>
    );
  };

  return (
    <div className="flex items-center gap-2">
      {renderBadge("payment")}
      {renderBadge("profile")}
      {renderBadge("tcc")}
    </div>
  );
}
