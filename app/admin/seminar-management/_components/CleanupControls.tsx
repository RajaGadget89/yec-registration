"use client";

import { useState } from "react";
import { Trash2, Shield } from "lucide-react";

export default function CleanupControls() {
  const [preview, setPreview] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const runPreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        "/api/admin/seminar-management/cleanup?dryRun=true",
        { method: "POST" },
      );
      const data = await res.json();
      setPreview(data.counts || {});
    } catch (_e) {
      setError("Failed to preview cleanup");
    } finally {
      setLoading(false);
    }
  };

  const executeCleanup = async () => {
    if (confirmText !== "DELETE") {
      setError("Type DELETE to confirm");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        "/api/admin/seminar-management/cleanup?dryRun=false&confirm=DELETE",
        { method: "POST" },
      );
      if (!res.ok) throw new Error("cleanup failed");
      setPreview(null);
      setConfirmText("");
      alert("Cleanup completed.");
    } catch (_e) {
      setError("Cleanup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 p-4 border border-red-300 dark:border-red-700 rounded-md bg-red-50 dark:bg-red-900/10">
      <div className="flex items-center gap-2 mb-2">
        <Trash2 className="h-4 w-4 text-red-600" />
        <h4 className="font-semibold text-red-800 dark:text-red-300">
          Danger Zone
        </h4>
      </div>
      <p className="text-sm text-red-700 dark:text-red-400 mb-3">
        Clean seminar imported data. Hotels and Events are preserved.
      </p>
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={runPreview}
          disabled={loading}
          className="px-3 py-1.5 rounded bg-yellow-500 text-white hover:bg-yellow-600"
        >
          Preview Deletions
        </button>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Type DELETE"
          className="px-2 py-1 border rounded"
        />
        <button
          onClick={executeCleanup}
          disabled={loading}
          className="px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 inline-flex items-center gap-1"
        >
          <Shield className="h-4 w-4" /> Execute
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {preview && (
        <div className="text-sm">
          {Object.entries(preview).map(([table, count]) => (
            <div key={table} className="flex justify-between">
              <span>{table}</span>
              <span>{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
