"use client";

import { useState } from "react";
import { Crown, Shield, AlertTriangle, X, CheckCircle } from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  role: "admin" | "super_admin";
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  is_active: boolean;
}

interface RoleManagementModalProps {
  user: AdminUser;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (role: "admin" | "super_admin") => void;
  isUpdating: boolean;
}

export default function RoleManagementModal({
  user,
  isOpen,
  onClose,
  onConfirm,
  isUpdating,
}: RoleManagementModalProps) {
  const [selectedRole, setSelectedRole] = useState<"admin" | "super_admin">(user.role);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedRole !== user.role) {
      onConfirm(selectedRole);
    } else {
      onClose();
    }
  };

  const getRoleDescription = (role: "admin" | "super_admin") => {
    if (role === "super_admin") {
      return "Full system access including user management, role changes, and all administrative functions.";
    }
    return "Standard admin access for managing registrations and basic administrative tasks.";
  };

  const getRoleIcon = (role: "admin" | "super_admin") => {
    if (role === "super_admin") {
      return <Crown className="h-5 w-5 text-yellow-600" />;
    }
    return <Shield className="h-5 w-5 text-blue-600" />;
  };

  const getRoleBadge = (role: "admin" | "super_admin") => {
    if (role === "super_admin") {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
          <Crown className="h-4 w-4 mr-2" />
          Super Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
        <Shield className="h-4 w-4 mr-2" />
        Admin
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 sm:mx-0 sm:h-10 sm:w-10">
                <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    Change User Role
                  </h3>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="mt-4">
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                      Changing role for user: <strong className="text-gray-900 dark:text-white">{user.email}</strong>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Current role: {getRoleBadge(user.role)}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Select New Role:
                    </label>
                    
                    {/* Super Admin Option */}
                    <div
                      className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedRole === "super_admin"
                          ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10"
                          : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                      }`}
                      onClick={() => setSelectedRole("super_admin")}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="role"
                            value="super_admin"
                            checked={selectedRole === "super_admin"}
                            onChange={() => setSelectedRole("super_admin")}
                            className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300"
                          />
                          <div className="flex items-center space-x-2">
                            {getRoleIcon("super_admin")}
                            <span className="font-medium text-gray-900 dark:text-white">
                              Super Admin
                            </span>
                          </div>
                        </div>
                        {selectedRole === "super_admin" && (
                          <div className="text-yellow-600">
                            <CheckCircle className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 ml-7">
                        {getRoleDescription("super_admin")}
                      </p>
                    </div>

                    {/* Admin Option */}
                    <div
                      className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedRole === "admin"
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10"
                          : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                      }`}
                      onClick={() => setSelectedRole("admin")}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="role"
                            value="admin"
                            checked={selectedRole === "admin"}
                            onChange={() => setSelectedRole("admin")}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <div className="flex items-center space-x-2">
                            {getRoleIcon("admin")}
                            <span className="font-medium text-gray-900 dark:text-white">
                              Admin
                            </span>
                          </div>
                        </div>
                        {selectedRole === "admin" && (
                          <div className="text-blue-600">
                            <CheckCircle className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 ml-7">
                        {getRoleDescription("admin")}
                      </p>
                    </div>
                  </div>

                  {/* Warning for role changes */}
                  {selectedRole !== user.role && (
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        <span className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                          Role Change Warning
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                        This action will immediately change the user&apos;s role and permissions. 
                        The change will be logged in the audit system.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isUpdating || selectedRole === user.role}
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${
                isUpdating || selectedRole === user.role
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500"
              }`}
            >
              {isUpdating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : selectedRole === user.role ? (
                "No Changes"
              ) : (
                "Update Role"
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isUpdating}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
