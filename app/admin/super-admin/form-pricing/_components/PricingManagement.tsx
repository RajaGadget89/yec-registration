"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Settings, DollarSign } from "lucide-react";
import { FormType } from "../../../../types/form-system";
import PricingConfigEditor from "./PricingConfigEditor";
import { format } from "date-fns";

interface FormPricingStatus {
  form_key: string;
  form_name: string;
  has_pricing: boolean;
  pricing_type?: string;
  last_updated?: string;
}

interface PricingManagementProps {
  onEditPricing?: (form: FormType) => void;
}

export default function PricingManagement({
  onEditPricing,
}: PricingManagementProps) {
  const [forms, setForms] = useState<FormType[]>([]);
  const [pricingStatus, setPricingStatus] = useState<FormPricingStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showEditor, setShowEditor] = useState(false);
  const [editingForm, setEditingForm] = useState<FormType | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(10);

  const loadForms = useCallback(
    async (page: number = 1) => {
      try {
        setLoading(true);

        // Load form types with pagination
        const formParams = new URLSearchParams({
          page: page.toString(),
          limit: itemsPerPage.toString(),
          search: searchTerm,
          status: "all", // Get all forms for pricing management
        });

        const formResponse = await fetch(
          `/api/admin/cms/form-types?${formParams}`,
        );
        if (!formResponse.ok) {
          throw new Error("Failed to load forms");
        }
        const formData = await formResponse.json();
        setForms(formData.formTypes || []);
        setTotalPages(formData.totalPages || 1);
        setTotalItems(formData.total || 0);
        setCurrentPage(page);

        // Load pricing status
        const pricingResponse = await fetch(
          "/api/admin/super-admin/form-pricing/status",
        );
        if (pricingResponse.ok) {
          const pricingData = await pricingResponse.json();
          setPricingStatus(pricingData.pricingStatus || []);
        }
      } catch (error) {
        console.error("Error loading forms:", error);
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, itemsPerPage],
  );

  // Load forms on mount
  useEffect(() => {
    loadForms();
  }, [loadForms]);

  // Reload forms when search or filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadForms(1); // Reset to first page when searching/filtering
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter, loadForms]);

  const handleEditPricing = (form: FormType) => {
    setEditingForm(form);
    setShowEditor(true);
    if (onEditPricing) {
      onEditPricing(form);
    }
  };

  const handleEditorClose = (saved?: boolean) => {
    setShowEditor(false);
    setEditingForm(null);
    if (saved) {
      loadForms(); // Reload forms if something was saved
    }
  };

  const handlePageChange = (page: number) => {
    loadForms(page);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
  };

  const getPricingStatus = (formKey: string) => {
    return pricingStatus.find((status) => status.form_key === formKey);
  };

  const getStatusBadge = (hasPricing: boolean) => {
    return (
      <span
        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          hasPricing
            ? "bg-green-100 text-green-800"
            : "bg-yellow-100 text-yellow-800"
        }`}
      >
        {hasPricing ? "Configured" : "Not Configured"}
      </span>
    );
  };

  const getPricingTypeBadge = (pricingType?: string) => {
    if (!pricingType) return "—";

    const typeColors: { [key: string]: string } = {
      fixed: "bg-blue-100 text-blue-800",
      tiered: "bg-purple-100 text-purple-800",
      dynamic: "bg-orange-100 text-orange-800",
    };

    return (
      <span
        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          typeColors[pricingType] || "bg-gray-100 text-gray-800"
        }`}
      >
        {pricingType.charAt(0).toUpperCase() + pricingType.slice(1)}
      </span>
    );
  };

  if (showEditor && editingForm) {
    return (
      <PricingConfigEditor
        form={editingForm}
        onClose={handleEditorClose}
        onSave={handleEditorClose}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - no create button (pricing is per existing form) */}
      <div className="flex items-center justify-end"></div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search forms..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="configured">Configured</option>
              <option value="not_configured">Not Configured</option>
            </select>
          </div>
        </div>
      </div>

      {/* Forms Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading forms...</p>
            </div>
          </div>
        ) : forms.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <DollarSign className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No forms found
            </h3>
            <p className="text-sm text-gray-500">
              Create a form first in the Form Builder to configure pricing.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Form
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pricing Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {forms.map((form) => {
                  const status = getPricingStatus(form.form_key);
                  return (
                    <tr key={form.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                              <DollarSign className="w-5 h-5 text-green-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {form.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {form.form_key}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(status?.has_pricing || false)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPricingTypeBadge(status?.pricing_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <svg
                            className="w-4 h-4 mr-1 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            ></path>
                          </svg>
                          {status?.last_updated
                            ? format(
                                new Date(status.last_updated),
                                "dd/MM/yyyy",
                              )
                            : "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditPricing(form)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Configure Pricing"
                          >
                            <Settings className="w-5 h-5" />
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">
                    {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, totalItems)}
                  </span>{" "}
                  of <span className="font-medium">{totalItems}</span> results
                </p>
              </div>
              <div>
                <nav
                  className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                  aria-label="Pagination"
                >
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const startPage = Math.max(1, currentPage - 2);
                    const pageNum = startPage + i;
                    if (pageNum > totalPages) return null;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pageNum === currentPage
                            ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                            : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
