import { Metadata } from "next";
import { getCurrentUser } from "../../../lib/auth-utils.server";
import { hasCMSAdminRole } from "../../../lib/cms-auth";
import { redirect } from "next/navigation";
import AdminHeader from "../../_components/AdminHeader";
import EventSettingsManagement from "./_components/EventSettingsManagement";

export const metadata: Metadata = {
  title: "Event Settings - CMS",
  description: "Manage event settings for landing page banner",
};

export default async function EventSettingsPage() {
  const user = await getCurrentUser();
  if (!user)
    redirect("/auth/login?redirect=/admin/content-management/event-settings");
  const allowed = await hasCMSAdminRole(user.email);
  if (!allowed) redirect("/403");

  return (
    <div className="space-y-6">
      <AdminHeader
        compact
        backHref="/admin/content-management"
        title="Event Settings"
        subtitle="Manage the event banner content displayed on the landing page"
      />
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <EventSettingsManagement />
        </div>
      </div>
    </div>
  );
}
