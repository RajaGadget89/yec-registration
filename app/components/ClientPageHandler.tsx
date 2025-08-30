"use client";

import { useEffect } from "react";

export default function ClientPageHandler() {
  useEffect(() => {
    // Handle scroll parameter from navigation
    const urlParams = new URLSearchParams(window.location.search);
    const scrollTarget = urlParams.get("scroll");
    const isEditMode = urlParams.get("edit") === "true";

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
      // Wait for page to load, then scroll to form section
      setTimeout(() => {
        const formSection = document.getElementById("form");
        if (formSection) {
          const headerHeight = 80; // Approximate header height
          const targetPosition = formSection.offsetTop - headerHeight;
          window.scrollTo({ top: targetPosition, behavior: "smooth" });

          // Clean up URL parameters
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete("scroll");
          newUrl.searchParams.delete("edit");
          window.history.replaceState({}, "", newUrl.toString());
        }
      }, 100);
    }
  }, []);

  return null; // This component doesn't render anything
}
