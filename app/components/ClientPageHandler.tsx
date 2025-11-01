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
      maxRetries: number = 30,
      retryDelay: number = 100,
    ) => {
      let retries = 0;

      const attemptScroll = () => {
        const formSection = document.getElementById("form");
        if (formSection) {
          const headerHeight = 80; // Approximate header height
          const targetPosition = formSection.offsetTop - headerHeight;
          window.scrollTo({ top: targetPosition, behavior: "smooth" });
          return true;
        }

        // Retry if form not found yet
        if (retries < maxRetries) {
          retries++;
          setTimeout(attemptScroll, retryDelay);
          return false;
        }

        // Max retries reached, form not found
        console.warn("Form section not found after retries");
        return false;
      };

      attemptScroll();
    };

    // Check if this is a token-based update request
    if (token && dimension) {
      // This is a token-based update, scroll to form section
      console.log("Detected token-based update request, scrolling to form");
      // Wait a bit for page to render, then try scrolling
      setTimeout(() => scrollToForm(), 100);
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
      // Wait for page to load, then scroll to form section with retry logic
      setTimeout(() => {
        scrollToForm();
        // Clean up URL parameters after attempting scroll
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("scroll");
        newUrl.searchParams.delete("edit");
        window.history.replaceState({}, "", newUrl.toString());
      }, 100);
    }
  }, []);

  return null; // This component doesn't render anything
}
