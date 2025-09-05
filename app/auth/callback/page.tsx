"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, CheckCircle, Mail } from "lucide-react";
import { getSupabaseAuth } from "../../lib/auth-client";

/**
 * Auth Callback Content Component
 *
 * This component handles the OAuth callback logic and must be wrapped in Suspense
 * because it uses useSearchParams() which requires Suspense boundary in Next.js App Router.
 */
function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

        const supabase = getSupabaseAuth();
        const nextParam = searchParams.get("next") || "/admin";

        // 1) Try hash tokens first (email link variant)
        const hash = window.location.hash;
        const hashParams = new URLSearchParams(
          hash.startsWith("#") ? hash.slice(1) : hash,
        );
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          console.log("[callback] found hash tokens, setting server cookies");
          console.log("[callback] token lengths:", {
            accessToken: accessToken.length,
            refreshToken: refreshToken.length,
          });

          // Validate token format (basic check)
          if (accessToken.split(".").length !== 3) {
            console.log("[callback] invalid access token format");
            setStatus("error");
            setErrorMessage(
              "Invalid magic link format. Please request a new one.",
            );
            return;
          }

          // Set server cookies first
          const serverResponse = await fetch("/api/auth/session", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              access_token: accessToken,
              refresh_token: refreshToken,
            }),
          });

          if (!serverResponse.ok) {
            console.error(
              "[callback] server cookie set failed:",
              serverResponse.status,
            );
            setStatus("error");
            setErrorMessage(
              "Authentication failed: Server session setup failed",
            );
            return;
          }

          // Keep client session in sync (optional but fine)
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.warn("[callback] client session sync failed:", error);
            // Don't fail the whole flow for client sync issues
          }

          console.log("[callback] server cookies set successfully");
          setStatus("success");
          setSuccessMessage(
            "Authentication successful! Redirecting to admin dashboard...",
          );

          // Clean URL and redirect
          console.log("[callback] redirecting to:", nextParam);
          setTimeout(() => {
            history.replaceState({}, "", "/auth/callback");
            console.log(
              "[callback] executing window.location.href redirect to:",
              nextParam,
            );
            window.location.href = nextParam;
          }, 500);
          return;
        }

        // 2) Fallback to PKCE code in query
        const code = searchParams.get("code");
        if (code) {
          console.log(
            "[callback] found code parameter, exchanging for server session",
          );

          // Set server cookies via code exchange
          const serverResponse = await fetch("/api/auth/session", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ code }),
          });

          if (!serverResponse.ok) {
            console.error(
              "[callback] server code exchange failed:",
              serverResponse.status,
            );
            setStatus("error");
            setErrorMessage(
              "Authentication failed: Server session setup failed",
            );
            return;
          }

          console.log("[callback] server code exchange successful");
          setStatus("success");
          setSuccessMessage(
            "Authentication successful! Redirecting to admin dashboard...",
          );

          // Clean URL and redirect
          setTimeout(() => {
            history.replaceState({}, "", "/auth/callback");
            router.replace(nextParam);
          }, 1000);
          return;
        }

        // 3) Nothing usable → error state
        console.log("[callback] no usable tokens or code found");
        setStatus("error");
        setErrorMessage(
          "No authentication tokens found in URL. Please request a new magic link.",
        );
      } catch (error) {
        console.error("[callback] unexpected error:", error);
        setStatus("error");
        setErrorMessage(
          "An unexpected error occurred during authentication. Please try again.",
        );
      }
    };

    handleAuthCallback();
  }, [router, searchParams]);

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

/**
 * Loading fallback component for Suspense boundary
 */
function LoadingFallback() {
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
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-yec-primary animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Loading Authentication
            </h1>
            <p className="text-gray-600">
              Please wait while we prepare your authentication...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Auth Callback Page
 *
 * This page handles the OAuth callback from Supabase magic links.
 * It supports both hash-based tokens and PKCE code exchange.
 *
 * Wrapped in Suspense boundary to handle useSearchParams() properly in Next.js App Router.
 */
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
