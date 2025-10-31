"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Eye, Edit, Trash2, Users } from "lucide-react";
// Custom checkbox component for table use
interface TableCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

function TableCheckbox({
  checked,
  indeterminate,
  onChange,
  className = "",
}: TableCheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = indeterminate || false;
      }}
      onChange={(e) => onChange(e.target.checked)}
      className={`h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded ${className}`}
    />
  );
}

interface Participant {
  id: number;
  checker_reference_id: string;
  participant_number: string | null;
  prefix: string | null;
  full_name: string;
  position: string | null;
  participant_position: string | null;
  province: string | null;
  region: string | null;
  gender: string | null;
  email: string | null;
  mobile_phone: string | null;
  attendance_status: string | null;
  custom_fields: any | null;
  hotel: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  payment_status: string | null;
  total_fee: number | null;
  created_at: string;
  updated_at: string;
}

interface ParticipantsTableProps {
  participants: Participant[];
  loading: boolean;
  selectedParticipants: number[];
  onParticipantSelect: (ids: number[]) => void;
  onParticipantClick: (participant: Participant) => void;
  onEditParticipant: (participant: Participant) => void;
  onDeleteParticipant: (participant: Participant) => void;
}

type SortColumn =
  | "checker_reference_id"
  | "full_name"
  | "province"
  | "mobile_phone"
  | "position"
  | "created_at";
type SortDirection = "asc" | "desc";

export default function ParticipantsTable({
  participants,
  loading,
  selectedParticipants,
  onParticipantSelect,
  onParticipantClick,
  onEditParticipant,
  onDeleteParticipant,
}: ParticipantsTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onParticipantSelect(participants.map((p) => p.id));
    } else {
      onParticipantSelect([]);
    }
  };

  const handleSelectParticipant = (participantId: number, checked: boolean) => {
    if (checked) {
      onParticipantSelect([...selectedParticipants, participantId]);
    } else {
      onParticipantSelect(
        selectedParticipants.filter((id) => id !== participantId),
      );
    }
  };

  const isAllSelected =
    participants.length > 0 &&
    selectedParticipants.length === participants.length;
  const isIndeterminate =
    selectedParticipants.length > 0 &&
    selectedParticipants.length < participants.length;

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPaymentStatusBadge = (status: string | null) => {
    if (!status) return <span className="text-gray-500">-</span>;

    const statusMap: Record<string, { color: string; text: string }> = {
      ชำระแล้ว: {
        color:
          "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
        text: "Paid",
      },
      ยังไม่ได้ชำระเงิน: {
        color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
        text: "Unpaid",
      },
      ฟรี: {
        color:
          "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
        text: "Free",
      },
    };

    const statusInfo = statusMap[status] || {
      color: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
      text: status,
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}
      >
        {statusInfo.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {/* Header skeleton */}
          <div className="flex items-center space-x-4">
            <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>

          {/* Rows skeleton */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800/50">
          <tr>
            <th className="px-6 py-3 text-left">
              <TableCheckbox
                checked={isAllSelected}
                indeterminate={isIndeterminate}
                onChange={(checked) => handleSelectAll(checked)}
                className="h-4 w-4"
              />
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
              onClick={() => handleSort("checker_reference_id")}
            >
              <div className="flex items-center gap-1">
                Checker ID
                {getSortIcon("checker_reference_id")}
              </div>
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
              onClick={() => handleSort("full_name")}
            >
              <div className="flex items-center gap-1">
                Full Name
                {getSortIcon("full_name")}
              </div>
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
              onClick={() => handleSort("province")}
            >
              <div className="flex items-center gap-1">
                Province
                {getSortIcon("province")}
              </div>
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
              onClick={() => handleSort("mobile_phone")}
            >
              <div className="flex items-center gap-1">
                Phone
                {getSortIcon("mobile_phone")}
              </div>
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
              onClick={() => handleSort("position")}
            >
              <div className="flex items-center gap-1">
                Position
                {getSortIcon("position")}
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Payment Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {participants.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
              >
                <div className="flex flex-col items-center">
                  <Users className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-lg font-medium">No participants found</p>
                  <p className="text-sm">
                    Try adjusting your filters or import some data
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            participants.map((participant) => {
              const isReservedSeat =
                participant.custom_fields?.is_reserved_seat ||
                participant.full_name?.startsWith("Reserved Seat");

              return (
                <tr
                  key={participant.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
                    hoveredRow === participant.id
                      ? "bg-gray-50 dark:bg-gray-700/50"
                      : ""
                  } ${isReservedSeat ? "bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400" : ""}`}
                  onMouseEnter={() => setHoveredRow(participant.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onClick={() => onParticipantClick(participant)}
                >
                  <td
                    className="px-6 py-4 whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <TableCheckbox
                      checked={selectedParticipants.includes(participant.id)}
                      onChange={(checked) =>
                        handleSelectParticipant(participant.id, checked)
                      }
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {participant.checker_reference_id}
                    </div>
                    {participant.participant_number && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {participant.participant_number}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className={`text-sm font-medium ${isReservedSeat ? "text-yellow-700 dark:text-yellow-300" : "text-gray-900 dark:text-white"}`}
                    >
                      {participant.prefix && `${participant.prefix} `}
                      {participant.full_name}
                      {isReservedSeat && (
                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          Reserved
                        </span>
                      )}
                    </div>
                    {participant.email && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {participant.email}
                      </div>
                    )}
                    {isReservedSeat &&
                      participant.custom_fields?.original_organization && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {participant.custom_fields.original_organization}
                        </div>
                      )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {participant.province || "-"}
                    </div>
                    {participant.region && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {participant.region}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {participant.mobile_phone || "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {participant.position || "-"}
                    </div>
                    {participant.participant_position &&
                      participant.participant_position !==
                        participant.position && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {participant.participant_position}
                        </div>
                      )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getPaymentStatusBadge(participant.payment_status)}
                    {participant.total_fee && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {formatCurrency(participant.total_fee)}
                      </div>
                    )}
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onParticipantClick(participant)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onEditParticipant(participant)}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDeleteParticipant(participant)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
