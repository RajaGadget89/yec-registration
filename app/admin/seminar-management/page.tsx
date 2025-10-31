import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth-utils.server";
import AdminHeader from "../_components/AdminHeader";
import SeminarManagementClient from "./_components/SeminarManagementClient";
import CleanupControls from "./_components/CleanupControls";

export const metadata: Metadata = {
  title: "Seminar Management - YEC Day Admin",
  description:
    "Manage seminar participants, import Excel data, and handle RAG queries",
};

export default async function SeminarManagementPage() {
  // Check authentication and admin access
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }

  // Check admin role (any admin can access)
  if (user.role !== "super_admin" && user.role !== "admin") {
    redirect("/admin");
  }

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Seminar Management"
        subtitle="Manage seminar participants, import Excel data, and handle RAG queries for the Private RAG system."
      />

      <SeminarManagementClient />
      <CleanupControls />
    </div>
  );
}
