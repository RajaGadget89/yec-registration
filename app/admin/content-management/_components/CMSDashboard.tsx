"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Image,
  Video,
  Palette,
  Newspaper,
  Smartphone,
  Search,
  Eye,
  Layout,
  Clock,
} from "lucide-react";

interface CMSStats {
  totalPages: number;
  totalNews: number;
  totalMedia: number;
  recentActivity: number;
}

export default function CMSDashboard() {
  const [stats, setStats] = useState<CMSStats>({
    totalPages: 0,
    totalNews: 0,
    totalMedia: 0,
    recentActivity: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch CMS stats
    const fetchStats = async () => {
      try {
        // TODO: Implement API calls to fetch actual stats
        // For now, using mock data
        setStats({
          totalPages: 12,
          totalNews: 8,
          totalMedia: 45,
          recentActivity: 3,
        });
      } catch (error) {
        console.error("Error fetching CMS stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const quickActions = [
    {
      href: "/admin/content-management/pages",
      icon: FileText,
      title: "Manage Pages",
      description: "Create and edit website pages",
      color: "from-blue-500 to-blue-600",
    },
    {
      href: "/admin/content-management/news",
      icon: Newspaper,
      title: "News Management",
      description: "Manage news articles and updates",
      color: "from-green-500 to-green-600",
    },
    {
      href: "/admin/content-management/media",
      icon: Image,
      title: "Media Library",
      description: "Upload and organize media files",
      color: "from-purple-500 to-purple-600",
    },
    {
      href: "/admin/content-management/branding",
      icon: Palette,
      title: "Branding",
      description: "Manage logos and brand colors",
      color: "from-pink-500 to-pink-600",
    },
  ];

  const managementSections = [
    {
      href: "/admin/content-management/activity-cards",
      icon: Layout,
      title: "Activity Cards",
      description: "Manage activity cards for landing page",
    },
    {
      href: "/admin/content-management/hero-videos",
      icon: Video,
      title: "Hero Videos",
      description: "Configure hero videos for different devices",
    },
    {
      href: "/admin/content-management/responsive",
      icon: Smartphone,
      title: "Responsive Content",
      description: "Device-specific content management",
    },
    {
      href: "/admin/content-management/seo",
      icon: Search,
      title: "SEO Tools",
      description: "Optimize content for search engines",
    },
    {
      href: "/admin/content-management/preview",
      icon: Eye,
      title: "Content Preview",
      description: "Real-time content preview",
    },
    {
      href: "/admin/content-management/templates",
      icon: Layout,
      title: "Templates",
      description: "Manage content templates",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yec-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Pages</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalPages}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">News Articles</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalNews}</p>
            </div>
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/20">
              <Newspaper className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Media Files</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalMedia}</p>
            </div>
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/20">
              <Image className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Recent Activity</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.recentActivity}</p>
            </div>
            <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/20">
              <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              href={action.href}
              className="group p-6 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-yec-primary dark:hover:border-yec-accent transition-all duration-200 hover:shadow-lg"
            >
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-lg bg-gradient-to-r ${action.color} shadow-lg group-hover:shadow-xl transition-all duration-200`}>
                  <action.icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-yec-primary transition-colors duration-200">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {action.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Management Sections */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Content Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {managementSections.map((section, index) => (
            <Link
              key={index}
              href={section.href}
              className="group p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-yec-primary dark:hover:border-yec-accent transition-all duration-200 hover:shadow-md"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-yec-primary/10 to-yec-accent/10 group-hover:from-yec-primary/20 group-hover:to-yec-accent/20 transition-all duration-200">
                  <section.icon className="h-5 w-5 text-yec-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-yec-primary transition-colors duration-200">
                    {section.title}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {section.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Recent Activity</h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/20">
              <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">New page created</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">About Us page was created</p>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">2 hours ago</span>
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20">
              <Newspaper className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">News article published</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">YEC Day 2024 Announcement</p>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">5 hours ago</span>
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
            <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/20">
              <Image className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Media uploaded</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">5 new images added to gallery</p>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">1 day ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}
