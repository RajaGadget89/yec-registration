import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth-utils.server";
import { hasCMSAdminRole } from "../../../lib/cms-auth";
import NewsManagement from "./_components/NewsManagement";
import AdminHeader from "../../_components/AdminHeader";

export const metadata: Metadata = {
  title: "News Management - CMS Admin",
  description: "Manage news articles and updates",
};

export default async function NewsManagementPage() {
  // Check authentication and CMS access
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }

  // Check CMS access (super_admin or cms_admin business role)
  const isSuperAdmin = user.role === "super_admin";
  const hasCMSAccess = isSuperAdmin || (await hasCMSAdminRole(user.email));

  if (!hasCMSAccess) {
    redirect("/admin");
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        compact
        backHref="/admin/content-management"
        title="News Management"
        subtitle="Create, edit, and manage news articles"
      />

      <NewsManagement />
    </div>
  );
}
