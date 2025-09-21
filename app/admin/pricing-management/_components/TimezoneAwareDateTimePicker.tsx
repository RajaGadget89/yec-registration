"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock } from "lucide-react";

interface TimezoneAwareDateTimePickerProps {
  value: string; // ISO string (UTC)
  onChange: (isoString: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function TimezoneAwareDateTimePicker({
  value,
  onChange,
  label,
  placeholder = "Select date and time",
  className = "",
  disabled = false,
}: TimezoneAwareDateTimePickerProps) {
  const [localDateTime, setLocalDateTime] = useState("");

  // Convert UTC ISO string to Thailand time for display
  const utcToThailandTime = (utcIsoString: string): string => {
    if (!utcIsoString) return "";

    try {
      const utcDate = new Date(utcIsoString);
      // Convert to Thailand timezone (GMT+7) for display
      const thailandDate = new Date(utcDate.getTime() + 7 * 60 * 60 * 1000);
      return thailandDate.toISOString().slice(0, 16);
    } catch (error) {
      console.error("Error converting UTC to Thailand time:", error);
      return "";
    }
  };

  // Convert Thailand time to UTC ISO string for storage
  const thailandTimeToUTC = (thailandDateTimeString: string): string => {
    if (!thailandDateTimeString) return "";

    try {
      // Parse the datetime string and treat it as Thailand time (GMT+7)
      // Create a date string that represents the time in Thailand timezone
      const thailandDateString = `${thailandDateTimeString}:00+07:00`;
      const thailandDate = new Date(thailandDateString);

      // Convert to UTC
      return thailandDate.toISOString();
    } catch (error) {
      console.error("Error converting Thailand time to UTC:", error);
      return "";
    }
  };

  // Initialize localDateTime from value prop
  useEffect(() => {
    if (value) {
      setLocalDateTime(utcToThailandTime(value));
    } else {
      setLocalDateTime("");
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newThailandTime = e.target.value;
    setLocalDateTime(newThailandTime);

    if (newThailandTime) {
      const utcIso = thailandTimeToUTC(newThailandTime);
      onChange(utcIso);
    } else {
      onChange("");
    }
  };

  const handleClear = () => {
    setLocalDateTime("");
    onChange("");
  };

  const handleSetToNow = () => {
    const now = new Date();
    const thailandNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const thailandDateTimeString = thailandNow.toISOString().slice(0, 16);
    setLocalDateTime(thailandDateTimeString);
    onChange(thailandTimeToUTC(thailandDateTimeString));
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Simple label with timezone indicator */}
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {label}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            (Thailand Time)
          </span>
        </div>
      </label>

      {/* Main input */}
      <div className="relative">
        <input
          type="datetime-local"
          value={localDateTime}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
        />
        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />

        {/* Simple action buttons */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
          <button
            type="button"
            onClick={handleSetToNow}
            disabled={disabled}
            className="p-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Set to current time"
          >
            Now
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled || !localDateTime}
            className="p-1 text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Clear"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
