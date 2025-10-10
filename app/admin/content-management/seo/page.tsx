import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth-utils.server";
import { hasCMSAdminRole } from "../../../lib/cms-auth";
import SEOTools from "./_components/SEOTools";
import AdminHeader from "../../_components/AdminHeader";

export const metadata: Metadata = {
  title: "SEO Tools - CMS Admin",
  description: "SEO optimization tools for content",
};

export default async function SEOToolsPage() {
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
        title="SEO Tools"
        subtitle="Analyze and optimize your content for search engines"
      />

      <SEOTools />
    </div>
  );
}
