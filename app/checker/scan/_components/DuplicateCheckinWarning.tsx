"use client";

import { useState } from "react";

interface DuplicateCheckinWarningProps {
  userInfo: {
    fullName: string;
    email: string;
    phone: string;
  };
  eventType: string;
  checkinTime: string;
  onClearAndTryAgain: () => void;
  onChangeEvent: () => void;
  onClose: () => void;
}

export default function DuplicateCheckinWarning({
  userInfo,
  eventType,
  checkinTime,
  onClearAndTryAgain,
  onChangeEvent,
  onClose,
}: DuplicateCheckinWarningProps) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const formatEventType = (type: string) => {
    const eventTypeMap: { [key: string]: string } = {
      first_sight: "First Sight",
      airport_arrival: "Airport Arrival",
      hotel_checkin: "Hotel Check-in",
      dinner_party: "Dinner Party",
      classroom_session: "Classroom Session",
      airport_departure: "Airport Departure",
    };
    return (
      eventTypeMap[type] ||
      type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div
        className={`bg-white rounded-lg shadow-xl max-w-md w-full transform transition-all duration-200 ${
          isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="ml-3 text-lg font-medium text-gray-900">
              Duplicate Check-in Detected
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* User Info */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex items-center mb-2">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-yec-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {userInfo.fullName
                      ? userInfo.fullName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                      : "U"}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {userInfo.fullName || "Unknown User"}
                </p>
                <p className="text-xs text-gray-500">
                  {userInfo.email || "unknown@example.com"}
                </p>
              </div>
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-red-800">
                  User has already checked in to {formatEventType(eventType)}
                </h4>
                <div className="mt-2 text-sm text-red-700">
                  <p className="mb-2">
                    This user has already checked in to this event type
                    previously.
                  </p>
                  <div className="bg-red-100 rounded p-2">
                    <p className="text-xs font-medium text-red-800">
                      Previous check-in: {checkinTime}
                    </p>
                  </div>
                  <p className="mt-2 text-xs">
                    <strong>Business Rule:</strong> Each user can only check in
                    once per event type.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClearAndTryAgain}
              className="flex-1 bg-red-100 text-red-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-200 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Clear & Try Again
            </button>
            <button
              onClick={onChangeEvent}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Change Event
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Select a different event type or verify the user&apos;s check-in
              status
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
