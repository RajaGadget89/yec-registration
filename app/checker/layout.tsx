import type { Metadata } from "next";

// Force dynamic rendering for checker routes that use cookies
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checker Admin - YEC Day Registration",
  description: "Mobile checker interface for YEC Day event check-in",
};

export default async function CheckerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The middleware handles authentication for protected routes
  // This layout only provides the UI wrapper
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
