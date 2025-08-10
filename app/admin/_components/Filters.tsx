'use client';

import { useState } from 'react';
import { Search, Filter, Calendar, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface FiltersProps {
  provinces: string[];
  onFiltersChange: (filters: FilterState) => void;
}

export interface FilterState {
  status: string[];
  provinces: string[];
  search: string;
  dateFrom: string;
  dateTo: string;
}

export default function Filters({ provinces, onFiltersChange }: FiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [filters, setFilters] = useState<FilterState>({
    status: searchParams.get('status')?.split(',').filter(Boolean) || [],
    provinces: searchParams.get('provinces')?.split(',').filter(Boolean) || [],
    search: searchParams.get('search') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const statusOptions = [
    { value: 'pending', label: 'Pending', color: 'bg-gray-500' },
    { value: 'waiting_for_review', label: 'Waiting for Review', color: 'bg-yellow-500' },
    { value: 'approved', label: 'Approved', color: 'bg-green-500' },
    { value: 'rejected', label: 'Rejected', color: 'bg-red-500' },
  ];

  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    
    // Update URL
    const params = new URLSearchParams();
    if (updatedFilters.status.length > 0) {
      params.set('status', updatedFilters.status.join(','));
    }
    if (updatedFilters.provinces.length > 0) {
      params.set('provinces', updatedFilters.provinces.join(','));
    }
    if (updatedFilters.search) {
      params.set('search', updatedFilters.search);
    }
    if (updatedFilters.dateFrom) {
      params.set('dateFrom', updatedFilters.dateFrom);
    }
    if (updatedFilters.dateTo) {
      params.set('dateTo', updatedFilters.dateTo);
    }

    const newUrl = params.toString() ? `?${params.toString()}` : '/admin';
    router.push(newUrl, { scroll: false });

    onFiltersChange(updatedFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      status: [],
      provinces: [],
      search: '',
      dateFrom: '',
      dateTo: '',
    };
    setFilters(clearedFilters);
    router.push('/admin', { scroll: false });
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = filters.status.length > 0 || 
    filters.provinces.length > 0 || 
    filters.search || 
    filters.dateFrom || 
    filters.dateTo;

  return (
    <div className="card-modern dark:card-modern-dark rounded-2xl p-6 mb-8 animate-fade-in-up backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border border-white/20 dark:border-gray-700/20 relative" style={{ animationDelay: '500ms' }}>
      {/* Light overlay for better readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 to-blue-100/10 rounded-2xl"></div>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-yec-primary/20 to-yec-accent/20 border border-yec-primary/30 backdrop-blur-sm">
            <Filter className="h-5 w-5 text-yec-primary" />
          </div>
          <h2 className="text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent drop-shadow-sm">
            Filters
          </h2>
        </div>
        
        <div className="flex items-center space-x-3">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-all duration-300 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl backdrop-blur-sm"
            >
              <X className="h-4 w-4" />
              Clear All
            </button>
          )}
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-yec-primary hover:text-yec-accent transition-all duration-300 hover:bg-yec-primary/10 rounded-xl backdrop-blur-sm"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Advanced filters
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6 z-10">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search by ID, name, email, or company..."
          value={filters.search}
          onChange={(e) => updateFilters({ search: e.target.value })}
          className="w-full pl-12 pr-4 py-3 bg-white/70 dark:bg-gray-700/70 border border-gray-200/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-yec-primary/50 focus:border-yec-primary/50 transition-all duration-300 backdrop-blur-sm drop-shadow-sm"
        />
      </div>

      {/* Advanced Filters */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6 animate-slide-in-right relative z-10">
          {/* Status Filter */}
          <div className="bg-white/50 dark:bg-gray-700/50 rounded-xl p-4 backdrop-blur-sm border border-white/20 dark:border-gray-600/20">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Status
            </label>
            <div className="space-y-2">
              {statusOptions.map((status) => (
                <label key={status.value} className="flex items-center space-x-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.status.includes(status.value)}
                    onChange={(e) => {
                      const newStatus = e.target.checked
                        ? [...filters.status, status.value]
                        : filters.status.filter(s => s !== status.value);
                      updateFilters({ status: newStatus });
                    }}
                    className="w-4 h-4 text-yec-primary bg-white border-gray-300 rounded focus:ring-yec-primary/50 focus:ring-2"
                  />
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${status.color}`}></div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
                      {status.label}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Province Filter */}
          <div className="bg-white/50 dark:bg-gray-700/50 rounded-xl p-4 backdrop-blur-sm border border-white/20 dark:border-gray-600/20">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Provinces
            </label>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
              {provinces.map((province) => (
                <label key={province} className="flex items-center space-x-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.provinces.includes(province)}
                    onChange={(e) => {
                      const newProvinces = e.target.checked
                        ? [...filters.provinces, province]
                        : filters.provinces.filter(p => p !== province);
                      updateFilters({ provinces: newProvinces });
                    }}
                    className="w-4 h-4 text-yec-primary bg-white border-gray-300 rounded focus:ring-yec-primary/50 focus:ring-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors capitalize">
                    {province.replace(/-/g, ' ')}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="bg-white/50 dark:bg-gray-700/50 rounded-xl p-4 backdrop-blur-sm border border-white/20 dark:border-gray-600/20">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Date Range
            </label>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">From</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => updateFilters({ dateFrom: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-white/70 dark:bg-gray-700/70 border border-gray-200/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-yec-primary/50 focus:border-yec-primary/50 transition-all duration-300 backdrop-blur-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">To</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => updateFilters({ dateTo: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-white/70 dark:bg-gray-700/70 border border-gray-200/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-yec-primary/50 focus:border-yec-primary/50 transition-all duration-300 backdrop-blur-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200/50 dark:border-gray-600/50 relative z-10">
          {filters.status.map((status) => (
            <span key={status} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100/80 text-blue-800 dark:bg-blue-900/80 dark:text-blue-200 backdrop-blur-sm">
              {statusOptions.find(s => s.value === status)?.label || status}
              <button
                onClick={() => updateFilters({ status: filters.status.filter(s => s !== status) })}
                className="ml-2 hover:bg-blue-200/80 dark:hover:bg-blue-800/80 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {filters.provinces.map((province) => (
            <span key={province} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100/80 text-green-800 dark:bg-green-900/80 dark:text-green-200 backdrop-blur-sm">
              {province.replace(/-/g, ' ')}
              <button
                onClick={() => updateFilters({ provinces: filters.provinces.filter(p => p !== province) })}
                className="ml-2 hover:bg-green-200/80 dark:hover:bg-green-800/80 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {filters.search && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100/80 text-yellow-800 dark:bg-yellow-900/80 dark:text-yellow-200 backdrop-blur-sm">
              Search: {filters.search}
              <button
                onClick={() => updateFilters({ search: '' })}
                className="ml-2 hover:bg-yellow-200/80 dark:hover:bg-yellow-800/80 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
