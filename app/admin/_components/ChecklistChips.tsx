"use client";

import { useState } from "react";
import { CreditCard, User, FileText, HelpCircle } from "lucide-react";
import { getStatusMessageBoth } from "../../lib/i18n";

interface ChecklistChipsProps {
  reviewChecklist: {
    payment: { status: string; notes?: string };
    profile: { status: string; notes?: string };
    tcc: { status: string; notes?: string };
  } | null;
  className?: string;
}

export default function ChecklistChips({
  reviewChecklist,
  className = "",
}: ChecklistChipsProps) {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  if (!reviewChecklist) {
    return (
      <div className={`flex space-x-2 ${className}`}>
        <div className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
          No checklist data
        </div>
      </div>
    );
  }

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
          icon: HelpCircle,
          description: "Review dimension",
        };
    }
  };

  const renderChip = (dimension: "payment" | "profile" | "tcc") => {
    const item = reviewChecklist[dimension];
    const statusConfig = getStatusConfig(item.status);
    const dimensionConfig = getDimensionConfig(dimension);
    const Icon = dimensionConfig.icon;
    const statusMessages = getStatusMessageBoth(item.status);

    return (
      <div key={dimension} className="relative">
        <div
          data-testid={`chip-${dimension}`}
          className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full border transition-all duration-200 cursor-help ${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor} ${className}`}
          onMouseEnter={() => setShowTooltip(dimension)}
          onMouseLeave={() => setShowTooltip(null)}
        >
          <Icon className="h-3 w-3" />
          <span className="text-xs">{statusConfig.icon}</span>
          <span className="whitespace-nowrap">{dimensionConfig.label}</span>
        </div>

        {/* Tooltip */}
        {showTooltip === dimension && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10 whitespace-nowrap">
            <div className="font-medium">{dimensionConfig.description}</div>
            <div className="mt-1">
              <div className="text-gray-300">EN: {statusMessages.en}</div>
              <div className="text-gray-300">TH: {statusMessages.th}</div>
            </div>
            {item.notes && (
              <div className="mt-1 pt-1 border-t border-gray-700">
                <div className="text-gray-300">Notes: {item.notes}</div>
              </div>
            )}
            {/* Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex space-x-2">
      {renderChip("payment")}
      {renderChip("profile")}
      {renderChip("tcc")}
    </div>
  );
}
