"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  Building2,
  Calendar,
  DollarSign,
  Download,
  Plus,
  Trash2,
} from "lucide-react";
import ImportData from "./ImportData";
import ParticipantsTable from "./ParticipantsTable";
import Filters from "./Filters";
import Pagination from "./Pagination";
import ExportModal from "./ExportModal";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import ParticipantDetailsDrawer from "./ParticipantDetailsDrawer";
import ParticipantForm from "./ParticipantForm";

type Participant = any;

interface SummaryStats {
  totalParticipants: number;
  totalHotels: number;
  totalEvents: number;
  paymentStatusBreakdown: {
    paid: number;
    unpaid: number;
    free: number;
  };
}

interface PaginationData {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface Filters {
  search: string;
  provinces: string[];
  hotels: string[];
  events: string[];
  paymentStatus: string[];
  dateFrom: string;
  dateTo: string;
}

export default function SeminarManagementClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State management
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    totalParticipants: 0,
    totalHotels: 0,
    totalEvents: 0,
    paymentStatusBreakdown: { paid: 0, unpaid: 0, free: 0 },
  });
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [filters, setFilters] = useState<Filters>({
    search: "",
    provinces: [],
    hotels: [],
    events: [],
    paymentStatus: [],
    dateFrom: "",
    dateTo: "",
  });
  const [loading, setLoading] = useState(true);
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>(
    [],
  );

  // Modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [showParticipantForm, setShowParticipantForm] = useState(false);
  const [selectedParticipant, setSelectedParticipant] =
    useState<Participant | null>(null);

  // Load data on component mount and when filters change
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.provinces.length > 0 && {
          provinces: filters.provinces.join(","),
        }),
        ...(filters.hotels.length > 0 && { hotels: filters.hotels.join(",") }),
        ...(filters.events.length > 0 && { events: filters.events.join(",") }),
        ...(filters.paymentStatus.length > 0 && {
          paymentStatus: filters.paymentStatus.join(","),
        }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
      });

      const response = await fetch(
        `/api/admin/seminar-management/participants?${params}`,
      );

      if (response.ok) {
        const data = await response.json();
        setParticipants(data.participants || []);
        setPagination((prev) => data.pagination || prev);
      } else {
        console.error("Failed to load participants");
      }

      // Load summary stats
      await loadSummaryStats();
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Parse URL parameters on mount
  useEffect(() => {
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const provinces =
      searchParams.get("provinces")?.split(",").filter(Boolean) || [];
    const hotels = searchParams.get("hotels")?.split(",").filter(Boolean) || [];
    const events = searchParams.get("events")?.split(",").filter(Boolean) || [];
    const paymentStatus =
      searchParams.get("paymentStatus")?.split(",").filter(Boolean) || [];
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";

    setPagination((prev) => ({ ...prev, page, limit }));
    setFilters({
      search,
      provinces,
      hotels,
      events,
      paymentStatus,
      dateFrom,
      dateTo,
    });
  }, [searchParams]);

  const loadSummaryStats = async () => {
    try {
      // This would typically be a separate API endpoint for summary stats
      // For now, we'll calculate from the participants data
      const response = await fetch(
        "/api/admin/seminar-management/participants?limit=1000",
      );
      if (response.ok) {
        const data = await response.json();
        const participants = data.participants || [];

        const stats: SummaryStats = {
          totalParticipants: participants.length,
          totalHotels: new Set(
            participants.map((p: Participant) => p.hotel).filter(Boolean),
          ).size,
          totalEvents: 9, // Fixed number from database spec
          paymentStatusBreakdown: {
            paid: participants.filter(
              (p: Participant) => p.payment_status === "ชำระแล้ว",
            ).length,
            unpaid: participants.filter(
              (p: Participant) => p.payment_status === "ยังไม่ได้ชำระเงิน",
            ).length,
            free: participants.filter(
              (p: Participant) => p.payment_status === "ฟรี",
            ).length,
          },
        };

        setSummaryStats(stats);
      }
    } catch (error) {
      console.error("Error loading summary stats:", error);
    }
  };

  const updateURL = (
    newFilters: Partial<Filters>,
    newPagination?: Partial<PaginationData>,
  ) => {
    const params = new URLSearchParams();

    const updatedFilters = { ...filters, ...newFilters };
    const updatedPagination = { ...pagination, ...newPagination };

    if (updatedPagination.page > 1)
      params.set("page", updatedPagination.page.toString());
    if (updatedPagination.limit !== 20)
      params.set("limit", updatedPagination.limit.toString());
    if (updatedFilters.search) params.set("search", updatedFilters.search);
    if (updatedFilters.provinces.length > 0)
      params.set("provinces", updatedFilters.provinces.join(","));
    if (updatedFilters.hotels.length > 0)
      params.set("hotels", updatedFilters.hotels.join(","));
    if (updatedFilters.events.length > 0)
      params.set("events", updatedFilters.events.join(","));
    if (updatedFilters.paymentStatus.length > 0)
      params.set("paymentStatus", updatedFilters.paymentStatus.join(","));
    if (updatedFilters.dateFrom)
      params.set("dateFrom", updatedFilters.dateFrom);
    if (updatedFilters.dateTo) params.set("dateTo", updatedFilters.dateTo);

    const newURL = params.toString() ? `?${params.toString()}` : "";
    router.push(`/admin/seminar-management${newURL}`, { scroll: false });
  };

  const handleFiltersChange = (newFilters: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPagination((prev) => ({ ...prev, page: 1 }));
    updateURL(newFilters, { page: 1 });
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
    updateURL({}, { page });
  };

  const handlePageSizeChange = (limit: number) => {
    setPagination((prev) => ({ ...prev, limit, page: 1 }));
    updateURL({}, { limit, page: 1 });
  };

  const handleParticipantSelect = (participant: Participant) => {
    setSelectedParticipant(participant);
    setShowDetailsDrawer(true);
  };

  const handleCreateParticipant = () => {
    setSelectedParticipant(null);
    setShowParticipantForm(true);
  };

  const handleEditParticipant = (participant: Participant) => {
    setSelectedParticipant(participant);
    setShowParticipantForm(true);
  };

  const handleDeleteParticipant = (participant: Participant) => {
    setSelectedParticipant(participant);
    setShowDeleteModal(true);
  };

  const handleBatchDelete = () => {
    if (selectedParticipants.length > 0) {
      setShowDeleteModal(true);
    }
  };

  const handleImportSuccess = () => {
    loadData(); // Reload data after successful import
  };

  const handleDeleteSuccess = () => {
    setShowDeleteModal(false);
    setSelectedParticipant(null);
    setSelectedParticipants([]);
    loadData(); // Reload data after successful delete
  };

  const handleExport = () => {
    setShowExportModal(true);
  };

  const executeDeleteParticipant = async () => {
    try {
      const participantsToDelete = selectedParticipant
        ? [selectedParticipant]
        : participants.filter((p) => selectedParticipants.includes(p.id));

      const response = await fetch(
        "/api/admin/seminar-management/participants/batch-delete",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participantIds: participantsToDelete.map((p) => p.id),
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete participants");
      }

      handleDeleteSuccess();
    } catch (error) {
      console.error("Error deleting participants:", error);
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Participants
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {summaryStats.totalParticipants.toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/20">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Hotels
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {summaryStats.totalHotels}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/20">
              <Building2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Events
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {summaryStats.totalEvents}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/20">
              <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Payment Status
              </p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-green-600 dark:text-green-400">
                    Paid: {summaryStats.paymentStatusBreakdown.paid}
                  </span>
                  <span className="text-red-600 dark:text-red-400">
                    Unpaid: {summaryStats.paymentStatusBreakdown.unpaid}
                  </span>
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  Free: {summaryStats.paymentStatusBreakdown.free}
                </div>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-yellow-100 dark:bg-yellow-900/20">
              <DollarSign className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <button
              onClick={handleCreateParticipant}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Participant
            </button>

            {selectedParticipants.length > 0 && (
              <button
                onClick={handleBatchDelete}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected ({selectedParticipants.length})
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Filters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        provinces={[]}
        hotels={[]}
        events={[]}
        loading={loading}
      />

      {/* Participants Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        <ParticipantsTable
          participants={participants}
          loading={loading}
          selectedParticipants={selectedParticipants}
          onParticipantSelect={setSelectedParticipants}
          onParticipantClick={handleParticipantSelect}
          onEditParticipant={handleEditParticipant}
          onDeleteParticipant={handleDeleteParticipant}
        />
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalCount}
          itemsPerPage={pagination.limit}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handlePageSizeChange}
          loading={loading}
        />
      )}

      {/* Import Section */}
      <ImportData
        onImportComplete={handleImportSuccess}
        onRefreshData={loadData}
      />

      {/* Modals */}
      {showExportModal && (
        <ExportModal
          filters={filters}
          selectedParticipantIds={selectedParticipants}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {showDeleteModal && (
        <DeleteConfirmationModal
          participants={
            selectedParticipant
              ? [selectedParticipant]
              : participants.filter((p) => selectedParticipants.includes(p.id))
          }
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedParticipant(null);
            setSelectedParticipants([]);
          }}
          onConfirm={executeDeleteParticipant}
        />
      )}

      {showDetailsDrawer && selectedParticipant && (
        <ParticipantDetailsDrawer
          participant={selectedParticipant}
          onClose={() => {
            setShowDetailsDrawer(false);
            setSelectedParticipant(null);
          }}
          onEdit={() => {
            setShowDetailsDrawer(false);
            handleEditParticipant(selectedParticipant);
          }}
          onDelete={() => {
            setShowDetailsDrawer(false);
            handleDeleteParticipant(selectedParticipant);
          }}
        />
      )}

      {showParticipantForm && (
        <ParticipantForm
          participant={selectedParticipant}
          onClose={() => {
            setShowParticipantForm(false);
            setSelectedParticipant(null);
          }}
          onSuccess={() => {
            setShowParticipantForm(false);
            setSelectedParticipant(null);
            loadData();
          }}
        />
      )}

      {/* TODO: Implement remaining modals */}
    </div>
  );
}
