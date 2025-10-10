import { Metadata } from "next";
import { getCurrentUser } from "../../../../lib/auth-utils.server";
import { hasCMSAdminRole } from "../../../../lib/cms-auth";
import { redirect } from "next/navigation";
import AdminHeader from "../../../_components/AdminHeader";
import NewEventForm from "./_components/NewEventForm";

export const metadata: Metadata = {
  title: "Create Event - CMS",
  description: "Create new event settings",
};

export default async function NewEventPage() {
  const user = await getCurrentUser();
  if (!user)
    redirect(
      "/auth/login?redirect=/admin/content-management/event-settings/new",
    );
  const allowed = await hasCMSAdminRole(user.email);
  if (!allowed) redirect("/403");

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader compact title="Create Event" />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <NewEventForm />
      </main>
    </div>
  );
}
