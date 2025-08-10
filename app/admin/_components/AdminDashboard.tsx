'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download, Activity } from 'lucide-react';
import SummaryCards from './SummaryCards';
import Filters, { FilterState } from './Filters';
import ResultsTable from './ResultsTable';
import DetailsDrawer from './DetailsDrawer';
import type { Registration } from '../../types/database';

interface AdminDashboardProps {
  initialRegistrations: Registration[];
  initialTotalCount: number;
  initialStatusCounts: {
    total: number;
    pending: number;
    waiting_for_review: number;
    approved: number;
    rejected: number;
  };
  initialProvinces: string[];
}

export default function AdminDashboard({
  initialRegistrations,
  initialTotalCount,
  initialStatusCounts,
  initialProvinces,
}: AdminDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Use state to store the data, but update it when props change
  const [registrations, setRegistrations] = useState(initialRegistrations);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [statusCounts, setStatusCounts] = useState(initialStatusCounts);
  const [provinces] = useState(initialProvinces);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Update state when props change
  useEffect(() => {
    setRegistrations(initialRegistrations);
    setTotalCount(initialTotalCount);
    setStatusCounts(initialStatusCounts);
  }, [initialRegistrations, initialTotalCount, initialStatusCounts]);

  // Parse current URL params
  const currentPage = parseInt(searchParams.get('page') || '1');
  const pageSize = 20;
  const sortColumn = searchParams.get('sortColumn') || 'created_at';
  const sortDirection = (searchParams.get('sortDirection') as 'asc' | 'desc') || 'desc';

  const currentFilters: FilterState = {
    status: searchParams.get('status')?.split(',').filter(Boolean) || [],
    provinces: searchParams.get('provinces')?.split(',').filter(Boolean) || [],
    search: searchParams.get('search') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
  };

  const updateURL = (newParams: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });

    const newUrl = params.toString() ? `?${params.toString()}` : '/admin';
    router.push(newUrl, { scroll: false });
  };

  const handlePageChange = (page: number) => {
    updateURL({ page });
  };

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    updateURL({ sortColumn: column, sortDirection: direction });
  };

  const handleFiltersChange = (filters: FilterState) => {
    const params: Record<string, string> = {};
    
    if (filters.status.length > 0) {
      params.status = filters.status.join(',');
    }
    if (filters.provinces.length > 0) {
      params.provinces = filters.provinces.join(',');
    }
    if (filters.search) {
      params.search = filters.search;
    }
    if (filters.dateFrom) {
      params.dateFrom = filters.dateFrom;
    }
    if (filters.dateTo) {
      params.dateTo = filters.dateTo;
    }

    updateURL({ ...params, page: 1 }); // Reset to page 1 when filters change
  };

  const handleRowClick = (registration: Registration) => {
    setSelectedRegistration(registration);
    setIsDrawerOpen(true);
  };

  const handleActionComplete = useCallback((registrationId: string, newStatus: string) => {
    // Update the registration in the local state
    setRegistrations(prev => prev.map(reg => 
      reg.registration_id === registrationId 
        ? { ...reg, status: newStatus }
        : reg
    ));

    // Update status counts
    setStatusCounts(prev => {
      const newCounts = { ...prev };
      
      // Decrease the count for the old status
      if (registrations.find(r => r.registration_id === registrationId)?.status === 'pending') {
        newCounts.pending = Math.max(0, newCounts.pending - 1);
      } else if (registrations.find(r => r.registration_id === registrationId)?.status === 'waiting_for_review') {
        newCounts.waiting_for_review = Math.max(0, newCounts.waiting_for_review - 1);
      } else if (registrations.find(r => r.registration_id === registrationId)?.status === 'approved') {
        newCounts.approved = Math.max(0, newCounts.approved - 1);
      } else if (registrations.find(r => r.registration_id === registrationId)?.status === 'rejected') {
        newCounts.rejected = Math.max(0, newCounts.rejected - 1);
      }

      // Increase the count for the new status
      if (newStatus === 'pending') {
        newCounts.pending += 1;
      } else if (newStatus === 'waiting_for_review') {
        newCounts.waiting_for_review += 1;
      } else if (newStatus === 'approved') {
        newCounts.approved += 1;
      } else if (newStatus === 'rejected') {
        newCounts.rejected += 1;
      }

      return newCounts;
    });
  }, [registrations]);

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      
      if (currentFilters.status.length > 0) {
        params.set('status', currentFilters.status.join(','));
      }
      if (currentFilters.provinces.length > 0) {
        params.set('provinces', currentFilters.provinces.join(','));
      }
      if (currentFilters.search) {
        params.set('search', currentFilters.search);
      }
      if (currentFilters.dateFrom) {
        params.set('dateFrom', currentFilters.dateFrom);
      }
      if (currentFilters.dateTo) {
        params.set('dateTo', currentFilters.dateTo);
      }

      const response = await fetch(`/api/admin/export-csv?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to export CSV');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `registrations-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV. Please try again.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up relative">
      {/* Light overlay for content readability */}
      <div className="absolute inset-0 bg-white/3 rounded-3xl"></div>
      
      {/* Welcome Section */}
      <div className="text-center space-y-4 relative z-10">
        <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100/80 to-blue-200/80 border border-blue-300/50 backdrop-blur-sm shadow-lg">
          <Activity className="h-4 w-4 text-yec-primary animate-pulse-soft" />
          <span className="text-sm font-medium text-yec-primary font-semibold">Live Dashboard</span>
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-100 to-gray-200 bg-clip-text text-transparent drop-shadow-lg">
          Registration Management
        </h1>
        <p className="text-gray-100 max-w-2xl mx-auto font-medium drop-shadow-lg">
          Monitor and manage all YEC Day registrations with real-time updates and advanced filtering capabilities.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="relative z-10">
        <SummaryCards
          totalRegistrations={statusCounts.total}
          pendingCount={statusCounts.pending}
          waitingForReviewCount={statusCounts.waiting_for_review}
          approvedCount={statusCounts.approved}
          rejectedCount={statusCounts.rejected}
          filteredTotal={totalCount}
        />
      </div>

      {/* Filters */}
      <div className="relative z-10">
        <Filters
          provinces={provinces}
          onFiltersChange={handleFiltersChange}
        />
      </div>

      {/* Export Button */}
      <div className="flex justify-end relative z-10">
        <button
          onClick={handleExportCSV}
          className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-yec-primary to-yec-accent text-white rounded-xl hover:from-yec-accent hover:to-yec-primary transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl backdrop-blur-sm"
        >
          <Download className="h-4 w-4 group-hover:animate-bounce" />
          <span className="font-semibold">Export CSV</span>
        </button>
      </div>

      {/* Results Table */}
      <div className="relative z-10">
        <ResultsTable
          registrations={registrations}
          totalCount={totalCount}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onSort={handleSort}
          currentSort={{ column: sortColumn, direction: sortDirection }}
          onRowClick={handleRowClick}
          onActionComplete={handleActionComplete}
        />
      </div>

      {/* Details Drawer */}
      <DetailsDrawer
        registration={selectedRegistration}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedRegistration(null);
        }}
      />
    </div>
  );
}
