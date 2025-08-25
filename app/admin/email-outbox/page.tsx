"use client";

import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  RefreshCw,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Clock,
  Mail,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  Calendar,
  User,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface EmailOutboxItem {
  id: string;
  to: string;
  subject: string;
  status: "pending" | "sent" | "failed";
  created_at: string;
  updated_at: string;
  error_message?: string;
}

interface EmailOutboxResponse {
  ok: boolean;
  items: EmailOutboxItem[];
  total: number;
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

interface RetryResponse {
  ok: boolean;
  message: string;
  retried_count: number;
}

export default function EmailOutboxPage() {
  const [items, setItems] = useState<EmailOutboxItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [retryLoading, setRetryLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [currentStatus, setCurrentStatus] = useState<
    "pending" | "sent" | "failed"
  >("failed");
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [retrySuccess, setRetrySuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const limit = 20; // Reduced for better readability

  const fetchItems = async (status: string, offset: number) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        status,
        limit: limit.toString(),
        offset: offset.toString(),
      });

      const response = await fetch(`/api/admin/email-outbox?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch items: ${response.status}`);
      }

      const data: EmailOutboxResponse = await response.json();
      if (data.ok) {
        setItems(data.items);
        setTotal(data.total);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Failed to fetch email outbox items:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch items",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (selectedItems.size === 0) return;

    try {
      setRetryLoading(true);
      setRetryError(null);
      setRetrySuccess(null);

      const response = await fetch("/api/admin/email-outbox/retry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: Array.from(selectedItems),
          reason: "Manual retry from admin interface",
        }),
      });

      const data: RetryResponse = await response.json();

      if (data.ok) {
        setRetrySuccess(data.message);
        setSelectedItems(new Set());
        // Refresh the current view
        fetchItems(currentStatus, currentPage * limit);
      } else {
        setRetryError(data.message || "Failed to retry emails");
      }
    } catch (error) {
      console.error("Failed to retry emails:", error);
      setRetryError(
        error instanceof Error ? error.message : "Failed to retry emails",
      );
    } finally {
      setRetryLoading(false);
    }
  };

  const handleStatusChange = (status: "pending" | "sent" | "failed") => {
    setCurrentStatus(status);
    setCurrentPage(0);
    setSelectedItems(new Set());
    fetchItems(status, 0);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedItems(new Set());
    fetchItems(currentStatus, page * limit);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const failedItemIds = items
        .filter((item) => item.status === "failed")
        .map((item) => item.id);
      setSelectedItems(new Set(failedItemIds));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItems(newSelected);
  };

  useEffect(() => {
    fetchItems(currentStatus, 0);
  }, [currentStatus]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-5 w-5 text-amber-500" />;
      case "sent":
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case "failed":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Mail className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200">
            Pending
          </Badge>
        );
      case "sent":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200">
            Sent
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-200">
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "border-l-amber-500 bg-amber-50/50";
      case "sent":
        return "border-l-emerald-500 bg-emerald-50/50";
      case "failed":
        return "border-l-red-500 bg-red-50/50";
      default:
        return "border-l-gray-500 bg-gray-50/50";
    }
  };

  const failedItems = items.filter((item) => item.status === "failed");
  const allFailedSelected =
    failedItems.length > 0 &&
    failedItems.every((item) => selectedItems.has(item.id));

  const filteredItems = items.filter(
    (item) =>
      item.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.subject.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto py-8 px-4 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-700 shadow-sm">
                <Mail className="h-6 w-6 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  Email Outbox
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  Monitor and manage email delivery status with real-time
                  insights
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => fetchItems(currentStatus, currentPage * limit)}
              disabled={loading}
              variant="outline"
              className="shadow-sm hover:shadow-md transition-all duration-200"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <span className="text-red-700 font-medium">{error}</span>
            </div>
          </div>
        )}

        {retryError && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <span className="text-red-700 font-medium">{retryError}</span>
            </div>
          </div>
        )}

        {retrySuccess && (
          <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-lg shadow-sm">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
              <span className="text-emerald-700 font-medium">
                {retrySuccess}
              </span>
            </div>
          </div>
        )}

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-sm hover:shadow-md transition-all duration-200 border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                Total Emails
              </CardTitle>
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {total}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                All time emails
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-all duration-200 border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                Failed
              </CardTitle>
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                {items.filter((item) => item.status === "failed").length}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Requires attention
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-all duration-200 border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                Pending
              </CardTitle>
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {items.filter((item) => item.status === "pending").length}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                In queue
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-all duration-200 border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                Selected for Retry
              </CardTitle>
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <RotateCcw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {selectedItems.size}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Ready to retry
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Card */}
        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Email Management
              </CardTitle>

              {/* Search Bar */}
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search emails..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Enhanced Status Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => handleStatusChange("failed")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                    currentStatus === "failed"
                      ? "border-red-500 text-red-600 dark:text-red-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Failed (
                    {items.filter((item) => item.status === "failed").length})
                  </div>
                </button>
                <button
                  onClick={() => handleStatusChange("pending")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                    currentStatus === "pending"
                      ? "border-amber-500 text-amber-600 dark:text-amber-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pending (
                    {items.filter((item) => item.status === "pending").length})
                  </div>
                </button>
                <button
                  onClick={() => handleStatusChange("sent")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                    currentStatus === "sent"
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Sent (
                    {items.filter((item) => item.status === "sent").length})
                  </div>
                </button>
              </nav>
            </div>

            {/* Enhanced Bulk Actions */}
            {currentStatus === "failed" && failedItems.length > 0 && (
              <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-200 dark:border-blue-800">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={allFailedSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {selectedItems.size} of {failedItems.length} failed emails
                      selected
                    </span>
                  </div>
                  <Button
                    onClick={handleRetry}
                    disabled={selectedItems.size === 0 || retryLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    {retryLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RotateCcw className="h-4 w-4 mr-2" />
                    )}
                    Retry Selected ({selectedItems.size})
                  </Button>
                </div>
              </div>
            )}

            {/* Enhanced Email List */}
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 font-medium">
                      Loading emails...
                    </p>
                  </div>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No {currentStatus} emails found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchTerm
                      ? "Try adjusting your search terms"
                      : "All emails are processed successfully"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-6 rounded-xl border-l-4 ${getStatusColor(item.status)} hover:shadow-md transition-all duration-200`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Left Section */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start gap-3">
                            {currentStatus === "failed" && (
                              <input
                                type="checkbox"
                                checked={selectedItems.has(item.id)}
                                onChange={(e) =>
                                  handleSelectItem(item.id, e.target.checked)
                                }
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                {getStatusIcon(item.status)}
                                {getStatusBadge(item.status)}
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  ID: {item.id.slice(0, 8)}...
                                </span>
                              </div>

                              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
                                {item.subject}
                              </h3>

                              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                <div className="flex items-center gap-1">
                                  <User className="h-4 w-4" />
                                  <span className="font-mono">{item.to}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>
                                    {formatDistanceToNow(
                                      new Date(item.created_at),
                                      { addSuffix: true },
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right Section - Error Details */}
                        {currentStatus === "failed" && item.error_message && (
                          <div className="lg:w-80">
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-red-700 dark:text-red-300">
                                  <div className="font-medium mb-1">
                                    Error Details:
                                  </div>
                                  <div className="text-xs">
                                    {item.error_message}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Enhanced Pagination */}
              {total > limit && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {currentPage * limit + 1} to{" "}
                    {Math.min((currentPage + 1) * limit, total)} of {total}{" "}
                    emails
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 0}
                      className="flex items-center gap-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Page {currentPage + 1} of {Math.ceil(total / limit)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={(currentPage + 1) * limit >= total}
                      className="flex items-center gap-2"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
