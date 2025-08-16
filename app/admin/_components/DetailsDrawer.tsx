"use client";

import {
  X,
  ExternalLink,
  Calendar,
  Globe,
  User,
  Phone,
  Mail,
  Building,
  MapPin,
} from "lucide-react";
import StatusBadge from "./StatusBadge";
import type { Registration } from "../../types/database";
import { formatDate } from "../../lib/datetime";

interface DetailsDrawerProps {
  registration: Registration | null;
  isOpen: boolean;
  onClose: () => void;
}

// lint-only typing; logic unchanged
type JsonData =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null;

export default function DetailsDrawer({
  registration,
  isOpen,
  onClose,
}: DetailsDrawerProps) {
  if (!registration) return null;

  const formatDateDisplay = (dateString: string) => {
    return formatDate(dateString, true);
  };

  const formatJson = (data: JsonData) => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const getFileUrl = (url: string | null) => {
    if (!url) return null;
    return url.startsWith("http") ? url : `https://${url}`;
  };

  // Map registration status to StatusBadge compatible status
  const getStatusBadgeStatus = (status: Registration["status"]) => {
    switch (status) {
      case "waiting_for_review":
        return "waiting_for_review" as const;
      case "approved":
        return "approved" as const;
      case "rejected":
        return "rejected" as const;
      default:
        return "pending" as const; // Default for other statuses
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-2xl bg-white dark:bg-gray-800 shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Registration Details
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {registration.registration_id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="h-full overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Status
              </span>
              <StatusBadge status={getStatusBadgeStatus(registration.status)} />
            </div>

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Full Name
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {registration.title} {registration.first_name}{" "}
                    {registration.last_name}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Nickname
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {registration.nickname || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    Email
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {registration.email}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    Phone
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {registration.phone}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Globe className="h-4 w-4" />
                    Line ID
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {registration.line_id}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Building className="h-4 w-4" />
                    Company
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {registration.company_name}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Business Type
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {registration.business_type}
                    {registration.business_type_other &&
                      ` - ${registration.business_type_other}`}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Province
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {registration.yec_province}
                  </p>
                </div>
              </div>
            </div>

            {/* Accommodation & Travel */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Accommodation & Travel
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Hotel Choice
                  </label>
                  <p className="text-gray-900 dark:text-gray-100 capitalize">
                    {registration.hotel_choice.replace("-", " ")}
                  </p>
                </div>
                {registration.room_type && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Room Type
                    </label>
                    <p className="text-gray-900 dark:text-gray-100 capitalize">
                      {registration.room_type.replace("-", " ")}
                    </p>
                  </div>
                )}
                {registration.external_hotel_name && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      External Hotel
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">
                      {registration.external_hotel_name}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Travel Type
                  </label>
                  <p className="text-gray-900 dark:text-gray-100 capitalize">
                    {registration.travel_type.replace("-", " ")}
                  </p>
                </div>
                {registration.roommate_info && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Roommate Info
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">
                      {registration.roommate_info}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Uploaded Files */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Uploaded Files
              </h3>
              <div className="space-y-2">
                {registration.profile_image_url && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Profile Image
                    </span>
                    <a
                      href={getFileUrl(registration.profile_image_url)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-yec-accent hover:text-yec-primary transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View
                    </a>
                  </div>
                )}
                {registration.chamber_card_url && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Chamber Card
                    </span>
                    <a
                      href={getFileUrl(registration.chamber_card_url)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-yec-accent hover:text-yec-primary transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View
                    </a>
                  </div>
                )}
                {registration.payment_slip_url && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Payment Slip
                    </span>
                    <a
                      href={getFileUrl(registration.payment_slip_url)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-yec-accent hover:text-yec-primary transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View
                    </a>
                  </div>
                )}
                {registration.badge_url && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Badge
                    </span>
                    <a
                      href={getFileUrl(registration.badge_url)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-yec-accent hover:text-yec-primary transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View
                    </a>
                  </div>
                )}
                {!registration.profile_image_url &&
                  !registration.chamber_card_url &&
                  !registration.payment_slip_url &&
                  !registration.badge_url && (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      No files uploaded
                    </p>
                  )}
              </div>
            </div>

            {/* Audit Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Audit Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Created At
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {formatDateDisplay(registration.created_at)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Updated At
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {formatDateDisplay(registration.updated_at)}
                  </p>
                </div>
                {registration.ip_address && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      IP Address
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">
                      {registration.ip_address}
                    </p>
                  </div>
                )}
                {registration.email_sent && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Email Sent
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">
                      {registration.email_sent ? "Yes" : "No"}
                      {registration.email_sent_at && (
                        <span className="block text-sm text-gray-500">
                          {formatDateDisplay(registration.email_sent_at)}
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Form Data */}
            {registration.form_data && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Form Data (JSON)
                </h3>
                <pre className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-sm text-gray-900 dark:text-gray-100 overflow-x-auto">
                  <code>{formatJson(registration.form_data)}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
