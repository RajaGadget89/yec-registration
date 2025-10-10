import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth-utils.server";
import { hasCMSAdminRole } from "../../../lib/cms-auth";
import TemplatesManagement from "./_components/TemplatesManagement";
import AdminHeader from "../../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Templates Management - CMS Admin",
  description: "Manage content templates",
};

export default async function TemplatesPage() {
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
        title="Templates Management"
        subtitle="Create and manage content templates for consistent design"
      />

      <TemplatesManagement />
    </div>
  );
}
