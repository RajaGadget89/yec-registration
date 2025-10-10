import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../../lib/auth-utils.server";
import { hasCMSAdminRole } from "../../../../lib/cms-auth";
import ActivityCardEditor from "../_components/ActivityCardEditor";
import AdminHeader from "../../../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Edit Activity Card - CMS Admin",
  description: "Edit activity card content and settings",
};

interface EditActivityCardPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditActivityCardPage({
  params,
}: EditActivityCardPageProps) {
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
        backHref="/admin/content-management/activity-cards"
        title="Edit Activity Card"
        subtitle="Update activity card content and settings"
      />

      <ActivityCardEditor cardId={id} />
    </div>
  );
}
