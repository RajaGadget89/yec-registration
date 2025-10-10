import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth-utils.server";
import { hasCMSAdminRole } from "../../../lib/cms-auth";
import BrandingManagement from "./_components/BrandingManagement";
import AdminHeader from "../../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Branding Management - CMS Admin",
  description: "Manage logos and brand colors",
};

export default async function BrandingManagementPage() {
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
        title="Branding Management"
        subtitle="Manage logos, brand colors, and visual identity"
      />

      <BrandingManagement />
    </div>
  );
}
