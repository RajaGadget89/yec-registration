"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  User,
  Building,
  Calendar,
  Car,
  DollarSign,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

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
  telephone: string | null;
  fax: string | null;
  attendance_status: string | null;
  custom_fields: any;
  created_at: string;
  updated_at: string;
}

interface Accommodation {
  id: number;
  participant_id: number;
  hotel_id: number;
  check_in_date: string;
  check_out_date: string;
  room_type: string | null;
  hotel: {
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
  };
  daily_stays: Array<{
    id: number;
    accommodation_id: number;
    stay_date: string;
    is_staying: boolean;
  }>;
}

interface Event {
  id: number;
  name: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
}

interface EventParticipant {
  id: number;
  participant_id: number;
  event_id: number;
  event: Event;
}

interface Transportation {
  id: number;
  participant_id: number;
  direction: "outbound" | "return";
  transport_type: string | null;
  details: string | null;
  departure_time: string | null;
  arrival_time: string | null;
}

interface Finance {
  id: number;
  participant_id: number;
  activity_fee: number | null;
  accommodation_fee: number | null;
  dinner_fee: number | null;
  total_fee: number | null;
  payment_status: string | null;
  payment_date: string | null;
  payment_method: string | null;
  notes: string | null;
}

interface ParticipantDetailsDrawerProps {
  participant: Participant;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ParticipantDetailsDrawer({
  participant,
  onClose,
  onEdit,
  onDelete,
}: ParticipantDetailsDrawerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["personal"]),
  );

  // Related data
  const [accommodation, setAccommodation] = useState<Accommodation | null>(
    null,
  );
  const [events, setEvents] = useState<EventParticipant[]>([]);
  const [transportation, setTransportation] = useState<Transportation[]>([]);
  const [finance, setFinance] = useState<Finance | null>(null);

  const loadParticipantDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/admin/seminar-management/participants/${participant.id}`,
      );

      if (!response.ok) {
        throw new Error("Failed to load participant details");
      }

      const data = await response.json();

      setAccommodation(data.accommodation || null);
      setEvents(data.events || []);
      setTransportation(data.transportation || []);
      setFinance(data.finance || null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load participant details",
      );
    } finally {
      setLoading(false);
    }
  }, [participant.id]);

  useEffect(() => {
    loadParticipantDetails();
  }, [loadParticipantDetails]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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

    const statusMap: Record<
      string,
      { color: string; text: string; icon: React.ReactNode }
    > = {
      ชำระแล้ว: {
        color:
          "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
        text: "Paid",
        icon: <CheckCircle className="h-4 w-4" />,
      },
      ยังไม่ได้ชำระเงิน: {
        color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
        text: "Unpaid",
        icon: <XCircle className="h-4 w-4" />,
      },
      ฟรี: {
        color:
          "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
        text: "Free",
        icon: <CheckCircle className="h-4 w-4" />,
      },
    };

    const statusInfo = statusMap[status] || {
      color: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
      text: status,
      icon: <AlertCircle className="h-4 w-4" />,
    };

    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}
      >
        {statusInfo.icon}
        {statusInfo.text}
      </span>
    );
  };

  const SectionHeader = ({
    title,
    icon: Icon,
    section,
    count,
  }: {
    title: string;
    icon: React.ComponentType<any>;
    section: string;
    count?: number;
  }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          {count !== undefined && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {count} items
            </p>
          )}
        </div>
      </div>
      {expandedSections.has(section) ? (
        <ChevronUp className="h-5 w-5 text-gray-400" />
      ) : (
        <ChevronDown className="h-5 w-5 text-gray-400" />
      )}
    </button>
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-lg font-medium text-gray-900 dark:text-white">
              Loading participant details...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop with blur, align to admin drawer */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto z-50 border-l-2 border-blue-200 dark:border-blue-900/40">
        {/* Header: gradient bar like admin drawer */}
        <div className="h-20 bg-gradient-to-r from-[#2246d2] via-[#3457e6] to-[#4f80ff] text-white dark:text-white flex items-center justify-between px-6 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-xl shadow-sm">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-extrabold tracking-tight">
                Participant Details
              </h2>
              <span
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white shadow-sm ring-1 ring-white/20 backdrop-blur-sm text-sm font-semibold"
                title="Participant reference"
              >
                <span className="opacity-90">Ref</span>
                <span className="font-mono tracking-wider">
                  {participant.checker_reference_id}
                </span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white/15 hover:bg-white/25 text-white rounded-lg transition-colors"
              title="Edit Participant"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              title="Delete Participant"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <span className="text-sm text-red-800 dark:text-red-400">
                  {error}
                </span>
              </div>
            </div>
          )}

          {/* Personal Information */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <SectionHeader
              title="Personal Information"
              icon={User}
              section="personal"
            />
            {expandedSections.has("personal") && (
              <div className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Full Name
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {participant.prefix && `${participant.prefix} `}
                      {participant.full_name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Participant Number
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {participant.participant_number || "-"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Position
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {participant.position || "-"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Participant Position
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {participant.participant_position || "-"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Province
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {participant.province || "-"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Region
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {participant.region || "-"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Gender
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {participant.gender || "-"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Attendance Status
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {participant.attendance_status || "-"}
                    </p>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Contact Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Email:
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        {participant.email || "-"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Mobile:
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        {participant.mobile_phone || "-"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Telephone:
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        {participant.telephone || "-"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Fax:
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        {participant.fax || "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Accommodation */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <SectionHeader
              title="Accommodation"
              icon={Building}
              section="accommodation"
            />
            {expandedSections.has("accommodation") && (
              <div className="px-4 pb-4 space-y-3">
                {accommodation ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Hotel
                        </label>
                        <p className="text-gray-900 dark:text-white">
                          {accommodation.hotel.name}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Room Type
                        </label>
                        <p className="text-gray-900 dark:text-white">
                          {accommodation.room_type || "-"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Check In
                        </label>
                        <p className="text-gray-900 dark:text-white">
                          {formatDate(accommodation.check_in_date)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Check Out
                        </label>
                        <p className="text-gray-900 dark:text-white">
                          {formatDate(accommodation.check_out_date)}
                        </p>
                      </div>
                    </div>

                    {/* Daily Stays */}
                    {accommodation.daily_stays &&
                      accommodation.daily_stays.length > 0 && (
                        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Daily Stays
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {accommodation.daily_stays.map((stay) => (
                              <div
                                key={stay.id}
                                className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded"
                              >
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {formatDate(stay.stay_date)}
                                </span>
                                {stay.is_staying ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-gray-400" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">
                    No accommodation information available
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Events */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <SectionHeader
              title="Events"
              icon={Calendar}
              section="events"
              count={events.length}
            />
            {expandedSections.has("events") && (
              <div className="px-4 pb-4 space-y-3">
                {events.length > 0 ? (
                  <div className="space-y-2">
                    {events.map((eventParticipant) => (
                      <div
                        key={eventParticipant.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {eventParticipant.event.name}
                          </p>
                          {eventParticipant.event.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {eventParticipant.event.description}
                            </p>
                          )}
                          {eventParticipant.event.event_date && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(eventParticipant.event.event_date)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">
                    No events registered
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Transportation */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <SectionHeader
              title="Transportation"
              icon={Car}
              section="transportation"
              count={transportation.length}
            />
            {expandedSections.has("transportation") && (
              <div className="px-4 pb-4 space-y-3">
                {transportation.length > 0 ? (
                  <div className="space-y-3">
                    {transportation.map((transport) => (
                      <div
                        key={transport.id}
                        className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Car className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-gray-900 dark:text-white capitalize">
                            {transport.direction}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">
                              Type:
                            </span>
                            <span className="ml-2 text-gray-900 dark:text-white">
                              {transport.transport_type || "-"}
                            </span>
                          </div>
                          {transport.departure_time && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">
                                Departure:
                              </span>
                              <span className="ml-2 text-gray-900 dark:text-white">
                                {transport.departure_time}
                              </span>
                            </div>
                          )}
                          {transport.arrival_time && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">
                                Arrival:
                              </span>
                              <span className="ml-2 text-gray-900 dark:text-white">
                                {transport.arrival_time}
                              </span>
                            </div>
                          )}
                          {transport.details && (
                            <div className="md:col-span-2">
                              <span className="text-gray-500 dark:text-gray-400">
                                Details:
                              </span>
                              <span className="ml-2 text-gray-900 dark:text-white">
                                {transport.details}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">
                    No transportation information available
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Finances */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <SectionHeader
              title="Finances"
              icon={DollarSign}
              section="finances"
            />
            {expandedSections.has("finances") && (
              <div className="px-4 pb-4 space-y-3">
                {finance ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Activity Fee
                        </label>
                        <p className="text-gray-900 dark:text-white">
                          {formatCurrency(finance.activity_fee)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Accommodation Fee
                        </label>
                        <p className="text-gray-900 dark:text-white">
                          {formatCurrency(finance.accommodation_fee)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Dinner Fee
                        </label>
                        <p className="text-gray-900 dark:text-white">
                          {formatCurrency(finance.dinner_fee)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Total Fee
                        </label>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(finance.total_fee)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Payment Status
                        </label>
                        <div className="mt-1">
                          {getPaymentStatusBadge(finance.payment_status)}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Payment Date
                        </label>
                        <p className="text-gray-900 dark:text-white">
                          {formatDate(finance.payment_date)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Payment Method
                        </label>
                        <p className="text-gray-900 dark:text-white">
                          {finance.payment_method || "-"}
                        </p>
                      </div>
                    </div>
                    {finance.notes && (
                      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Notes
                        </label>
                        <p className="text-gray-900 dark:text-white mt-1">
                          {finance.notes}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">
                    No financial information available
                  </p>
                )}
              </div>
            )}
          </div>

          {/* System Information */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <SectionHeader
              title="System Information"
              icon={Clock}
              section="system"
            />
            {expandedSections.has("system") && (
              <div className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Created At
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {formatDate(participant.created_at)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Updated At
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {formatDate(participant.updated_at)}
                    </p>
                  </div>
                </div>
                {participant.custom_fields && (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Custom Fields
                    </label>
                    <pre className="text-sm text-gray-900 dark:text-white mt-1 bg-gray-50 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                      {JSON.stringify(participant.custom_fields, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Footer (sticky) */}
        <div className="sticky bottom-0 bg-gradient-to-b from-white to-[#f7f9ff] dark:from-gray-900 dark:to-gray-900 border-t-2 border-blue-200/60 dark:border-blue-900/40 p-4 shadow-lg">
          <div className="flex justify-end gap-3">
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
