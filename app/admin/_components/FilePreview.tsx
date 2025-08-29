"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import NextImage from "next/image";
import {
  Loader2,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Download,
  AlertCircle,
  Eye,
} from "lucide-react";
import { useToastHelpers } from "@/app/components/ui/toast";
import { t } from "@/app/lib/i18n";

interface FilePreviewProps {
  registrationId: string;
  path: string | null;
  label: string;
}

export default function FilePreview({
  registrationId,
  path,
  label,
}: FilePreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Record<string, { url: string; ts: number }>>({});
  const toast = useToastHelpers();

  const isImage = useMemo(
    () => (path ? /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(path) : false),
    [path],
  );
  const isPdf = useMemo(() => (path ? /\.pdf$/i.test(path) : false), [path]);

  useEffect(() => {
    if (!path) {
      setUrl(null);
      setError(null);
      return;
    }

    const cacheKey = `${registrationId}:${path}`;
    const cached = cacheRef.current[cacheKey];
    const now = Date.now();
    // treat URLs as valid for ~8 minutes to avoid frequent fetches
    if (cached && now - cached.ts < 8 * 60 * 1000) {
      setUrl(cached.url);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    console.log(
      `[FilePreview] Fetching signed URL for: registrationId=${registrationId}, path=${path}`,
    );

    fetch(
      `/api/admin/files/signed-url?registrationId=${registrationId}&path=${encodeURIComponent(path)}`,
    )
      .then(async (r) => {
        console.log(`[FilePreview] Response status: ${r.status}`);
        if (!r.ok) {
          const errorText = await r.text();
          console.error(`[FilePreview] HTTP error ${r.status}:`, errorText);
          throw new Error(`HTTP ${r.status}: ${errorText}`);
        }
        const json = await r.json();
        console.log(`[FilePreview] Response JSON:`, json);
        return json.url as string;
      })
      .then((u) => {
        if (cancelled) return;
        console.log(`[FilePreview] Successfully got signed URL`);
        cacheRef.current[cacheKey] = { url: u, ts: Date.now() };
        setUrl(u);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[FilePreview] Error:", err);
        setError(err.message || "Failed to load file");
        toast.error(t("preview_error"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [registrationId, path, toast]);

  if (!path) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
        <FileText className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          {t("file_missing")}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl border-2 border-dashed border-red-300 dark:border-red-600">
        <AlertCircle className="h-12 w-12 text-red-400 dark:text-red-500 mb-3" />
        <p className="text-sm text-red-600 dark:text-red-400 text-center mb-2">
          {t("preview_error")}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-600">
        <div className="relative">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-3" />
          <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-lg animate-pulse"></div>
        </div>
        <p className="text-sm text-blue-600 dark:text-blue-400 text-center">
          Loading {label.toLowerCase()}...
        </p>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
        <FileText className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          {t("file_missing")}
        </p>
      </div>
    );
  }

  return (
    <div className="relative group">
      {/* File Preview Container */}
      <div className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-lg transition-all duration-300">
        {isImage ? (
          <div className="relative w-full h-48">
            <NextImage
              src={url}
              alt={label}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex space-x-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-lg text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <a
                  href={url}
                  download
                  className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-lg text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                  title="Download file"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        ) : isPdf ? (
          <div className="relative">
            <div className="w-full h-48 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 flex items-center justify-center">
              <div className="text-center">
                <FileText className="h-16 w-16 text-red-500 dark:text-red-400 mx-auto mb-2" />
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                  PDF Document
                </p>
              </div>
            </div>
            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex space-x-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-lg text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  title="Open PDF"
                >
                  <Eye className="h-4 w-4" />
                </a>
                <a
                  href={url}
                  download
                  className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-lg text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                  title="Download PDF"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="w-full h-48 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
              <div className="text-center">
                <FileText className="h-16 w-16 text-gray-500 dark:text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Document
                </p>
              </div>
            </div>
            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex space-x-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-lg text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  title="Open file"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <a
                  href={url}
                  download
                  className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-lg text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                  title="Download file"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* File Info */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isImage ? (
            <ImageIcon className="h-4 w-4 text-blue-500" />
          ) : isPdf ? (
            <FileText className="h-4 w-4 text-red-500" />
          ) : (
            <FileText className="h-4 w-4 text-gray-500" />
          )}
          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            {label}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href={url}
            download
            className="p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
            title="Download file"
          >
            <Download className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
