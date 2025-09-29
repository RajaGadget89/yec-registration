"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Loader2,
  FileText,
  Download,
  ExternalLink,
  AlertCircle,
  Eye,
} from "lucide-react";
import { useToastHelpers } from "@/components/ui/toast";
import { t } from "@/lib/i18n";

interface FileCardProps {
  registrationId: string;
  path: string | null;
  label: string;
  onClick: () => void;
  className?: string;
}

export default function FileCard({
  registrationId,
  path,
  label,
  onClick,
  className = "",
}: FileCardProps) {
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

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!url) return;

    try {
      // Fetch the file from the signed URL
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch file");

      // Get the blob data
      const blob = await response.blob();

      // Create a temporary URL for the blob
      const blobUrl = window.URL.createObjectURL(blob);

      // Create a temporary anchor element and trigger download
      const tempAnchor = document.createElement("a");
      tempAnchor.href = blobUrl;
      tempAnchor.download = path || "download"; // Use the original filename
      document.body.appendChild(tempAnchor);
      tempAnchor.click();

      // Clean up
      document.body.removeChild(tempAnchor);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Download failed. Please try again.");
    }
  };

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

    const cid = `filecard-${Date.now()}`;
    const payload = { registrationId, path, expires: 900 };

    fetch("/api/admin/files/signed-url", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": cid,
      },
      cache: "no-store",
      body: JSON.stringify(payload),
    })
      .then(async (r) => {
        if (!r.ok) {
          // Graceful: show placeholder, log machine code; avoid overlay crash
          let code = "UNKNOWN";
          try {
            const j = await r.json();
            code = j?.code ?? code;
          } catch {}
          console.warn("[FileCard] presign failed", r.status, code);
          setUrl(null); // render placeholder "No file uploaded"
          return null;
        }
        const json = await r.json();
        return json.url as string;
      })
      .then((u) => {
        if (cancelled) return;
        if (u) {
          cacheRef.current[cacheKey] = { url: u, ts: Date.now() };
          setUrl(u);
          setError(null);
        } else {
          setUrl(null);
          setError(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[FileCard] Error:", err);
        setUrl(null); // Graceful fallback to placeholder
        setError(null);
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
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 ${className}`}
      >
        <FileText className="h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {t("file_missing")}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl border-2 border-dashed border-red-300 dark:border-red-600 ${className}`}
      >
        <AlertCircle className="h-8 w-8 text-red-400 dark:text-red-500 mb-2" />
        <p className="text-xs text-red-600 dark:text-red-400 text-center mb-2">
          {t("preview_error")}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-600 ${className}`}
      >
        <div className="relative">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
          <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-lg animate-pulse"></div>
        </div>
        <p className="text-xs text-blue-600 dark:text-blue-400 text-center">
          Loading...
        </p>
      </div>
    );
  }

  if (!url) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 ${className}`}
      >
        <FileText className="h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {t("file_missing")}
        </p>
      </div>
    );
  }

  return (
    <div
      data-payment-slip-path={
        label === "Payment Slip" ? (path ?? undefined) : undefined
      }
      data-registration-id={
        label === "Payment Slip" ? registrationId : undefined
      }
      className={`relative group cursor-pointer overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-lg transition-all duration-300 ${className}`}
      onClick={onClick}
    >
      {isImage ? (
        <div className="relative w-full h-full">
          <Image
            src={url}
            alt={label}
            fill
            className={`${label === "Badge" || label === "Payment Slip" ? "object-contain" : "object-cover"} transition-transform duration-300 group-hover:scale-105`}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={(e) => {
              // Replace with a placeholder div on error
              const target = e.target as HTMLImageElement;
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `
                  <div class="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                    <div class="text-center">
                      <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      <p class="text-xs">Invalid Image</p>
                    </div>
                  </div>
                `;
              }
            }}
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
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <button
                onClick={handleDownload}
                className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-lg text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                title="Download file"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : isPdf ? (
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="text-center">
            <FileText className="h-8 w-8 text-red-500 dark:text-red-400 mx-auto mb-1" />
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">
              PDF
            </p>
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
                onClick={(e) => e.stopPropagation()}
              >
                <Eye className="h-4 w-4" />
              </a>
              <button
                onClick={handleDownload}
                className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-lg text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                title="Download PDF"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="text-center">
            <FileText className="h-8 w-8 text-gray-500 dark:text-gray-400 mx-auto mb-1" />
            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              File
            </p>
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
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <button
                onClick={handleDownload}
                className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-lg text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                title="Download file"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File label */}
      <div className="absolute bottom-1 left-1 right-1">
        <div className="bg-black/70 backdrop-blur-sm rounded px-1 py-0.5">
          <p className="text-xs text-white font-medium truncate">{label}</p>
        </div>
      </div>
    </div>
  );
}
