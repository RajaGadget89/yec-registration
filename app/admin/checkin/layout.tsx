import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Check-in System - Admin Dashboard",
  description: "Manage check-in events and view attendance statistics",
};

export default function CheckinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
