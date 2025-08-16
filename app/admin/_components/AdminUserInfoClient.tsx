"use client";

import { useState } from "react";
import { LogOut, User, Shield, Crown } from "lucide-react";
import type { AuthenticatedUser } from "../../lib/auth-client";

interface AdminUserInfoClientProps {
  user: AuthenticatedUser | null;
}

export default function AdminUserInfoClient({
  user,
}: AdminUserInfoClientProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Use the server-side logout route
      window.location.href = "/admin/logout";
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 backdrop-blur-sm">
        <div className="w-2 h-2 rounded-full bg-red-500"></div>
        <span className="text-sm font-medium text-red-700 dark:text-red-300">
          Not Authenticated
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      {/* User Info */}
      <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-yec-primary/10 to-yec-accent/10 border border-yec-primary/20 backdrop-blur-sm">
        <div className="w-2 h-2 rounded-full bg-yec-accent animate-pulse"></div>
        <div className="flex items-center space-x-1">
          {user.role === "super_admin" ? (
            <Crown className="h-3 w-3 text-yellow-600" />
          ) : (
            <Shield className="h-3 w-3 text-yec-primary" />
          )}
          <span className="text-sm font-medium text-yec-primary">
            {user.role === "super_admin" ? "Super Admin" : "Admin"}
          </span>
        </div>
      </div>

      {/* User Email */}
      <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50">
        <User className="h-3 w-3 text-gray-500" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-32">
          {user.email}
        </span>
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Sign out"
      >
        <LogOut className="h-3 w-3 text-red-600" />
        <span className="text-sm font-medium text-red-700 dark:text-red-300 hidden sm:inline">
          {isLoggingOut ? "Signing out..." : "Sign out"}
        </span>
      </button>
    </div>
  );
}
