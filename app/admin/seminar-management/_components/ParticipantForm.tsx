"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Save,
  User,
  Building,
  Calendar,
  Car,
  DollarSign,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface Participant {
  id?: number;
  checker_reference_id?: string;
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
}

interface Hotel {
  id: number;
  name: string;
}

interface Event {
  id: number;
  name: string;
}

interface ParticipantFormProps {
  participant?: Participant | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  // Basic Info
  participant_number: string;
  prefix: string;
  full_name: string;
  position: string;
  participant_position: string;
  province: string;
  region: string;
  gender: string;
  email: string;
  mobile_phone: string;
  telephone: string;
  fax: string;
  attendance_status: string;

  // Accommodation
  hotel_id: string;
  check_in_date: string;
  check_out_date: string;
  room_type: string;

  // Events
  selected_events: number[];

  // Transportation
  outbound_transport_type: string;
  outbound_details: string;
  outbound_departure_time: string;
  outbound_arrival_time: string;
  return_transport_type: string;
  return_details: string;
  return_departure_time: string;
  return_arrival_time: string;

  // Finances
  activity_fee: string;
  accommodation_fee: string;
  dinner_fee: string;
  payment_status: string;
  payment_date: string;
  payment_method: string;
  notes: string;
}

export default function ParticipantForm({
  participant,
  onClose,
  onSuccess,
}: ParticipantFormProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    participant_number: "",
    prefix: "",
    full_name: "",
    position: "",
    participant_position: "",
    province: "",
    region: "",
    gender: "",
    email: "",
    mobile_phone: "",
    telephone: "",
    fax: "",
    attendance_status: "",
    hotel_id: "",
    check_in_date: "",
    check_out_date: "",
    room_type: "",
    selected_events: [],
    outbound_transport_type: "",
    outbound_details: "",
    outbound_departure_time: "",
    outbound_arrival_time: "",
    return_transport_type: "",
    return_details: "",
    return_departure_time: "",
    return_arrival_time: "",
    activity_fee: "",
    accommodation_fee: "",
    dinner_fee: "",
    payment_status: "",
    payment_date: "",
    payment_method: "",
    notes: "",
  });

  const tabs = [
    { id: "basic", label: "Basic Info", icon: User },
    { id: "accommodation", label: "Accommodation", icon: Building },
    { id: "events", label: "Events", icon: Calendar },
    { id: "transportation", label: "Transportation", icon: Car },
    { id: "finances", label: "Finances", icon: DollarSign },
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  // Will be called after definition below to avoid temporal dead zone

  const loadInitialData = async () => {
    try {
      setLoading(true);

      const [hotelsResponse, eventsResponse] = await Promise.all([
        fetch("/api/admin/seminar-management/hotels"),
        fetch("/api/admin/seminar-management/events"),
      ]);

      if (hotelsResponse.ok) {
        const hotelsData = await hotelsResponse.json();
        setHotels(hotelsData.hotels || []);
      }

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        setEvents(eventsData.events || []);
      }
    } catch (_err) {
      setError("Failed to load form data");
    } finally {
      setLoading(false);
    }
  };

  const populateFormData = useCallback(() => {
    if (!participant) return;

    setFormData({
      participant_number: participant.participant_number || "",
      prefix: participant.prefix || "",
      full_name: participant.full_name || "",
      position: participant.position || "",
      participant_position: participant.participant_position || "",
      province: participant.province || "",
      region: participant.region || "",
      gender: participant.gender || "",
      email: participant.email || "",
      mobile_phone: participant.mobile_phone || "",
      telephone: participant.telephone || "",
      fax: participant.fax || "",
      attendance_status: participant.attendance_status || "",
      hotel_id: "",
      check_in_date: "",
      check_out_date: "",
      room_type: "",
      selected_events: [],
      outbound_transport_type: "",
      outbound_details: "",
      outbound_departure_time: "",
      outbound_arrival_time: "",
      return_transport_type: "",
      return_details: "",
      return_departure_time: "",
      return_arrival_time: "",
      activity_fee: "",
      accommodation_fee: "",
      dinner_fee: "",
      payment_status: "",
      payment_date: "",
      payment_method: "",
      notes: "",
    });
  }, [participant]);

  useEffect(() => {
    if (participant) {
      populateFormData();
    }
  }, [participant, populateFormData]);

  const handleInputChange = (
    field: keyof FormData,
    value: string | number[],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleEventToggle = (eventId: number) => {
    setFormData((prev) => ({
      ...prev,
      selected_events: prev.selected_events.includes(eventId)
        ? prev.selected_events.filter((id) => id !== eventId)
        : [...prev.selected_events, eventId],
    }));
    setHasChanges(true);
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!formData.full_name.trim()) {
      errors.push("Full name is required");
    }

    if (!formData.province.trim()) {
      errors.push("Province is required");
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push("Invalid email format");
    }

    if (formData.check_in_date && formData.check_out_date) {
      const checkIn = new Date(formData.check_in_date);
      const checkOut = new Date(formData.check_out_date);
      if (checkOut <= checkIn) {
        errors.push("Check-out date must be after check-in date");
      }
    }

    return errors;
  };

  const handleSave = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      setError(errors.join(", "));
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const url = participant?.id
        ? `/api/admin/seminar-management/participants/${participant.id}`
        : "/api/admin/seminar-management/participants";

      const method = participant?.id ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save participant");
      }

      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save participant",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to close?",
      );
      if (!confirmed) return;
    }
    onClose();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-lg font-medium text-gray-900 dark:text-white">
              Loading form data...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {participant ? "Edit Participant" : "Create New Participant"}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {participant
                  ? participant.checker_reference_id
                  : "Fill in the participant details"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <span className="text-sm text-red-800 dark:text-red-400">
                  {error}
                </span>
              </div>
            </div>
          )}

          {/* Basic Info Tab */}
          {activeTab === "basic" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Participant Number *
                  </label>
                  <input
                    type="text"
                    value={formData.participant_number}
                    onChange={(e) =>
                      handleInputChange("participant_number", e.target.value)
                    }
                    placeholder="e.g., 1.1, 1.2"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Prefix
                  </label>
                  <select
                    value={formData.prefix}
                    onChange={(e) =>
                      handleInputChange("prefix", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select prefix</option>
                    <option value="นาย">นาย</option>
                    <option value="นาง">นาง</option>
                    <option value="นางสาว">นางสาว</option>
                    <option value="ดร.">ดร.</option>
                    <option value="ศ.ดร.">ศ.ดร.</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) =>
                      handleInputChange("full_name", e.target.value)
                    }
                    placeholder="Enter full name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Position
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) =>
                      handleInputChange("position", e.target.value)
                    }
                    placeholder="Current position"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Participant Position
                  </label>
                  <input
                    type="text"
                    value={formData.participant_position}
                    onChange={(e) =>
                      handleInputChange("participant_position", e.target.value)
                    }
                    placeholder="Position in seminar"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Province *
                  </label>
                  <input
                    type="text"
                    value={formData.province}
                    onChange={(e) =>
                      handleInputChange("province", e.target.value)
                    }
                    placeholder="Province"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Region
                  </label>
                  <select
                    value={formData.region}
                    onChange={(e) =>
                      handleInputChange("region", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select region</option>
                    <option value="ภาคเหนือ">ภาคเหนือ</option>
                    <option value="ภาคกลาง">ภาคกลาง</option>
                    <option value="ภาคตะวันออก">ภาคตะวันออก</option>
                    <option value="ภาคตะวันออกเฉียงเหนือ">
                      ภาคตะวันออกเฉียงเหนือ
                    </option>
                    <option value="ภาคใต้">ภาคใต้</option>
                    <option value="ภาคตะวันตก">ภาคตะวันตก</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      handleInputChange("gender", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select gender</option>
                    <option value="ชาย">ชาย</option>
                    <option value="หญิง">หญิง</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Attendance Status
                  </label>
                  <select
                    value={formData.attendance_status}
                    onChange={(e) =>
                      handleInputChange("attendance_status", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select status</option>
                    <option value="เข้าร่วม">เข้าร่วม</option>
                    <option value="ไม่เข้าร่วม">ไม่เข้าร่วม</option>
                    <option value="ยกเลิก">ยกเลิก</option>
                  </select>
                </div>
              </div>

              {/* Contact Information */}
              <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      placeholder="email@example.com"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Mobile Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.mobile_phone}
                      onChange={(e) =>
                        handleInputChange("mobile_phone", e.target.value)
                      }
                      placeholder="08X-XXX-XXXX"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Telephone
                    </label>
                    <input
                      type="tel"
                      value={formData.telephone}
                      onChange={(e) =>
                        handleInputChange("telephone", e.target.value)
                      }
                      placeholder="0X-XXX-XXXX"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Fax
                    </label>
                    <input
                      type="tel"
                      value={formData.fax}
                      onChange={(e) => handleInputChange("fax", e.target.value)}
                      placeholder="0X-XXX-XXXX"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Accommodation Tab */}
          {activeTab === "accommodation" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Hotel
                  </label>
                  <select
                    value={formData.hotel_id}
                    onChange={(e) =>
                      handleInputChange("hotel_id", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select hotel</option>
                    {Array.isArray(hotels) &&
                      hotels.map((hotel) => (
                        <option key={hotel.id} value={hotel.id}>
                          {hotel.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Room Type
                  </label>
                  <select
                    value={formData.room_type}
                    onChange={(e) =>
                      handleInputChange("room_type", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select room type</option>
                    <option value="ห้องเดี่ยว">ห้องเดี่ยว</option>
                    <option value="ห้องคู่">ห้องคู่</option>
                    <option value="ห้องสามคน">ห้องสามคน</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Check In Date
                  </label>
                  <input
                    type="date"
                    value={formData.check_in_date}
                    onChange={(e) =>
                      handleInputChange("check_in_date", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Check Out Date
                  </label>
                  <input
                    type="date"
                    value={formData.check_out_date}
                    onChange={(e) =>
                      handleInputChange("check_out_date", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Events Tab */}
          {activeTab === "events" && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Select Events to Register
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.isArray(events) &&
                  events.map((event) => (
                    <label
                      key={event.id}
                      className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.selected_events.includes(event.id)}
                        onChange={() => handleEventToggle(event.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-gray-900 dark:text-white">
                        {event.name}
                      </span>
                    </label>
                  ))}
              </div>
            </div>
          )}

          {/* Transportation Tab */}
          {activeTab === "transportation" && (
            <div className="space-y-6">
              {/* Outbound Transportation */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Outbound Transportation
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Transport Type
                    </label>
                    <select
                      value={formData.outbound_transport_type}
                      onChange={(e) =>
                        handleInputChange(
                          "outbound_transport_type",
                          e.target.value,
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Select transport type</option>
                      <option value="รถบัส">รถบัส</option>
                      <option value="รถตู้">รถตู้</option>
                      <option value="รถยนต์ส่วนตัว">รถยนต์ส่วนตัว</option>
                      <option value="เครื่องบิน">เครื่องบิน</option>
                      <option value="รถไฟ">รถไฟ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Details
                    </label>
                    <input
                      type="text"
                      value={formData.outbound_details}
                      onChange={(e) =>
                        handleInputChange("outbound_details", e.target.value)
                      }
                      placeholder="Additional details"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Departure Time
                    </label>
                    <input
                      type="time"
                      value={formData.outbound_departure_time}
                      onChange={(e) =>
                        handleInputChange(
                          "outbound_departure_time",
                          e.target.value,
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Arrival Time
                    </label>
                    <input
                      type="time"
                      value={formData.outbound_arrival_time}
                      onChange={(e) =>
                        handleInputChange(
                          "outbound_arrival_time",
                          e.target.value,
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Return Transportation */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Return Transportation
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Transport Type
                    </label>
                    <select
                      value={formData.return_transport_type}
                      onChange={(e) =>
                        handleInputChange(
                          "return_transport_type",
                          e.target.value,
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Select transport type</option>
                      <option value="รถบัส">รถบัส</option>
                      <option value="รถตู้">รถตู้</option>
                      <option value="รถยนต์ส่วนตัว">รถยนต์ส่วนตัว</option>
                      <option value="เครื่องบิน">เครื่องบิน</option>
                      <option value="รถไฟ">รถไฟ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Details
                    </label>
                    <input
                      type="text"
                      value={formData.return_details}
                      onChange={(e) =>
                        handleInputChange("return_details", e.target.value)
                      }
                      placeholder="Additional details"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Departure Time
                    </label>
                    <input
                      type="time"
                      value={formData.return_departure_time}
                      onChange={(e) =>
                        handleInputChange(
                          "return_departure_time",
                          e.target.value,
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Arrival Time
                    </label>
                    <input
                      type="time"
                      value={formData.return_arrival_time}
                      onChange={(e) =>
                        handleInputChange("return_arrival_time", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Finances Tab */}
          {activeTab === "finances" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Activity Fee
                  </label>
                  <input
                    type="number"
                    value={formData.activity_fee}
                    onChange={(e) =>
                      handleInputChange("activity_fee", e.target.value)
                    }
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Accommodation Fee
                  </label>
                  <input
                    type="number"
                    value={formData.accommodation_fee}
                    onChange={(e) =>
                      handleInputChange("accommodation_fee", e.target.value)
                    }
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Dinner Fee
                  </label>
                  <input
                    type="number"
                    value={formData.dinner_fee}
                    onChange={(e) =>
                      handleInputChange("dinner_fee", e.target.value)
                    }
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Payment Status
                  </label>
                  <select
                    value={formData.payment_status}
                    onChange={(e) =>
                      handleInputChange("payment_status", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select payment status</option>
                    <option value="ชำระแล้ว">ชำระแล้ว</option>
                    <option value="ยังไม่ได้ชำระเงิน">ยังไม่ได้ชำระเงิน</option>
                    <option value="ฟรี">ฟรี</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) =>
                      handleInputChange("payment_date", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) =>
                      handleInputChange("payment_method", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select payment method</option>
                    <option value="เงินสด">เงินสด</option>
                    <option value="โอนเงิน">โอนเงิน</option>
                    <option value="เช็ค">เช็ค</option>
                    <option value="บัตรเครดิต">บัตรเครดิต</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Additional notes about payment or fees"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex-shrink-0">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {hasChanges && (
              <span className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                You have unsaved changes
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 ml-4">
            <button
              onClick={handleClose}
              disabled={saving}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Participant
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
