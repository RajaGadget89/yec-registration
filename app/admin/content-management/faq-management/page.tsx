import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth-utils.server";
import { hasCMSAdminRole } from "../../../lib/cms-auth";
import AdminHeader from "../../_components/AdminHeader";
import FAQManagement from "./_components/FAQManagement";

export const metadata: Metadata = {
  title: "FAQ Management | YEC Registration Admin",
  description: "Manage FAQ groups and items",
};

export default async function FAQManagementPage() {
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
        title="FAQ Management"
        subtitle="Create, edit, and manage FAQ groups and items"
      />

      <FAQManagement />
    </div>
  );
}
