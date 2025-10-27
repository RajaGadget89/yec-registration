import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth-utils.server";
import { hasCMSAdminRole } from "../../../lib/cms-auth";
import FooterManagement from "./_components/FooterManagement";
import AdminHeader from "../../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Footer Content Management - CMS Admin",
  description:
    "Manage footer content including company info, social links, quick links, and contact details",
};

export default async function FooterManagementPage() {
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
        title="Footer Content Management"
        subtitle="Manage all footer content including company information, social media links, quick links, contact details, and copyright information."
      />
      <FooterManagement />
    </div>
  );
}
