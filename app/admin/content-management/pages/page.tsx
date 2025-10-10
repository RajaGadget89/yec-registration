import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth-utils.server";
import { hasCMSAdminRole } from "../../../lib/cms-auth";
import PagesManagement from "./_components/PagesManagement";
import AdminHeader from "../../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Pages Management - CMS Admin",
  description: "Manage website pages and content",
};

export default async function PagesManagementPage() {
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
        title="Pages Management"
        subtitle="Create, edit, and manage website pages"
      />

      <PagesManagement />
    </div>
  );
}
