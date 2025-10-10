import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../../lib/auth-utils.server";
import { hasCMSAdminRole } from "../../../../lib/cms-auth";
import NewsEditor from "../_components/NewsEditor";
import AdminHeader from "../../../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Edit News Article - CMS Admin",
  description: "Edit news article content and settings",
};

interface EditNewsPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditNewsPage({ params }: EditNewsPageProps) {
  const { id } = await params;

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
        backHref="/admin/content-management/news"
        title="Edit News Article"
        subtitle="Update news article content and settings"
      />

      <NewsEditor articleId={id} />
    </div>
  );
}
