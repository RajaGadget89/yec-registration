"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, AlertCircle, CheckCircle, Mail } from "lucide-react";

/**
 * Auth Callback Page
 *
 * This page handles the OAuth callback from Supabase magic links.
 * It extracts tokens from the URL hash and posts them to /api/auth/callback.
 *
 * ROUTING FIX: Previously, a route.ts file in this directory was causing 405 errors
 * on GET requests because it only defined POST. The route.ts has been moved to
 * /api/auth/callback/route.ts to separate the client page from the API endpoint.
 */

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<"loading" | "error" | "success">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log(
          "[callback] starting auth flow at:",
          new Date().toISOString(),
        );
        console.log("[callback] current URL:", window.location.href);
        console.log("[callback] URL hash:", window.location.hash);
        console.log("[callback] URL search:", window.location.search);
        console.log("[callback] URL pathname:", window.location.pathname);

        // Check if we're on the wrong URL (like %2A.vercel.app)
        if (
          window.location.hostname.includes("%2A") ||
          window.location.hostname.includes("*")
        ) {
          console.error(
            "[callback] Detected wrong redirect URL:",
            window.location.href,
          );
          setStatus("error");
          setErrorMessage(
            "Authentication redirect failed. The magic link redirected to an invalid URL. Please try again or contact support.",
          );
          return;
        }

        // Parse location.hash for tokens
        const hash = window.location.hash;
        const hashParams = new URLSearchParams(hash.substring(1)); // Remove the # symbol
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const nextParam = new URLSearchParams(window.location.search).get(
          "next",
        );

        // DEBUG: Log all URL parameters
        console.log("[callback] URL analysis:", {
          hash,
          hashParams: Object.fromEntries(hashParams.entries()),
          searchParams: Object.fromEntries(
            new URLSearchParams(window.location.search).entries(),
          ),
          accessTokenLength: accessToken?.length || 0,
          refreshTokenLength: refreshToken?.length || 0,
          nextParam,
          fullUrl: window.location.href,
        });

        if (!accessToken || !refreshToken) {
          console.log("[callback] missing tokens in hash");
          setStatus("error");
          setErrorMessage(
            "No access token or refresh token found in URL. Please request a new magic link.",
          );
          return;
        }

        // Validate token format (basic check)
        if (accessToken.split(".").length !== 3) {
          console.log("[callback] invalid access token format");
          setStatus("error");
          setErrorMessage(
            "Invalid magic link format. Please request a new one.",
          );
          return;
        }

        console.log("[callback] tokens found, posting to server");
        console.log("[callback] token lengths:", {
          accessToken: accessToken?.length || 0,
          refreshToken: refreshToken?.length || 0,
        });

        // POST tokens to API route
        const response = await fetch("/api/auth/callback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            access_token: accessToken,
            refresh_token: refreshToken,
            next: nextParam,
          }),
        });

        console.log("[callback] API response status:", response.status);
        console.log(
          "[callback] API response headers:",
          Object.fromEntries(response.headers.entries()),
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("[callback] API error response:", errorData);
          setStatus("error");
          setErrorMessage(
            `Authentication failed: ${errorData.message || response.statusText}`,
          );
          return;
        }

        const data = await response.json().catch(() => ({}));
        console.log("[callback] API success response:", data);

        // Check for redirect location
        const location = response.headers.get("location");
        console.log("[callback] location header:", location);

        if (location) {
          console.log("[callback] redirecting to:", location);

          // Show success message briefly before redirect
          setStatus("success");
          setSuccessMessage(
            "Authentication successful! Redirecting to admin dashboard...",
          );

          // Clean the URL and redirect after a brief delay
          setTimeout(() => {
            // Clean the URL first
            history.replaceState({}, "", "/auth/callback");

            // Then redirect
            window.location.href = location;
          }, 1000);
        } else if (response.redirected) {
          // Browser already followed the redirect, check if we're on admin page
          console.log(
            "[callback] browser followed redirect, checking current location...",
          );

          // Check if we're already on the admin page
          if (window.location.pathname === "/admin") {
            console.log(
              "[callback] already on admin page, authentication successful!",
            );
            setStatus("success");
            setSuccessMessage(
              "Authentication successful! You are now on the admin dashboard.",
            );

            // Clean the URL
            history.replaceState({}, "", "/admin");
          } else {
            // Redirect happened but we're not on admin page
            console.log(
              "[callback] redirect followed but not on admin page, redirecting manually...",
            );
            setStatus("success");
            setSuccessMessage(
              "Authentication successful! Redirecting to admin dashboard...",
            );

            // Redirect to admin page
            setTimeout(() => {
              window.location.href = "/admin";
            }, 1000);
          }
        } else {
          // No redirect - this shouldn't happen
          console.log("[callback] no redirect found, redirecting manually");
          setStatus("success");
          setSuccessMessage(
            "Authentication successful! Redirecting to admin dashboard...",
          );

          setTimeout(() => {
            window.location.href = "/admin";
          }, 1000);
        }
      } catch (error) {
        console.error("[callback] unexpected error:", error);
        setStatus("error");
        setErrorMessage(
          "An unexpected error occurred during authentication. Please try again.",
        );
      }
    };

    handleAuthCallback();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yec-primary via-blue-600 to-blue-500 flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-300/30 to-yec-accent/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-yec-highlight/30 to-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-to-br from-blue-200/10 to-blue-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
          {status === "loading" && (
            <div className="text-center">
              <Loader2 className="h-12 w-12 text-yec-primary animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                Processing Authentication
              </h1>
              <p className="text-gray-600">
                Please wait while we complete your sign-in...
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                Authentication Failed
              </h1>
              <p className="text-gray-600 mb-6">{errorMessage}</p>
              <Link
                href="/admin/login"
                className="inline-flex items-center px-6 py-3 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors duration-200 font-medium"
              >
                <Mail className="h-5 w-5 mr-2" />
                Resend Magic Link
              </Link>
            </div>
          )}

          {status === "success" && (
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                Authentication Successful
              </h1>
              <p className="text-gray-600 mb-6">{successMessage}</p>
              <div className="inline-flex items-center px-6 py-3 bg-green-100 text-green-700 rounded-lg">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Redirecting...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
