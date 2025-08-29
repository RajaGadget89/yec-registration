"use client";

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { 
  Crown, 
  Shield, 
  UserCheck, 
  UserX, 
  Edit3, 
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users
} from "lucide-react";
import RoleManagementModal from "./RoleManagementModal";
import UserStatusToggle from "./UserStatusToggle";

interface AdminUser {
  id: string;
  email: string;
  role: "admin" | "super_admin";
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  is_active: boolean;
}

interface AdminUserTableProps {
  users: AdminUser[];
}

export default function AdminUserTable({ users }: AdminUserTableProps) {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const formatTime = (utcTime: string) => {
    try {
      const thTime = toZonedTime(new Date(utcTime), "Asia/Bangkok");
      const timeStr = format(thTime, "yyyy-MM-dd HH:mm:ss");
      const timeAgo = formatDistanceToNow(thTime, { addSuffix: true });
      return { timeStr, timeAgo };
    } catch {
      return { timeStr: utcTime, timeAgo: "" };
    }
  };

  const getRoleIcon = (role: string) => {
    if (role === "super_admin") {
      return <Crown className="h-4 w-4 text-yellow-600" />;
    }
    return <Shield className="h-4 w-4 text-blue-600" />;
  };

  const getRoleBadge = (role: string) => {
    if (role === "super_admin") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
          <Crown className="h-3 w-3 mr-1" />
          Super Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
        <Shield className="h-3 w-3 mr-1" />
        Admin
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200">
          <UserCheck className="h-3 w-3 mr-1" />
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200">
        <UserX className="h-3 w-3 mr-1" />
        Inactive
      </span>
    );
  };

  const handleRoleChange = (user: AdminUser) => {
    setSelectedUser(user);
    setIsRoleModalOpen(true);
  };

  const handleRoleUpdate = async (newRole: "admin" | "super_admin") => {
    if (!selectedUser) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Error updating role: ${error.error}`);
      }
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Failed to update role. Please try again.");
    } finally {
      setIsUpdating(false);
      setIsRoleModalOpen(false);
      setSelectedUser(null);
    }
  };

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600 dark:text-gray-300">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <div className="text-lg font-medium mb-2">No admin users found</div>
          <div className="text-sm">
            Admin users will appear here once they are added to the system
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {user.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.email}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        ID: {user.id.slice(0, 8)}...
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getRoleBadge(user.role)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <UserStatusToggle user={user} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  <div>
                    <div>{formatTime(user.created_at).timeStr}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {formatTime(user.created_at).timeAgo}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {user.last_login_at ? (
                    <div>
                      <div>{formatTime(user.last_login_at).timeStr}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {formatTime(user.last_login_at).timeAgo}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">Never</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleRoleChange(user)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Edit3 className="h-3 w-3 mr-1" />
                      Change Role
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role Management Modal */}
      {selectedUser && (
        <RoleManagementModal
          user={selectedUser}
          isOpen={isRoleModalOpen}
          onClose={() => {
            setIsRoleModalOpen(false);
            setSelectedUser(null);
          }}
          onConfirm={handleRoleUpdate}
          isUpdating={isUpdating}
        />
      )}
    </>
  );
}
