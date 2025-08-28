"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart3, Home, Shield, Users } from "lucide-react";

export default function AdminNavigation() {
  const [featureFlags, setFeatureFlags] = useState<{ adminManagement?: boolean }>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeatureFlags = async () => {
      try {
        const response = await fetch("/api/features");
        if (response.ok) {
          const flags = await response.json();
          setFeatureFlags(flags);
        }
      } catch (error) {
        console.error("Error fetching feature flags:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeatureFlags();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center space-x-4">
        <Link
          href="/"
          className="flex items-center space-x-2 text-yec-primary hover:text-yec-accent transition-all duration-300 hover:scale-105 group"
        >
          <div className="p-2 rounded-xl bg-gradient-to-br from-yec-primary to-yec-accent shadow-lg group-hover:shadow-xl transition-all duration-300">
            <Home className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-yec-primary to-yec-accent bg-clip-text text-transparent">
            YEC Day
          </span>
        </Link>
        <div className="w-px h-6 bg-gradient-to-b from-gray-300 to-transparent dark:from-gray-600"></div>
        <Link
          href="/admin"
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-yec-primary dark:hover:text-yec-accent transition-all duration-300 hover:scale-105 group"
        >
          <div className="p-2 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 shadow-sm group-hover:shadow-md group-hover:from-yec-primary/10 group-hover:to-yec-accent/10 transition-all duration-300">
            <BarChart3 className="h-4 w-4" />
          </div>
          <span className="font-semibold">Admin</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      <Link
        href="/"
        className="flex items-center space-x-2 text-yec-primary hover:text-yec-accent transition-all duration-300 hover:scale-105 group"
      >
        <div className="p-2 rounded-xl bg-gradient-to-br from-yec-primary to-yec-accent shadow-lg group-hover:shadow-xl transition-all duration-300">
          <Home className="h-5 w-5 text-white" />
        </div>
        <span className="font-bold text-lg bg-gradient-to-r from-yec-primary to-yec-accent bg-clip-text text-transparent">
          YEC Day
        </span>
      </Link>
      <div className="w-px h-6 bg-gradient-to-b from-gray-300 to-transparent dark:from-gray-600"></div>
      <Link
        href="/admin"
        className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-yec-primary dark:hover:text-yec-accent transition-all duration-300 hover:scale-105 group"
      >
        <div className="p-2 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 shadow-sm group-hover:shadow-md group-hover:from-yec-primary/10 group-hover:to-yec-accent/10 transition-all duration-300">
          <BarChart3 className="h-4 w-4" />
        </div>
        <span className="font-semibold">Admin</span>
      </Link>
      <div className="w-px h-6 bg-gradient-to-b from-gray-300 to-transparent dark:from-gray-600"></div>
      <Link
        href="/admin/audit"
        className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-yec-primary dark:hover:text-yec-accent transition-all duration-300 hover:scale-105 group"
      >
        <div className="p-2 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 shadow-sm group-hover:shadow-md group-hover:from-yec-primary/10 group-hover:to-yec-accent/10 transition-all duration-300">
          <Shield className="h-4 w-4" />
        </div>
        <span className="font-semibold">Audit</span>
      </Link>
      
      {/* Admin Management Link - Only show if feature is enabled */}
      {featureFlags.adminManagement && (
        <>
          <div className="w-px h-6 bg-gradient-to-b from-gray-300 to-transparent dark:from-gray-600"></div>
          <Link
            href="/admin/management"
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-yec-primary dark:hover:text-yec-accent transition-all duration-300 hover:scale-105 group"
          >
            <div className="p-2 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 shadow-sm group-hover:shadow-md group-hover:from-yec-primary/10 group-hover:to-yec-accent/10 transition-all duration-300">
              <Users className="h-4 w-4" />
            </div>
            <span className="font-semibold">Management</span>
          </Link>
        </>
      )}
      
      <div className="w-px h-6 bg-gradient-to-b from-gray-300 to-transparent dark:from-gray-600"></div>
      <span className="text-gray-500 dark:text-gray-400 font-medium">
        Dashboard
      </span>
    </div>
  );
}

