"use client";

import { useState } from "react";
import { UserCheck, UserX, AlertTriangle } from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  role: "admin" | "super_admin";
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  is_active: boolean;
}

interface UserStatusToggleProps {
  user: AdminUser;
}

export default function UserStatusToggle({ user }: UserStatusToggleProps) {
  const [isActive, setIsActive] = useState(user.is_active);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleToggle = async () => {
    if (showConfirm) {
      setIsUpdating(true);
      try {
        // For now, we'll just update the local state since the API endpoint for status toggle
        // might not exist yet. In a real implementation, you would call an API endpoint.
        setIsActive(!isActive);

        // Example API call (uncomment when endpoint is available):
        // const response = await fetch(`/api/admin/users/${user.id}/status`, {
        //   method: "PUT",
        //   headers: {
        //     "Content-Type": "application/json",
        //   },
        //   body: JSON.stringify({ is_active: !isActive }),
        // });

        // if (!response.ok) {
        //   throw new Error("Failed to update user status");
        // }

        setShowConfirm(false);
      } catch (error) {
        console.error("Error updating user status:", error);
        alert("Failed to update user status. Please try again.");
        // Revert the state change on error
        setIsActive(user.is_active);
      } finally {
        setIsUpdating(false);
      }
    } else {
      setShowConfirm(true);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setIsActive(user.is_active); // Revert to original state
  };

  if (showConfirm) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          <AlertTriangle className="h-3 w-3 text-yellow-600" />
          <span className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">
            Confirm
          </span>
        </div>
        <button
          onClick={handleToggle}
          disabled={isUpdating}
          className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUpdating ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
              ...
            </>
          ) : (
            "Yes"
          )}
        </button>
        <button
          onClick={handleCancel}
          disabled={isUpdating}
          className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isUpdating}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        isActive
          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900/30 focus:ring-green-500"
          : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900/30 focus:ring-red-500"
      }`}
    >
      {isActive ? (
        <>
          <UserCheck className="h-3 w-3 mr-1" />
          Active
        </>
      ) : (
        <>
          <UserX className="h-3 w-3 mr-1" />
          Inactive
        </>
      )}
    </button>
  );
}
