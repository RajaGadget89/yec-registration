"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { LogOut, User, Shield, Crown } from "lucide-react";
import type { AuthenticatedUser } from "../../lib/auth-client";

interface AdminUserInfoClientProps {
  user: AuthenticatedUser | null;
}

interface ClientUser {
  email: string;
  roles: string[];
  envBuildId: string;
}

export default function AdminUserInfoClient({
  user: serverUser,
}: AdminUserInfoClientProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  // Fetch user data from client-side API (same as RBAC system)
  useEffect(() => {
    // On the login page we intentionally skip probing /api/admin/me to avoid expected 401s
    if (pathname === "/admin/login") {
      setIsLoading(false);
      return;
    }

    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/me", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!alive) return;
        if (res.ok) {
          const data: ClientUser = await res.json();
          setClientUser(data);
        }
      } catch (e) {
        console.warn("[topbar] me fetch error", e);
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [pathname]);

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

  // Use client-side user data if available, fallback to server user
  const isAuthenticated = !!(clientUser || serverUser);

  if (isLoading && !isAuthenticated) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full border bg-gray-50 dark:bg-gray-800/40">
        <div className="h-2 w-2 rounded-full animate-pulse bg-gray-400" />
        <span className="text-sm text-gray-600 dark:text-gray-300">
          Checking session…
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 backdrop-blur-sm">
        <div className="w-2 h-2 rounded-full bg-red-500"></div>
        <span className="text-sm font-medium text-red-700 dark:text-red-300">
          Not Authenticated
        </span>
      </div>
    );
  }

  // Determine role from client or server data
  const userRole: "super_admin" | "admin" = clientUser?.roles?.includes(
    "super_admin",
  )
    ? "super_admin"
    : serverUser?.role === "super_admin"
      ? "super_admin"
      : "admin";

  const userEmail = clientUser?.email || serverUser?.email || "Unknown";

  return (
    <div className="flex items-center space-x-2">
      {/* Compact User Role Badge */}
      <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-yec-primary/10 border border-yec-primary/20">
        {userRole === "super_admin" ? (
          <Crown className="h-3 w-3 text-yellow-600" />
        ) : (
          <Shield className="h-3 w-3 text-yec-primary" />
        )}
        <span className="text-xs font-medium text-yec-primary">
          {userRole === "super_admin" ? "Super Admin" : "Admin"}
        </span>
        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
      </div>

      {/* Compact User Email */}
      <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
        <User className="h-3 w-3 text-gray-500" />
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-32">
          {userEmail}
        </span>
      </div>

      {/* Compact Logout Button */}
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Sign out"
      >
        <LogOut className="h-3 w-3 text-red-600" />
        <span className="text-xs font-medium text-red-700 dark:text-red-300">
          {isLoggingOut ? "Signing out..." : "Sign out"}
        </span>
      </button>
    </div>
  );
}
