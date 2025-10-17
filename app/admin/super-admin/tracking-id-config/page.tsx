import { Metadata } from "next";
import { getCurrentUser } from "../../../lib/auth-utils.server";
import { redirect } from "next/navigation";
import AdminHeader from "../../_components/AdminHeader";
import TrackingIdManagement from "./_components/TrackingIdManagement";

export const metadata: Metadata = {
  title: "Tracking ID Management - YEC Registration Admin",
  description: "Manage tracking ID formats for registration forms",
};

export default async function TrackingIdConfigPage() {
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
        title="Tracking ID Management"
        subtitle="Manage tracking ID formats for each registration form"
      />

      <TrackingIdManagement />
    </div>
  );
}
