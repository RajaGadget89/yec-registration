interface StatusBadgeProps {
  status: "pending" | "waiting_for_review" | "approved" | "rejected";
  className?: string;
}

export default function StatusBadge({
  status,
  className = "",
}: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return {
          label: "Pending",
          className:
            "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 dark:from-gray-700 dark:to-gray-600 dark:text-gray-200 border border-gray-300/50 dark:border-gray-600/50",
          icon: "⏳",
        };
      case "waiting_for_review":
        return {
          label: "Waiting for Review",
          className:
            "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 dark:from-blue-900/50 dark:to-blue-800/50 dark:text-blue-200 border border-blue-300/50 dark:border-blue-600/50",
          icon: "👁️",
        };
      case "approved":
        return {
          label: "Approved",
          className:
            "bg-gradient-to-r from-green-100 to-green-200 text-green-800 dark:from-green-900/50 dark:to-green-800/50 dark:text-green-200 border border-green-300/50 dark:border-green-600/50",
          icon: "✅",
        };
      case "rejected":
        return {
          label: "Rejected",
          className:
            "bg-gradient-to-r from-red-100 to-red-200 text-red-800 dark:from-red-900/50 dark:to-red-800/50 dark:text-red-200 border border-red-300/50 dark:border-red-600/50",
          icon: "❌",
        };
      default:
        return {
          label: status,
          className:
            "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 dark:from-gray-700 dark:to-gray-600 dark:text-gray-200 border border-gray-300/50 dark:border-gray-600/50",
          icon: "❓",
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span
      className={`inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-semibold shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 ${config.className} ${className}`}
    >
      <span className="text-xs">{config.icon}</span>
      <span className="whitespace-nowrap">{config.label}</span>
    </span>
  );
}
