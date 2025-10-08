import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth-utils.server";
import { hasCMSAdminRole } from "../../../lib/cms-auth";
import SEOTools from "./_components/SEOTools";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">SEO Tools</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Analyze and optimize your content for search engines
          </p>
        </div>
      </div>

      <SEOTools />
    </div>
  );
}
