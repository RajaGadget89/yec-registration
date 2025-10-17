"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Users,
  DollarSign,
  Calendar,
  Settings,
  Upload,
  ChevronRight,
  Hash,
} from "lucide-react";

interface SuperAdminDropdownProps {
  isCheckinEnabled: boolean;
}

export default function SuperAdminDropdown({
  isCheckinEnabled,
}: SuperAdminDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
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
      href: "/admin/management",
      icon: Users,
      label: "Admin Management Team",
      description: "Manage admin users and roles",
      show: process.env.FEATURES_ADMIN_MANAGEMENT !== "false",
    },
    {
      href: "/admin/super-admin/form-email-templates",
      icon: Settings,
      label: "Form Email Templates",
      description: "Configure email templates for forms",
      show: true,
    },
    {
      href: "/admin/pricing-management",
      icon: DollarSign,
      label: "Pricing Management",
      description: "Configure pricing and packages",
      show: true,
      submenu: [
        {
          href: "/admin/pricing-management",
          label: "Traditional Registration",
          description: "Manage pricing for traditional forms",
        },
        {
          href: "/admin/super-admin/form-pricing",
          label: "Form Pricing Management",
          description: "Configure pricing for new registration forms",
        },
      ],
    },
    {
      href: "/admin/super-admin/tracking-id-config",
      icon: Hash,
      label: "Tracking ID Format",
      description: "Configure tracking ID formats for forms",
      show: true,
    },
    {
      href: "/admin/import",
      icon: Upload,
      label: "Google Form Import",
      description: "Import registration data from Google Forms",
      show: true,
    },
    {
      href: "/admin/checkin/events",
      icon: Calendar,
      label: "Manage Events",
      description: "Create and manage check-in events",
      show: isCheckinEnabled,
    },
  ].filter((item) => item.show);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-yec-primary dark:hover:text-yec-accent transition-all duration-300 hover:scale-105 group"
      >
        <div className="p-2 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 shadow-sm group-hover:shadow-md group-hover:from-yec-primary/10 group-hover:to-yec-accent/10 transition-all duration-300">
          <Settings className="h-4 w-4" />
        </div>
        <span className="font-semibold">Super Admin</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Super Admin Tools
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Advanced management and configuration
            </p>
          </div>

          <div className="py-2">
            {menuItems.map((item, _index) => (
              <div key={item.href}>
                {item.submenu ? (
                  <div className="relative">
                    <button
                      onClick={() =>
                        setOpenSubmenu(
                          openSubmenu === item.href ? null : item.href,
                        )
                      }
                      className="flex items-center justify-between w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-yec-primary/10 to-yec-accent/10 group-hover:from-yec-primary/20 group-hover:to-yec-accent/20 transition-all duration-200">
                          <item.icon className="h-4 w-4 text-yec-primary" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-yec-primary transition-colors duration-200">
                            {item.label}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {item.description}
                          </div>
                        </div>
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                          openSubmenu === item.href ? "rotate-90" : ""
                        }`}
                      />
                    </button>

                    {openSubmenu === item.href && (
                      <div className="bg-gray-50 dark:bg-gray-700 border-l-2 border-yec-primary/20">
                        {item.submenu.map((subItem) => (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className="flex items-center space-x-3 px-8 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 group"
                            onClick={() => {
                              setIsOpen(false);
                              setOpenSubmenu(null);
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-800 dark:text-gray-200 group-hover:text-yec-primary transition-colors duration-200">
                                {subItem.label}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {subItem.description}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
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
                )}
              </div>
            ))}
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="w-2 h-2 bg-yec-primary rounded-full"></div>
              <span>Super Admin privileges required</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
