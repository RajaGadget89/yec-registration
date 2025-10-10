import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth-utils.server";
import { hasCMSAdminRole } from "../../../lib/cms-auth";
import HeroVideosManagement from "./_components/HeroVideosManagement";
import AdminHeader from "../../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Hero Videos Management - CMS Admin",
  description: "Configure hero videos for different devices",
};

export default async function HeroVideosPage() {
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
        title="Hero Videos Management"
        subtitle="Configure hero videos for different devices and screen sizes"
      />

      <HeroVideosManagement />
    </div>
  );
}
