"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import QRScanner from "./QRScanner";
import EventSelector from "./EventSelector";
import CheckinConfirmation from "./CheckinConfirmation";
import DuplicateCheckinWarning from "./DuplicateCheckinWarning";

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

interface QRScannerClientProps {
  user: any;
}

export default function QRScannerClient({ user }: QRScannerClientProps) {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [featureEnabled, setFeatureEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [processing, setProcessing] = useState(false);
  const [scannerKey, setScannerKey] = useState(0); // Key to force scanner refresh

  const router = useRouter();

  // Check feature flag on component mount
  useEffect(() => {
    const checkFeatureFlag = async () => {
      try {
        const response = await fetch("/api/features/checkin-system");
        if (response.ok) {
          const data = await response.json();
          setFeatureEnabled(data.enabled);
        } else {
          setFeatureEnabled(false);
        }
      } catch (error) {
        console.error("Failed to check feature flag:", error);
        setFeatureEnabled(false);
      }
    };

    checkFeatureFlag();
  }, []);

  // Handle event selection change and reset scanner state
  const handleEventSelect = (eventId: string) => {
    console.log("🔄 Event selection changed to:", eventId);

    // Reset all scanner-related state
    setSelectedEvent(eventId);
    setError(null);
    setSuccess(null);
    setShowConfirmation(false);
    setQrData(null);
    setUserInfo(null);
    setEventInfo(null);
    setProcessing(false);

    // Force scanner refresh by changing the key
    setScannerKey((prev) => prev + 1);

    // Show a brief success message to indicate scanner reset
    if (eventId) {
      setSuccess("Scanner refreshed for new event. Ready to scan QR codes.");
      // Clear the success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    }

    console.log("✅ Scanner state reset for new event");
  };

  const handleQRCodeDetected = async (data: string) => {
    if (!selectedEvent) {
      setError("Please select an event first");
      return;
    }

    setQrData(data);
    setError(null);
    setSuccess(null);

    try {
      setProcessing(true);

      // DEBUG: Log the raw QR code data
      console.log("🔍 RAW QR CODE DATA:", data);
      console.log("🔍 Data type:", typeof data);
      console.log("🔍 Data length:", data.length);

      // Parse QR code data - it should contain JSON with registration info
      let parsedData;
      try {
        parsedData = JSON.parse(data);
        console.log("✅ QR Code parsed as JSON:", parsedData);
      } catch (parseError) {
        console.log(
          "❌ QR Code is not JSON, treating as direct registration ID",
        );
        console.log("❌ Parse error:", (parseError as Error).message);
        // If not JSON, treat as registration ID directly
        parsedData = { regId: data.trim() };
      }

      // DEBUG: Log all possible registration ID sources
      console.log(
        "🔍 Available fields in parsed data:",
        Object.keys(parsedData),
      );
      console.log("🔍 regId:", parsedData.regId);
      console.log("🔍 registration_id:", parsedData.registration_id);
      console.log("🔍 phone:", parsedData.phone);
      console.log("🔍 id:", parsedData.id);
      console.log("🔍 fullName:", parsedData.fullName);

      // Extract registration ID from parsed data
      // Priority: regId (unique registration_id) > registration_id > phone (fallback)
      const registrationId =
        parsedData.regId ||
        parsedData.registration_id ||
        parsedData.phone ||
        parsedData.id ||
        data.trim();

      console.log("🎯 Final registration ID:", registrationId);
      console.log(
        "🌐 API URL will be:",
        `/api/checkin/verify/${registrationId}`,
      );

      if (!registrationId) {
        setError("Invalid QR code format - no registration ID found");
        return;
      }

      // Fetch user information
      console.log(
        "📡 Making API call to:",
        `/api/checkin/verify/${registrationId}`,
      );
      const response = await fetch(`/api/checkin/verify/${registrationId}`);
      const result = await response.json();

      console.log("📡 API Response status:", response.status);
      console.log("📡 API Response data:", result);

      if (!response.ok) {
        setError(result.error || "Failed to verify registration");
        return;
      }

      // Fetch event information
      const eventResponse = await fetch(`/api/checkin/events/${selectedEvent}`);
      const eventResult = await eventResponse.json();

      if (!eventResponse.ok) {
        setError("Failed to fetch event information");
        return;
      }

      // Check if user has already checked in to this event
      const checkinStatusResponse = await fetch(
        `/api/checkin/checkin-status/${registrationId}/${selectedEvent}`,
      );

      if (!checkinStatusResponse.ok) {
        console.error(
          "❌ Check-in status API failed:",
          checkinStatusResponse.status,
          checkinStatusResponse.statusText,
        );
        const errorData = await checkinStatusResponse.json();
        console.error("❌ API Error details:", errorData);
        setError(
          `❌ Failed to check user status: ${errorData.error || "Unknown error"}. Please try again or contact support.`,
        );
        return;
      }

      const checkinStatus = await checkinStatusResponse.json();
      console.log("🔍 Check-in status check:", checkinStatus);

      // Set user info with data from both API response and QR code
      const userInfo = {
        ...result.user,
        fullName:
          result.user?.full_name || (qrData as any)?.fullName || "Unknown User",
        email: result.user?.email || "unknown@example.com",
        phone: result.user?.phone || (qrData as any)?.phone || "Unknown Phone",
      };

      setUserInfo(userInfo);
      setEventInfo(eventResult.event);

      // Add check-in status to user info
      setUserInfo((prev) => ({
        ...prev,
        alreadyCheckedIn: checkinStatus.alreadyCheckedIn || false,
        checkinTime: checkinStatus.checkinTime || null,
        eventType: checkinStatus.eventType || null,
        isEventTypeRestricted: checkinStatus.isEventTypeRestricted || false,
        registration_id: prev?.registration_id || "",
        full_name: prev?.full_name || "",
        email: prev?.email || "",
        phone: prev?.phone || "",
      }));

      // Show confirmation dialog, but check validation first
      if (checkinStatus.alreadyCheckedIn) {
        // User has already checked in - show enhanced warning message instead of confirmation
        const checkinTime = checkinStatus.checkinTime
          ? new Date(checkinStatus.checkinTime).toLocaleString()
          : "previously";
        const eventTypeName = checkinStatus.eventType || "this event type";
        setError(
          `User has already checked in to ${eventTypeName} at ${checkinTime}. Please select a different event or verify the user's check-in status.`,
        );
        setShowConfirmation(false);
      } else {
        // User can check in - show confirmation dialog
        setShowConfirmation(true);
      }
    } catch (error) {
      console.error("💥 QR code processing error:", error);
      setError("Failed to process QR code");
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckinConfirm = async (location?: string, notes?: string) => {
    if (!userInfo || !selectedEvent) return;

    try {
      setProcessing(true);

      const response = await fetch("/api/checkin/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registrationId: userInfo.registration_id,
          eventId: selectedEvent,
          location: location || null,
          notes: notes || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error cases with better user feedback
        if (response.status === 409) {
          // User already checked in
          const checkinTime = result.checkin_time
            ? new Date(result.checkin_time).toLocaleString()
            : "previously";
          setError(
            `❌ User has already checked in to this event at ${checkinTime}. Please select a different event or verify the user's check-in status.`,
          );
        } else if (response.status === 404) {
          setError(
            `❌ Registration not found. Please verify the QR code is valid.`,
          );
        } else if (response.status === 403) {
          setError(`❌ Registration not approved. User cannot check in.`);
        } else if (response.status === 401) {
          setError(`❌ Authentication required. Please log in again.`);
        } else {
          setError(`❌ Check-in failed: ${result.error || "Unknown error"}`);
        }
        return;
      }

      setSuccess("✅ Check-in successful!");
      setShowConfirmation(false);
      setQrData(null);
      setUserInfo(null);
      setEventInfo(null);
    } catch (error) {
      console.error("Check-in error:", error);
      setError("Check-in failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const response = await fetch("/api/checker/signout", {
        method: "POST",
      });

      if (response.ok) {
        router.push("/checker/login");
      } else {
        console.error("Sign out failed");
        // Still redirect to login page
        router.push("/checker/login");
      }
    } catch (error) {
      console.error("Sign out error:", error);
      // Still redirect to login page
      router.push("/checker/login");
    }
  };

  // Show loading while checking feature flag
  if (featureEnabled === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yec-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking system availability...</p>
        </div>
      </div>
    );
  }

  // Show error if feature is disabled
  if (featureEnabled === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Check-in System Not Available
          </h1>
          <p className="text-gray-600">
            The check-in system is currently disabled.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Matching Admin Dashboard */}
      <div className="bg-yec-primary shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-yec-accent rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">YEC</span>
                </div>
                <span className="text-white font-bold text-lg">YEC Day</span>
              </div>
              <nav className="hidden md:flex items-center space-x-6">
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-white/10 rounded-lg border border-white/20">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-white text-sm font-semibold">
                    Mobile Checker
                  </span>
                </div>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-white text-sm font-medium">
                  Checker Admin
                </div>
                <div className="text-yec-accent text-xs">
                  {user?.email || "checker@example.com"}
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Mobile Checker Operation
          </h1>
          <p className="text-gray-600">
            Scan QR codes to check in participants for events
          </p>
        </div>

        {/* Event Selection */}
        <div className="mb-8">
          <EventSelector
            selectedEvent={selectedEvent}
            onEventSelect={handleEventSelect}
          />
        </div>

        {/* QR Scanner */}
        <div className="mb-8">
          <QRScanner
            key={scannerKey}
            onQRCodeDetected={handleQRCodeDetected}
            onError={setError}
            active={!!selectedEvent && !processing}
          />
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-4">
            {error.includes("already checked in") && userInfo ? (
              <DuplicateCheckinWarning
                userInfo={{
                  fullName: userInfo.full_name,
                  email: userInfo.email,
                  phone: userInfo.phone,
                }}
                eventType={(eventInfo as any)?.event_type || "unknown"}
                checkinTime={error.match(/at (.+?)\./)?.[1] || "previously"}
                onClearAndTryAgain={() => {
                  setError(null);
                  setQrData(null);
                  setUserInfo(null);
                  setEventInfo(null);
                  setShowConfirmation(false);
                }}
                onChangeEvent={() => {
                  setError(null);
                  setQrData(null);
                  setUserInfo(null);
                  setEventInfo(null);
                  setShowConfirmation(false);
                  // Show event selector to change event
                  setSelectedEvent(null);
                }}
                onClose={() => {
                  setError(null);
                  setQrData(null);
                  setUserInfo(null);
                  setEventInfo(null);
                  setShowConfirmation(false);
                }}
              />
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800 mb-3">{error}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setError(null);
                      setQrData(null);
                      setUserInfo(null);
                      setEventInfo(null);
                      setShowConfirmation(false);
                    }}
                    className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-sm rounded transition-colors"
                  >
                    Clear & Try Again
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Processing Indicator */}
        {processing && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-blue-800">Processing...</p>
          </div>
        )}

        {/* Check-in Confirmation Modal */}
        {showConfirmation && userInfo && eventInfo && (
          <CheckinConfirmation
            userInfo={userInfo}
            eventInfo={eventInfo}
            onConfirm={handleCheckinConfirm}
            onCancel={() => setShowConfirmation(false)}
            loading={processing}
          />
        )}
      </main>

      {/* Footer - Matching Admin Dashboard */}
      <footer className="bg-yec-primary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Mobile Checker System
              </h3>
              <p className="text-yec-accent text-sm">
                Real-time event check-in management for YEC Day participants.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => handleEventSelect("")}
                  className="block text-yec-accent hover:text-white text-sm transition-colors"
                >
                  Reset Event Selection
                </button>
                <button
                  onClick={() => {
                    setError(null);
                    setSuccess(null);
                    setQrData(null);
                  }}
                  className="block text-yec-accent hover:text-white text-sm transition-colors"
                >
                  Clear Messages
                </button>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-yec-accent/20">
            <p className="text-yec-accent text-sm text-center">
              © 2025 YEC Day. Mobile Checker Interface.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
