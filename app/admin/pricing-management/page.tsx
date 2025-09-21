import { Metadata } from "next";
import { getCurrentUser } from "../../lib/auth-utils.server";
import { getRolesForEmail } from "../../lib/rbac";
import { redirect } from "next/navigation";
import PricingManagementDashboard from "./_components/PricingManagementDashboard";

export const metadata: Metadata = {
  title: "Pricing Management - YEC Day Registration",
  description: "Manage dynamic pricing configuration for YEC Day registrations",
};

export default async function PricingManagementPage() {
  // Check if user is authenticated
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/admin/login");
  }

  // Check if user has super admin role
  const userRoles = getRolesForEmail(currentUser.email);
  const isSuperAdmin = userRoles.has("super_admin");

  if (!isSuperAdmin) {
    redirect("/admin?error=insufficient_permissions");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Pricing Management
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Configure dynamic pricing for YEC Day registrations with 6 explicit
            price fields
          </p>
        </div>

        {/* Pricing Management Dashboard */}
        <PricingManagementDashboard />
      </div>
    </div>
  );
}
