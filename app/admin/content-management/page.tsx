import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth-utils.server";
import { hasCMSAdminRole } from "../../lib/cms-auth";
import CMSDashboard from "./_components/CMSDashboard";
import AdminHeader from "../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Content Management System - YEC Day Admin",
  description: "Manage website content, media, and branding",
};

export default async function ContentManagementPage() {
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
    <div className="space-y-8">
      <AdminHeader
        title="Content Management System"
        subtitle="Manage your website content, media, branding, and news articles with our comprehensive CMS."
      />

      <CMSDashboard />
    </div>
  );
}
