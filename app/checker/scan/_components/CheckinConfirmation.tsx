"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface UserInfo {
  registration_id: string;
  full_name: string;
  email: string;
  phone: string;
  yec_province?: string;
  alreadyCheckedIn?: boolean;
  checkinTime?: string;
  profile_image_url?: string;
  eventType?: string;
  isEventTypeRestricted?: boolean;
}

interface EventInfo {
  name: string;
  location: string;
}

interface CheckinConfirmationProps {
  userInfo: UserInfo;
  eventInfo: EventInfo;
  onConfirm: (location?: string, notes?: string) => void;
  onCancel: () => void;
  loading: boolean;
}

export default function CheckinConfirmation({
  userInfo,
  eventInfo,
  onConfirm,
  onCancel,
  loading,
}: CheckinConfirmationProps) {
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState(eventInfo.location);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const handleConfirm = () => {
    onConfirm(location, notes);
  };

  // Generate signed URL for profile image
  useEffect(() => {
    if (!userInfo.profile_image_url) {
      setProfileImageUrl(null);
      return;
    }

    // If it's already a full URL, use it directly
    if (userInfo.profile_image_url.startsWith("http")) {
      setProfileImageUrl(userInfo.profile_image_url);
      return;
    }

    // If it's a file path, generate a signed URL
    if (userInfo.profile_image_url.includes("/")) {
      setImageLoading(true);

      fetch("/api/get-signed-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filePath: userInfo.profile_image_url }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success && data.signedUrl) {
            setProfileImageUrl(data.signedUrl);
            console.log(
              "📸 Profile image signed URL generated:",
              data.signedUrl,
            );
          } else {
            console.error("📸 Failed to generate signed URL:", data.error);
            setProfileImageUrl(null);
          }
        })
        .catch((error) => {
          console.error("📸 Error generating signed URL:", error);
          setProfileImageUrl(null);
        })
        .finally(() => {
          setImageLoading(false);
        });
    } else {
      setProfileImageUrl(null);
    }
  }, [userInfo.profile_image_url]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Confirm Check-in
          </h3>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Already Checked In Warning */}
          {userInfo.alreadyCheckedIn ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    ⚠️{" "}
                    {userInfo.isEventTypeRestricted
                      ? "Badge Already Issued"
                      : "User Already Checked In"}
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    {userInfo.isEventTypeRestricted ? (
                      <>
                        <p>
                          This user has already received their badge from a
                          &quot;Initial badge distribution and
                          verification&quot; event.
                        </p>
                        <p className="mt-1 font-medium">
                          <strong>Business Rule:</strong> Each user can only
                          receive one badge per event type.
                        </p>
                      </>
                    ) : (
                      <p>This user has already checked in to this event.</p>
                    )}
                    {userInfo.checkinTime && (
                      <p className="mt-1">
                        <strong>Previous check-in time:</strong>{" "}
                        {new Date(userInfo.checkinTime).toLocaleString()}
                      </p>
                    )}
                    <p className="mt-2 font-medium">
                      {userInfo.isEventTypeRestricted
                        ? "Please select a different event type or verify the user\'s badge status."
                        : "Please select a different event or verify the user\'s check-in status."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Normal Warning Message */
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> If this user has already checked in
                    to this event, the system will prevent duplicate check-ins.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* User Information */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              User Information
            </h4>
            <div className="bg-gray-50 rounded-md p-3 space-y-3">
              {/* Profile Image */}
              {userInfo.profile_image_url && (
                <div className="flex justify-center mb-3">
                  <div className="relative">
                    {imageLoading ? (
                      <div className="w-24 h-24 rounded-full border-2 border-gray-300 flex items-center justify-center bg-gray-100">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
                      </div>
                    ) : profileImageUrl ? (
                      <Image
                        src={profileImageUrl}
                        alt={`${userInfo.full_name} profile`}
                        className="w-24 h-24 rounded-full object-cover border-2 border-gray-300 shadow-sm"
                        width={96}
                        height={96}
                        onError={(e) => {
                          console.log(
                            "📸 Profile image failed to load:",
                            profileImageUrl,
                          );
                          // Hide image if it fails to load
                          e.currentTarget.style.display = "none";
                        }}
                        onLoad={() => {
                          console.log(
                            "📸 Profile image loaded successfully:",
                            profileImageUrl,
                          );
                        }}
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full border-2 border-gray-300 flex items-center justify-center bg-gray-100">
                        <svg
                          className="w-8 h-8 text-gray-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                    {profileImageUrl && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Name:</span>
                  <span className="text-sm font-medium">
                    {userInfo.full_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Email:</span>
                  <span className="text-sm font-medium">{userInfo.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Phone:</span>
                  <span className="text-sm font-medium">{userInfo.phone}</span>
                </div>
                {userInfo.yec_province && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Province:</span>
                    <span className="text-sm font-medium">
                      {userInfo.yec_province}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    Registration ID:
                  </span>
                  <span className="text-sm font-medium">
                    {userInfo.registration_id}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Event Information */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Event Information
            </h4>
            <div className="bg-blue-50 rounded-md p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Event:</span>
                <span className="text-sm font-medium">{eventInfo.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Location:</span>
                <span className="text-sm font-medium">
                  {eventInfo.location}
                </span>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location (optional)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yec-primary focus:border-yec-primary"
              placeholder="Specific location within the event"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yec-primary focus:border-yec-primary"
              placeholder="Any additional notes about this check-in"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex space-x-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
          >
            Cancel
          </button>
          {userInfo.alreadyCheckedIn ? (
            <button
              disabled
              className="flex-1 bg-gray-400 text-white py-2 px-4 rounded-md cursor-not-allowed opacity-50"
            >
              ❌{" "}
              {userInfo.isEventTypeRestricted
                ? "Badge Already Issued"
                : "Already Checked In"}
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 bg-yec-primary text-white py-2 px-4 rounded-md hover:bg-yec-accent focus:outline-none focus:ring-2 focus:ring-yec-primary disabled:opacity-50"
            >
              {loading ? "Processing..." : "Confirm Check-in"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
