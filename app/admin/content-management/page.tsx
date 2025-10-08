import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth-utils.server";
import { hasCMSAdminRole } from "../../lib/cms-auth";
import CMSDashboard from "./_components/CMSDashboard";

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
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Content Management System
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Manage your website content, media, branding, and news articles with our comprehensive CMS.
        </p>
      </div>

      <CMSDashboard />
    </div>
  );
}
