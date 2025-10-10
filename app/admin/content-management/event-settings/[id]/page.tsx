import { Metadata } from "next";
import { getCurrentUser } from "../../../../lib/auth-utils.server";
import { hasCMSAdminRole } from "../../../../lib/cms-auth";
import { redirect } from "next/navigation";
import AdminHeader from "../../../_components/AdminHeader";
import EventSettingsEditor from "../_components/EventSettingsEditor";

export const metadata: Metadata = {
  title: "Edit Event - CMS",
  description: "Edit event settings",
};

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user)
    redirect("/auth/login?redirect=/admin/content-management/event-settings");
  const allowed = await hasCMSAdminRole(user.email);
  if (!allowed) redirect("/403");

  const { id } = await params;

  return (
    <div className="space-y-6">
      <AdminHeader
        compact
        backHref="/admin/content-management/event-settings"
        title="Edit Event - CMS"
        subtitle="Edit event settings"
      />
      <EventSettingsEditor eventId={id} />
    </div>
  );
}
