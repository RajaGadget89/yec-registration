"use client";

import { useState } from "react";
import { format } from "date-fns";

interface CheckinRecord {
  id: string;
  checkin_time: string;
  location: string;
  notes: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  company_name: string;
  province: string;
  status: string;
  event_name: string;
  event_type: string;
  business_rule: string;
  checked_by: string;
}

interface AttendanceDataTableProps {
  checkins: CheckinRecord[];
  loading: boolean;
  onSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  currentSort: { sortBy: string; sortOrder: 'asc' | 'desc' };
}

export default function AttendanceDataTable({
  checkins,
  loading,
  onSort,
  currentSort
}: AttendanceDataTableProps) {
  const [selectedCheckin, setSelectedCheckin] = useState<CheckinRecord | null>(null);

  const formatDateTime = (dateTime: string) => {
    return format(new Date(dateTime), 'dd/MM/yyyy HH:mm');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      approved: { color: 'bg-green-100 text-green-800', label: 'Approved' },
      waiting_for_review: { color: 'bg-yellow-100 text-yellow-800', label: 'Waiting for Review' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'bg-gray-100 text-gray-800', label: status };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getBusinessRuleBadge = (businessRule: string) => {
    const ruleConfig = {
      ONE_TIME_ONLY: { color: 'bg-blue-100 text-blue-800', label: 'Badge Distribution' },
      MULTIPLE_ALLOWED: { color: 'bg-gray-100 text-gray-800', label: 'Multiple Allowed' }
    };
    
    const config = ruleConfig[businessRule as keyof typeof ruleConfig] || { color: 'bg-gray-100 text-gray-800', label: businessRule };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const handleSort = (column: string) => {
    const newSortOrder = currentSort.sortBy === column && currentSort.sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(column, newSortOrder);
  };

  const SortButton = ({ column, children }: { column: string; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(column)}
      className="flex items-center space-x-1 text-left font-medium text-gray-900 hover:text-gray-700"
    >
      <span>{children}</span>
      <span className="text-gray-400">
        {currentSort.sortBy === column ? (
          currentSort.sortOrder === 'asc' ? '↑' : '↓'
        ) : (
          '↕'
        )}
      </span>
    </button>
  );

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Attendance Records</h3>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Attendance Records</h3>
          <span className="text-sm text-gray-500">
            {checkins.length} record{checkins.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton column="checkin_time">Check-in Time</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton column="user_name">User</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton column="event_name">Event</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Business Rule
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Checked By
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {checkins.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  <div className="text-gray-400 text-4xl mb-2">📝</div>
                  <p>No attendance records found</p>
                  <p className="text-sm">Try adjusting your filters</p>
                </td>
              </tr>
            ) : (
              checkins.map((checkin) => (
                <tr
                  key={checkin.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedCheckin(checkin)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDateTime(checkin.checkin_time)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{checkin.user_name}</div>
                    <div className="text-sm text-gray-500">{checkin.user_email}</div>
                    <div className="text-xs text-gray-400">{checkin.company_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{checkin.event_name}</div>
                    <div className="text-sm text-gray-500">{checkin.event_type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {checkin.location || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(checkin.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getBusinessRuleBadge(checkin.business_rule)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {checkin.checked_by}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Checkin Detail Modal */}
      {selectedCheckin && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Check-in Details</h3>
                <button
                  onClick={() => setSelectedCheckin(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">User</label>
                  <p className="text-sm text-gray-900">{selectedCheckin.user_name}</p>
                  <p className="text-sm text-gray-500">{selectedCheckin.user_email}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Event</label>
                  <p className="text-sm text-gray-900">{selectedCheckin.event_name}</p>
                  <p className="text-sm text-gray-500">{selectedCheckin.event_type}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Check-in Time</label>
                  <p className="text-sm text-gray-900">{formatDateTime(selectedCheckin.checkin_time)}</p>
                </div>
                
                {selectedCheckin.location && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Location</label>
                    <p className="text-sm text-gray-900">{selectedCheckin.location}</p>
                  </div>
                )}
                
                {selectedCheckin.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Notes</label>
                    <p className="text-sm text-gray-900">{selectedCheckin.notes}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Checked By</label>
                  <p className="text-sm text-gray-900">{selectedCheckin.checked_by}</p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedCheckin(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
