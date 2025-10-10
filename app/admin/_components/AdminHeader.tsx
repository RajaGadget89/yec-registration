"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type AdminHeaderProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  actions?: React.ReactNode;
  compact?: boolean;
};

export default function AdminHeader({
  title,
  subtitle,
  backHref,
  actions,
  compact = false,
}: AdminHeaderProps) {
  return (
    <div className={compact ? "mb-6" : "mb-8"}>
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-yec-primary/10 via-blue-400/10 to-yec-accent/10" />

        <div
          className={
            compact
              ? "relative px-4 sm:px-6 lg:px-8 py-4"
              : "relative px-4 sm:px-6 lg:px-8 py-6"
          }
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-2">
                {backHref && (
                  <Link
                    href={backHref}
                    className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Link>
                )}
              </div>
              <h1
                className={
                  compact
                    ? "text-2xl font-bold text-gray-900 dark:text-white"
                    : "text-3xl md:text-4xl font-bold text-gray-900 dark:text-white"
                }
              >
                {title}
              </h1>
              {subtitle && (
                <p className="mt-2 text-gray-600 dark:text-gray-300 max-w-3xl">
                  {subtitle}
                </p>
              )}
            </div>

            {actions && (
              <div className="shrink-0 flex items-center gap-2">{actions}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
