import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../../lib/auth-utils.server";
import { hasCMSAdminRole } from "../../../../lib/cms-auth";
import PageEditor from "../_components/PageEditor";

export const metadata: Metadata = {
  title: "Edit Page - CMS Admin",
  description: "Edit website page",
};

export default async function EditPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }
  const isSuperAdmin = user.role === "super_admin";
  const hasCMSAccess = isSuperAdmin || (await hasCMSAdminRole(user.email));
  if (!hasCMSAccess) {
    redirect("/admin");
  }

  return (
    <div className="space-y-6">
      <PageEditor pageId={id} />
    </div>
  );
}
