"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Download,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  role: "admin" | "super_admin";
  status: "active" | "suspended";
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  is_active: boolean;
}

interface AuthProbe {
  ok: boolean;
  email: string | null;
  err: string | null;
}

interface ConsoleApi {
  dry_run: { status: number; body: any } | null;
  execute: { status: number; body: any } | null;
}

interface UiFirstAttempt {
  dry_run: { status: number; body: any } | null;
  delete: { status: number; body: any } | null;
}

export default function DevDeleteTester() {
  // All hooks must be called at the top level, before any conditional returns
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [authProbe, setAuthProbe] = useState<AuthProbe | null>(null);
  const [consoleApi, setConsoleApi] = useState<ConsoleApi>({
    dry_run: null,
    execute: null,
  });
  const [uiFirstAttempt, setUiFirstAttempt] = useState<UiFirstAttempt>({
    dry_run: null,
    delete: null,
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cookies, setCookies] = useState<string>("");

  // Fetch admins function - defined before useEffect to avoid dependency issues
  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: "1",
        pageSize: "100",
        ...(searchTerm && { q: searchTerm }),
      });

      const response = await fetch(`/api/admin/management/admins?${params}`, {
        credentials: "same-origin",
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        setAdmins(data.admins || []);
      } else {
        console.error("Failed to fetch admins:", response.status);
      }
    } catch (error) {
      console.error("Error fetching admins:", error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  // Get current user info
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const response = await fetch("/api/admin/management/admins", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (response.ok) {
          const data = await response.json();
          // Find current user by checking cookies or use first admin as fallback
          const adminEmail = document.cookie
            .split(";")
            .find((c) => c.trim().startsWith("admin-email="))
            ?.split("=")[1];
          if (adminEmail) {
            const user = data.admins.find(
              (a: AdminUser) => a.email === decodeURIComponent(adminEmail),
            );
            if (user) {
              setCurrentUser({ id: user.id, email: user.email });
            }
          }
        }
      } catch (error) {
        console.error("Error getting current user:", error);
      }
    };

    getCurrentUser();
    setCookies(document.cookie);
  }, []);

  // Search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchAdmins();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [fetchAdmins]);

  // Dev-only gate - check after ALL hooks are declared and called
  if (
    process.env.NODE_ENV === "production" ||
    process.env.NEXT_PUBLIC_DEV_ADMIN_DELETE !== "true"
  ) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Dev Tool Not Available
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This tool is only available in development mode with
            DEV_ADMIN_DELETE enabled.
          </p>
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-left text-sm">
            <p className="font-semibold mb-2">Required flags:</p>
            <ul className="space-y-1">
              <li>• NODE_ENV !== &apos;production&apos;</li>
              <li>• NEXT_PUBLIC_DEV_ADMIN_DELETE === &apos;true&apos;</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Download helper function
  const download = (name: string, data: any) => {
    const a = document.createElement("a");
    a.href =
      "data:application/json," +
      encodeURIComponent(JSON.stringify(data, null, 2));
    a.download = name;
    a.click();
  };

  // Auth probe
  const runAuthProbe = async () => {
    try {
      const response = await fetch("/api/dev/route-auth-check", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = await response.json();
      setAuthProbe(data);
    } catch (error) {
      console.error("Auth probe error:", error);
      setAuthProbe({ ok: false, email: null, err: String(error) });
    }
  };

  // Dry-run
  const runDryRun = async (admin: AdminUser) => {
    if (!admin) return;

    setActionLoading(`dry-run-${admin.id}`);
    try {
      const response = await fetch(
        `/api/admin/management/admins/${admin.id}?dry_run=1`,
        {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        },
      );

      const body = await response.json().catch(() => ({}));
      const result = { status: response.status, body };

      setConsoleApi((prev) => ({ ...prev, dry_run: result }));
      setUiFirstAttempt((prev) => ({ ...prev, dry_run: result }));

      console.log("Dry-run result:", result);
    } catch (error) {
      console.error("Dry-run error:", error);
      const result = { status: 500, body: { error: String(error) } };
      setConsoleApi((prev) => ({ ...prev, dry_run: result }));
      setUiFirstAttempt((prev) => ({ ...prev, dry_run: result }));
    } finally {
      setActionLoading(null);
    }
  };

  // Execute delete
  const runDelete = async (admin: AdminUser) => {
    if (!admin) return;

    setActionLoading(`delete-${admin.id}`);
    try {
      const response = await fetch(`/api/admin/management/admins/${admin.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });

      const body = await response.json().catch(() => ({}));
      const result = { status: response.status, body };

      setConsoleApi((prev) => ({ ...prev, execute: result }));
      setUiFirstAttempt((prev) => ({ ...prev, delete: result }));

      console.log("Delete result:", result);

      // Refresh admin list after successful delete
      if (response.ok) {
        await fetchAdmins();
      }
    } catch (error) {
      console.error("Delete error:", error);
      const result = { status: 500, body: { error: String(error) } };
      setConsoleApi((prev) => ({ ...prev, execute: result }));
      setUiFirstAttempt((prev) => ({ ...prev, delete: result }));
    } finally {
      setActionLoading(null);
    }
  };

  // Download all artifacts
  const downloadArtifacts = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const basePath = `artifacts/admin-delete/${timestamp}`;

    if (authProbe) {
      download(`${basePath}/auth-probe.json`, authProbe);
    }

    if (consoleApi.dry_run || consoleApi.execute) {
      download(`${basePath}/console-api.json`, consoleApi);
    }

    if (uiFirstAttempt.dry_run || uiFirstAttempt.delete) {
      download(`${basePath}/ui-first-attempt.json`, uiFirstAttempt);
    }
  };

  const getStatusIcon = (status: number) => {
    if (status >= 200 && status < 300)
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status >= 400 && status < 500)
      return <XCircle className="h-4 w-4 text-red-500" />;
    if (status >= 500)
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    return <AlertCircle className="h-4 w-4 text-gray-500" />;
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300)
      return "text-green-600 bg-green-50 dark:bg-green-900/20";
    if (status >= 400 && status < 500)
      return "text-red-600 bg-red-50 dark:bg-red-900/20";
    if (status >= 500)
      return "text-orange-600 bg-orange-50 dark:bg-orange-900/20";
    return "text-gray-600 bg-gray-50 dark:bg-gray-900/20";
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20">
              <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Admin Delete Tester (Dev Only)
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                One-click evidence capture for admin delete operations
              </p>
            </div>
          </div>

          {/* Auth Probe */}
          <div className="mb-4">
            <button
              onClick={runAuthProbe}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Eye className="h-4 w-4 mr-2" />
              Run Auth Probe
            </button>
            {authProbe && (
              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  {authProbe.ok ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="font-medium">Auth Probe Result</span>
                </div>
                <pre className="text-xs bg-white dark:bg-gray-800 p-2 rounded border overflow-x-auto">
                  {JSON.stringify(authProbe, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Cookies Display */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Request Cookies
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <code className="text-xs text-gray-600 dark:text-gray-400 break-all">
                {cookies || "No cookies found"}
              </code>
            </div>
          </div>
        </div>

        {/* Search and Admin List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Search by email..."
                />
              </div>
            </div>
            <button
              onClick={downloadArtifacts}
              disabled={
                !authProbe && !consoleApi.dry_run && !consoleApi.execute
              }
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Artifacts
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-600 dark:text-gray-400">
                Loading admins...
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {admins.map((admin) => {
                    const isDisabled =
                      admin.role === "super_admin" ||
                      admin.id === currentUser?.id;
                    const disabledReason =
                      admin.role === "super_admin"
                        ? "Cannot delete super_admin"
                        : admin.id === currentUser?.id
                          ? "Cannot delete self"
                          : "";

                    return (
                      <tr
                        key={admin.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {admin.email}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              ID: {admin.id.slice(0, 8)}...
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              admin.role === "super_admin"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200"
                            }`}
                          >
                            {admin.role === "super_admin"
                              ? "Super Admin"
                              : "Admin"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              admin.is_active
                                ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200"
                                : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200"
                            }`}
                          >
                            {admin.is_active ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {new Date(admin.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => runDryRun(admin)}
                              disabled={
                                isDisabled ||
                                actionLoading === `dry-run-${admin.id}`
                              }
                              title={
                                disabledReason ||
                                "Run dry-run to see delete plan"
                              }
                              className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md transition-colors ${
                                isDisabled ||
                                actionLoading === `dry-run-${admin.id}`
                                  ? "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400"
                                  : "text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
                              }`}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Dry-run
                            </button>
                            <button
                              onClick={() => runDelete(admin)}
                              disabled={
                                isDisabled ||
                                actionLoading === `delete-${admin.id}`
                              }
                              title={disabledReason || "Delete this admin"}
                              className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md transition-colors ${
                                isDisabled ||
                                actionLoading === `delete-${admin.id}`
                                  ? "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400"
                                  : "text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
                              }`}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Results Display */}
        {(consoleApi.dry_run ||
          consoleApi.execute ||
          uiFirstAttempt.dry_run ||
          uiFirstAttempt.delete) && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Operation Results
            </h3>

            {/* Console API Results */}
            {(consoleApi.dry_run || consoleApi.execute) && (
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Console API Results
                </h4>
                <div className="space-y-3">
                  {consoleApi.dry_run && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusIcon(consoleApi.dry_run.status)}
                        <span className="font-medium">Dry-run</span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(consoleApi.dry_run.status)}`}
                        >
                          {consoleApi.dry_run.status}
                        </span>
                      </div>
                      <pre className="text-xs bg-white dark:bg-gray-800 p-2 rounded border overflow-x-auto">
                        {JSON.stringify(consoleApi.dry_run.body, null, 2)}
                      </pre>
                    </div>
                  )}

                  {consoleApi.execute && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusIcon(consoleApi.execute.status)}
                        <span className="font-medium">Execute</span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(consoleApi.execute.status)}`}
                        >
                          {consoleApi.execute.status}
                        </span>
                      </div>
                      <pre className="text-xs bg-white dark:bg-gray-800 p-2 rounded border overflow-x-auto">
                        {JSON.stringify(consoleApi.execute.body, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* UI First Attempt Results */}
            {(uiFirstAttempt.dry_run || uiFirstAttempt.delete) && (
              <div>
                <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">
                  UI First Attempt Results
                </h4>
                <div className="space-y-3">
                  {uiFirstAttempt.dry_run && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusIcon(uiFirstAttempt.dry_run.status)}
                        <span className="font-medium">UI Dry-run</span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(uiFirstAttempt.dry_run.status)}`}
                        >
                          {uiFirstAttempt.dry_run.status}
                        </span>
                      </div>
                      <pre className="text-xs bg-white dark:bg-gray-800 p-2 rounded border overflow-x-auto">
                        {JSON.stringify(uiFirstAttempt.dry_run.body, null, 2)}
                      </pre>
                    </div>
                  )}

                  {uiFirstAttempt.delete && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusIcon(uiFirstAttempt.delete.status)}
                        <span className="font-medium">UI Delete</span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(uiFirstAttempt.delete.status)}`}
                        >
                          {uiFirstAttempt.delete.status}
                        </span>
                      </div>
                      <pre className="text-xs bg-white dark:bg-gray-800 p-2 rounded border overflow-x-auto">
                        {JSON.stringify(uiFirstAttempt.delete.body, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
