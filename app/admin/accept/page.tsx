"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";

type AcceptState =
  | "loading"
  | "success"
  | "expired"
  | "used"
  | "revoked"
  | "invalid"
  | "error";

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<AcceptState>("loading");
  const [error, setError] = useState<string>("");
  const [acceptedEmail, setAcceptedEmail] = useState<string>("");

  const acceptInvitation = useCallback(
    async (token: string) => {
      try {
        setState("loading");
        setError("");

        const response = await fetch(
          `/api/admin/management/invitations/token/${encodeURIComponent(token)}/accept`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: "Admin User", // Optional name field
            }),
          },
        );

        if (response.ok) {
          setState("success");

          // Extract email from response for login handoff
          try {
            const responseData = await response.json();
            if (responseData.email) {
              setAcceptedEmail(responseData.email);
            }
          } catch (e) {
            console.warn("Could not parse response for email:", e);
          }

          // Fire analytics event
          if (typeof window !== "undefined" && (window as any).gtag) {
            (window as any).gtag("event", "accept_invite_result", {
              event_category: "admin_invitation",
              event_label: "success",
              value: 1,
            });
          }
        } else {
          let errMsg = "Failed to accept invitation";
          try {
            const j = await response.json();
            errMsg = j?.error || errMsg;
          } catch {}

          // Handle different error states
          if (response.status === 410) {
            if (errMsg.includes("EXPIRED_TOKEN")) {
              setState("expired");
            } else if (errMsg.includes("INVALID_TOKEN")) {
              setState("used");
            } else {
              setState("revoked");
            }
          } else {
            setState(response.status === 410 ? "invalid" : "error");
            setError(errMsg);
          }

          // Fire analytics event for error states
          if (typeof window !== "undefined" && (window as any).gtag) {
            (window as any).gtag("event", "accept_invite_result", {
              event_category: "admin_invitation",
              event_label: state,
              value: 0,
            });
          }
        }
      } catch (err) {
        console.error("Error accepting invitation:", err);
        setState("error");
        setError("Network error occurred. Please try again.");

        // Fire analytics event for network errors
        if (typeof window !== "undefined" && (window as any).gtag) {
          (window as any).gtag("event", "accept_invite_result", {
            event_category: "admin_invitation",
            event_label: "network_error",
            value: 0,
          });
        }
      }
    },
    [state],
  );

  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return; // one-shot guard
    startedRef.current = true;

    const token = searchParams.get("token");

    if (!token) {
      setState("invalid");
      setError("No invitation token provided");
      return;
    }

    acceptInvitation(token);
  }, [searchParams, acceptInvitation]);

  const handleGoToAdminConsole = () => {
    // Use email from API response to prefill login; do not assume user is signed-in here
    const loginUrl = `/admin/login?next=%2Fadmin${acceptedEmail ? `&email=${encodeURIComponent(acceptedEmail)}` : ""}`;
    router.push(loginUrl);
  };

  const handleRequestNewInvite = () => {
    // This could redirect to a contact form or support page
    window.location.href =
      "mailto:info@yecday.com?subject=Request for Admin Invitation";
  };

  const renderContent = () => {
    switch (state) {
      case "loading":
        return (
          <div className="text-center" data-testid="loading-state">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Verifying Invitation
            </h2>
            <p className="text-gray-600">
              Please wait while we verify your invitation...
            </p>
          </div>
        );

      case "success":
        return (
          <div className="text-center" data-testid="success-state">
            <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Welcome to YEC Day Admin Console!
            </h2>
            <p className="text-gray-600 mb-6">
              Your invitation has been accepted successfully. You are now an
              administrator.
            </p>
            <button
              onClick={handleGoToAdminConsole}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              data-testid="go-to-admin-button"
            >
              Go to Admin Console
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        );

      case "expired":
        return (
          <div className="text-center" data-testid="expired-state">
            <XCircle className="mx-auto h-12 w-12 text-red-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Invitation Expired
            </h2>
            <p className="text-gray-600 mb-6">
              This invitation has expired. Invitations are valid for 48 hours
              from the time they are sent.
            </p>
            <button
              onClick={handleRequestNewInvite}
              className="inline-flex items-center px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              Request New Invitation
            </button>
          </div>
        );

      case "used":
        return (
          <div className="text-center" data-testid="used-state">
            <XCircle className="mx-auto h-12 w-12 text-red-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Invitation Already Used
            </h2>
            <p className="text-gray-600 mb-6">
              This invitation has already been accepted. Each invitation can
              only be used once.
            </p>
            <button
              onClick={handleRequestNewInvite}
              className="inline-flex items-center px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              Request New Invitation
            </button>
          </div>
        );

      case "revoked":
        return (
          <div className="text-center" data-testid="revoked-state">
            <XCircle className="mx-auto h-12 w-12 text-red-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Invitation Revoked
            </h2>
            <p className="text-gray-600 mb-6">
              This invitation has been revoked by an administrator and is no
              longer valid.
            </p>
            <button
              onClick={handleRequestNewInvite}
              className="inline-flex items-center px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              Request New Invitation
            </button>
          </div>
        );

      case "invalid":
        return (
          <div className="text-center" data-testid="invalid-state">
            <AlertCircle className="mx-auto h-12 w-12 text-yellow-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Invalid Invitation
            </h2>
            <p className="text-gray-600 mb-6">
              The invitation link is invalid or missing. Please check the link
              and try again.
            </p>
            <button
              onClick={handleRequestNewInvite}
              className="inline-flex items-center px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              Request New Invitation
            </button>
          </div>
        );

      case "error":
        return (
          <div className="text-center" data-testid="error-state">
            <AlertCircle className="mx-auto h-12 w-12 text-red-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Error Processing Invitation
            </h2>
            <p className="text-gray-600 mb-6">
              {error ||
                "An unexpected error occurred while processing your invitation."}
            </p>
            <div className="space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={handleRequestNewInvite}
                className="inline-flex items-center px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
              >
                Contact Support
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            YEC Day Admin Console
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Accept your administrator invitation
          </p>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {renderContent()}
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          Need help? Contact us at{" "}
          <a
            href="mailto:info@yecday.com"
            className="text-blue-600 hover:text-blue-500"
          >
            info@yecday.com
          </a>
        </p>
      </div>
    </div>
  );
}
