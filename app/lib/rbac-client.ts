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
  // Granular permissions for dimension actions
  can: {
    request: {
      payment: boolean;
      profile: boolean;
      tcc: boolean;
    };
    pass: {
      payment: boolean;
      profile: boolean;
      tcc: boolean;
    };
  };
}

export interface RBACData {
  email: string;
  roles: Role[];
  business_roles: string[];
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
    can: {
      request: {
        payment: false,
        profile: false,
        tcc: false,
      },
      pass: {
        payment: false,
        profile: false,
        tcc: false,
      },
    },
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

          // Calculate granular permissions
          const isSuperAdmin = roles.has("super_admin");

          // Map business roles to RBAC permissions
          const businessRoles = new Set(rbacData.business_roles || []);
          const canReviewPayment =
            roles.has("admin_payment") ||
            businessRoles.has("payment_slip") ||
            isSuperAdmin;
          const canReviewProfile =
            roles.has("admin_profile") ||
            businessRoles.has("user_profile") ||
            isSuperAdmin;
          const canReviewTcc =
            roles.has("admin_tcc") ||
            businessRoles.has("tcc_card") ||
            isSuperAdmin;

          setPermissions({
            roles,
            canReviewPayment,
            canReviewProfile,
            canReviewTcc,
            canApprove: isSuperAdmin,
            isSuperAdmin,
            can: {
              request: {
                payment: canReviewPayment,
                profile: canReviewProfile,
                tcc: canReviewTcc,
              },
              pass: {
                payment: canReviewPayment,
                profile: canReviewProfile,
                tcc: canReviewTcc,
              },
            },
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
