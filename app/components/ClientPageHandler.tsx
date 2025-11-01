"use client";

import { useEffect } from "react";

export default function ClientPageHandler() {
  useEffect(() => {
    // Handle scroll parameter from navigation
    const urlParams = new URLSearchParams(window.location.search);
    const scrollTarget = urlParams.get("scroll");
    const isEditMode = urlParams.get("edit") === "true";
    const token = urlParams.get("token");
    const dimension = urlParams.get("dimension");

    // Helper function to scroll to form with retry logic
    const scrollToForm = (
      maxRetries: number = 50, // Increased retries for slower rendering
      retryDelay: number = 150, // Increased delay for better reliability
    ) => {
      let retries = 0;

      const attemptScroll = () => {
        const formSection = document.getElementById("form");
        if (formSection && formSection.offsetParent !== null) {
          // Check that element is visible (offsetParent !== null means it's rendered)
          const headerHeight = 80; // Approximate header height
          const targetPosition = formSection.offsetTop - headerHeight;

          // Ensure we scroll to a valid position
          if (targetPosition >= 0) {
            window.scrollTo({ top: targetPosition, behavior: "smooth" });
            console.log(
              "✅ Scrolled to form section at position:",
              targetPosition,
            );
            return true;
          }
        }

        // Retry if form not found yet or not visible
        if (retries < maxRetries) {
          retries++;
          setTimeout(attemptScroll, retryDelay);
          return false;
        }

        // Max retries reached, form not found
        console.warn(
          "⚠️ Form section not found or not visible after retries. Retries:",
          retries,
        );
        return false;
      };

      attemptScroll();
    };

    // Check if this is a token-based update request
    if (token && dimension) {
      // This is a token-based update, scroll to form section
      console.log("Detected token-based update request, scrolling to form");
      // Wait a bit for page to render and React to hydrate, then try scrolling
      setTimeout(() => scrollToForm(), 300);
      // Also try after a longer delay for slow hydration
      setTimeout(() => {
        const formSection = document.getElementById("form");
        if (formSection && formSection.offsetParent !== null) {
          const headerHeight = 80;
          const targetPosition = formSection.offsetTop - headerHeight;
          if (targetPosition >= 0) {
            window.scrollTo({ top: targetPosition, behavior: "smooth" });
            console.log("✅ Token update: Secondary scroll to form completed");
          }
        }
      }, 1000);
      return;
    }

    // Check if this is a form submission (has form data in URL)
    const hasFormData =
      urlParams.has("firstName") ||
      urlParams.has("email") ||
      urlParams.has("phone");

    if (hasFormData) {
      // This appears to be a form submission, redirect to preview
      console.log("Detected form submission, redirecting to preview");

      // Store form data in localStorage for the preview page
      const formData: any = {};
      urlParams.forEach((value, key) => {
        formData[key] = value;
      });
      localStorage.setItem("yecRegistrationData", JSON.stringify(formData));

      // Redirect to preview page
      window.location.href = "/preview";
      return;
    }

    if (scrollTarget === "form" || isEditMode) {
      // Wait for page to load and React to hydrate, then scroll to form section with retry logic
      // Use multiple timeouts to ensure DOM is ready and React hydration is complete
      setTimeout(() => {
        scrollToForm();

        // Also try after a longer delay to handle slow React hydration
        setTimeout(() => {
          const formSection = document.getElementById("form");
          if (formSection && formSection.offsetParent !== null) {
            const headerHeight = 80;
            const targetPosition = formSection.offsetTop - headerHeight;
            if (targetPosition >= 0) {
              window.scrollTo({ top: targetPosition, behavior: "smooth" });
              console.log("✅ Secondary scroll to form completed");
            }
          } else {
            console.warn(
              "⚠️ Form section still not found/visible after secondary scroll attempt",
            );
          }
        }, 1000); // Try again after 1 second for slow hydration

        // Clean up URL parameters after a delay (keep them long enough for scroll to work)
        setTimeout(() => {
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete("scroll");
          newUrl.searchParams.delete("edit");
          window.history.replaceState({}, "", newUrl.toString());
        }, 2000); // Wait 2 seconds before cleaning up URL params
      }, 300); // Increased initial delay for better reliability
    }
  }, []);

  return null; // This component doesn't render anything
}
