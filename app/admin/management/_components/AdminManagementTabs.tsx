"use client";

import InviteTab from "./InviteTab";
import PendingTab from "./PendingTab";
import AdminsTab from "./AdminsTab";
import ActivityTab from "./ActivityTab";

interface AdminUser {
  id: string;
  email: string;
  role: "admin" | "super_admin";
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  is_active: boolean;
}

interface Filters {
  search: string;
  role: string;
  status: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  page: number;
  size: number;
}

interface AdminManagementTabsProps {
  activeTab: string;
  filters: Filters;
  user: AdminUser | null;
}

export default function AdminManagementTabs({
  activeTab,
  filters,
}: AdminManagementTabsProps) {
  // Render the appropriate tab content based on activeTab
  const renderTabContent = () => {
    switch (activeTab) {
      case "invite":
        return <InviteTab />;
      case "pending":
        return <PendingTab />;
      case "admins":
        return <AdminsTab filters={filters} />;
      case "activity":
        return <ActivityTab />;
      default:
        return <InviteTab />;
    }
  };

  return <div className="space-y-6">{renderTabContent()}</div>;
}
