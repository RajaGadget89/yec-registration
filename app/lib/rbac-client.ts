"use client";

import { useState, useEffect } from "react";
import type { Role, Dimension } from "./rbac";

export interface UserPermissions {
  roles: Set<Role>;
  canReviewPayment: boolean;
  canReviewProfile: boolean;
  canReviewTcc: boolean;
  canApprove: boolean;
  isSuperAdmin: boolean;
}

export interface RBACData {
  email: string;
  roles: Role[];
  envBuildId: string;
}

export function useRBAC() {
  const [permissions, setPermissions] = useState<UserPermissions>({
    roles: new Set(),
    canReviewPayment: false,
    canReviewProfile: false,
    canReviewTcc: false,
    canApprove: false,
    isSuperAdmin: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RBACData | null>(null);

  useEffect(() => {
    async function fetchRBAC() {
      try {
        const response = await fetch("/api/admin/me");
        if (response.ok) {
          const rbacData: RBACData = await response.json();
          const roles = new Set(rbacData.roles);

          setData(rbacData);
          setPermissions({
            roles,
            canReviewPayment:
              roles.has("admin_payment") || roles.has("super_admin"),
            canReviewProfile:
              roles.has("admin_profile") || roles.has("super_admin"),
            canReviewTcc: roles.has("admin_tcc") || roles.has("super_admin"),
            canApprove: roles.has("super_admin"),
            isSuperAdmin: roles.has("super_admin"),
          });
        } else {
          setError("Failed to fetch RBAC data");
        }
      } catch {
        setError("Failed to fetch RBAC data");
      } finally {
        setLoading(false);
      }
    }

    fetchRBAC();
  }, []);

  // Helper functions for action gating
  const canReview = (dimension: Dimension): boolean => {
    switch (dimension) {
      case "payment":
        return permissions.canReviewPayment;
      case "profile":
        return permissions.canReviewProfile;
      case "tcc":
        return permissions.canReviewTcc;
      default:
        return false;
    }
  };

  const canApprove = (): boolean => {
    return permissions.canApprove;
  };

  return {
    permissions,
    loading,
    error,
    data,
    canReview,
    canApprove,
  };
}

// Backward-compatible alias used by UI components
export function useUserPermissions() {
  return useRBAC();
}
