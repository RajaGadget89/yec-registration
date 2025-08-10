import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Home } from "lucide-react";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "Admin Dashboard - YEC Day Registration",
  description: "Admin dashboard for managing YEC Day registrations",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yec-primary via-blue-600 to-blue-500 relative overflow-hidden">
      {/* Light overlay for better readability */}
      <div className="absolute inset-0 bg-white/5"></div>
      
      {/* Enhanced background decorations with more light */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* Top right light */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-300/30 to-yec-accent/20 rounded-full blur-3xl"></div>
        {/* Bottom left light */}
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-yec-highlight/30 to-blue-300/20 rounded-full blur-3xl"></div>
        {/* Center light */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-to-br from-blue-200/10 to-blue-300/10 rounded-full blur-3xl"></div>
        {/* Additional light elements */}
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-blue-200/20 to-blue-300/15 rounded-full blur-2xl"></div>
        <div className="absolute bottom-1/4 left-1/3 w-48 h-48 bg-gradient-to-tr from-blue-200/15 to-blue-300/10 rounded-full blur-2xl"></div>
      </div>

      {/* Header - Fixed at top like frontend website */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link 
                href="/"
                className="flex items-center space-x-2 text-yec-primary hover:text-yec-accent transition-all duration-300 hover:scale-105 group"
              >
                <div className="p-2 rounded-xl bg-gradient-to-br from-yec-primary to-yec-accent shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <Home className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-lg bg-gradient-to-r from-yec-primary to-yec-accent bg-clip-text text-transparent">
                  YEC Day
                </span>
              </Link>
              <div className="w-px h-6 bg-gradient-to-b from-gray-300 to-transparent dark:from-gray-600"></div>
              <Link
                href="/admin"
                className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-yec-primary dark:hover:text-yec-accent transition-all duration-300 hover:scale-105 group"
              >
                <div className="p-2 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 shadow-sm group-hover:shadow-md group-hover:from-yec-primary/10 group-hover:to-yec-accent/10 transition-all duration-300">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <span className="font-semibold">Admin</span>
              </Link>
              <div className="w-px h-6 bg-gradient-to-b from-gray-300 to-transparent dark:from-gray-600"></div>
              <span className="text-gray-500 dark:text-gray-400 font-medium">Dashboard</span>
            </div>
            
            {/* Admin Status Indicator */}
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-yec-primary/10 to-yec-accent/10 border border-yec-primary/20 backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-yec-accent animate-pulse"></div>
                <span className="text-sm font-medium text-yec-primary">Admin Mode</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Adjusted padding to account for fixed header */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[calc(100vh-16rem)] relative pt-20">
        <div className="animate-fade-in-up">
          {children}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
