import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth-utils.server";
import { hasCMSAdminRole } from "../../../lib/cms-auth";
import ContentPreview from "./_components/ContentPreview";

export const metadata: Metadata = {
  title: "Content Preview - CMS Admin",
  description: "Real-time content preview",
};

export default async function ContentPreviewPage() {
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Content Preview</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Real-time preview of your content across different devices
          </p>
        </div>
      </div>

      <ContentPreview />
    </div>
  );
}
