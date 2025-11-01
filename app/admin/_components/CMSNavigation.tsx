"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ChevronDown,
  FileText,
  Image,
  Video,
  Palette,
  Newspaper,
  Smartphone,
  Search,
  Eye,
  Layout,
  Settings,
  Layers,
  Home,
} from "lucide-react";

interface CMSNavigationProps {
  hasCMSAccess: boolean;
}

export default function CMSNavigation({ hasCMSAccess }: CMSNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const menuItems = [
    {
      href: "/admin/content-management",
      icon: FileText,
      label: "Content Management",
      description: "Manage pages and content",
      show: true,
    },
    {
      href: "/admin/content-management/landing-page",
      icon: Home,
      label: "Landing Page Sections",
      description: "Manage landing page section visibility",
      show: true,
    },
    {
      href: "/admin/content-management/activity-cards",
      icon: Layout,
      label: "Activity Cards",
      description: "Manage activity cards",
      show: true,
    },
    {
      href: "/admin/content-management/hero-videos",
      icon: Video,
      label: "Hero Videos",
      description: "Configure hero videos",
      show: true,
    },
    {
      href: "/admin/content-management/branding",
      icon: Palette,
      label: "Branding",
      description: "Manage logos and branding",
      show: true,
    },
    {
      href: "/admin/content-management/footer",
      icon: Layers,
      label: "Footer Content",
      description: "Manage footer content and links",
      show: true,
    },
    {
      href: "/admin/content-management/media",
      icon: Image,
      label: "Media Library",
      description: "Upload and manage media",
      show: true,
    },
    {
      href: "/admin/content-management/news",
      icon: Newspaper,
      label: "News Management",
      description: "Manage news articles",
      show: true,
    },
    {
      href: "/admin/content-management/responsive",
      icon: Smartphone,
      label: "Responsive Content",
      description: "Device-specific content",
      show: true,
    },
    {
      href: "/admin/content-management/seo",
      icon: Search,
      label: "SEO Tools",
      description: "SEO optimization tools",
      show: true,
    },
    {
      href: "/admin/content-management/preview",
      icon: Eye,
      label: "Content Preview",
      description: "Real-time content preview",
      show: true,
    },
    {
      href: "/admin/content-management/templates",
      icon: Layout,
      label: "Templates",
      description: "Content templates",
      show: true,
    },
  ].filter((item) => item.show);

  if (!hasCMSAccess) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-yec-primary dark:hover:text-yec-accent transition-all duration-300 hover:scale-105 group"
      >
        <div className="p-2 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 shadow-sm group-hover:shadow-md group-hover:from-yec-primary/10 group-hover:to-yec-accent/10 transition-all duration-300">
          <Settings className="h-4 w-4" />
        </div>
        <span className="font-semibold">Content Management</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Content Management System
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage website content and media
            </p>
          </div>

          <div className="py-2">
            {menuItems.map((item, _index) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 group"
                onClick={() => setIsOpen(false)}
              >
                <div className="p-2 rounded-lg bg-gradient-to-br from-yec-primary/10 to-yec-accent/10 group-hover:from-yec-primary/20 group-hover:to-yec-accent/20 transition-all duration-200">
                  <item.icon className="h-4 w-4 text-yec-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-yec-primary transition-colors duration-200">
                    {item.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {item.description}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="w-2 h-2 bg-yec-primary rounded-full"></div>
              <span>CMS Admin privileges required</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
