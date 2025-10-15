import { Metadata } from "next";
import { getCurrentUser } from "../../../lib/auth-utils.server";
import { hasCMSAdminRole } from "../../../lib/admin-utils";
import { redirect } from "next/navigation";
import AdminHeader from "../../_components/AdminHeader";
import FormBuilderEditor from "./_components/FormBuilderEditor";

export const metadata: Metadata = {
  title: "Form Builder - YEC Registration Admin",
  description: "Create and manage registration forms",
};

export default async function FormBuilderPage() {
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
        title="Form Builder"
        subtitle="Create and manage registration forms for different activities"
      />

      <FormBuilderEditor />
    </div>
  );
}
