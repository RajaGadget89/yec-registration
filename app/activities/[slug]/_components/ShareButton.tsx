"use client";

import { Share2 } from "lucide-react";
import { useState, useEffect } from "react";

type ShareButtonProps = {
  title: string;
  text: string;
  url: string;
};

export default function ShareButton({ title, text, url }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [actualUrl, setActualUrl] = useState(url);

  useEffect(() => {
    // Use actual browser URL if available (more accurate)
    if (typeof window !== "undefined") {
      setActualUrl(window.location.href);
    }
  }, []);

  const handleShare = async () => {
    const shareData = {
      title,
      text,
      url: actualUrl,
    };

    if (
      typeof navigator !== "undefined" &&
      navigator.share &&
      navigator.canShare &&
      navigator.canShare(shareData)
    ) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error occurred - ignore
        if ((err as Error).name !== "AbortError") {
          console.error("Error sharing:", err);
        }
      }
    } else {
      // Fallback: copy to clipboard
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(actualUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } else {
          // Final fallback: show URL in alert
          alert(`Share this link: ${actualUrl}`);
        }
      } catch (err) {
        console.error("Failed to copy:", err);
        // Final fallback: show URL in alert
        alert(`Share this link: ${actualUrl}`);
      }
    }
  };

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center px-4 py-2 bg-yec-primary hover:bg-yec-accent text-white font-medium rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
      aria-label="Share this activity"
    >
      <Share2 className="h-4 w-4 mr-2" />
      <span>{copied ? "Copied!" : "Share"}</span>
    </button>
  );
}
