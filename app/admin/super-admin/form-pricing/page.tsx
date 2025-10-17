import { Metadata } from "next";
import { getCurrentUser } from "../../../lib/auth-utils.server";
import { redirect } from "next/navigation";
import AdminHeader from "../../_components/AdminHeader";
import PricingManagement from "./_components/PricingManagement";

export const metadata: Metadata = {
  title: "Form Pricing Management - YEC Registration Admin",
  description: "Configure pricing settings for registration forms",
};

export default async function FormPricingManagementPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }

  // Check if user has super admin role
  if (user.role !== "super_admin") {
    redirect("/admin");
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        compact
        backHref="/admin/super-admin"
        title="Form Pricing Management"
        subtitle="Configure pricing settings for each registration form"
      />

      <PricingManagement />
    </div>
  );
}
