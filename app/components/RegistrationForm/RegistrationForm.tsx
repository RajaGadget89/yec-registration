"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  formSchema,
  initialFormData,
  FormData as FormDataType,
} from "./FormSchema";
import {
  validateForm,
  shouldShowExtraField,
  calculateFormProgress,
} from "./formValidation";
import FormField from "./FormField";
import PriceDisplayCard from "./PriceDisplayCard";
import RequestUpdatePricingDisplay from "../RequestUpdatePricingDisplay";
import { useDynamicFormSchema } from "./useDynamicFormSchema";

export default function RegistrationForm() {
  const [formData, setFormData] = useState<FormDataType>(initialFormData);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [fileProcessingProgress, setFileProcessingProgress] = useState(0);
  const [qrPreviewOpen, setQrPreviewOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Dynamic form schema based on available pricing options
  const {
    dynamicFormSchema,
    isLoading: isSchemaLoading,
    error: schemaError,
    availableOptions,
  } = useDynamicFormSchema();

  // Clear form data when available options change (e.g., in-quota becomes unavailable)
  useEffect(() => {
    if (availableOptions && formData.hotelChoice) {
      // If current hotel choice is no longer available, clear it
      if (!availableOptions.hotelChoices.includes(formData.hotelChoice)) {
        setFormData((prev) => ({
          ...prev,
          hotelChoice: "",
          roomType: "",
          roommateInfo: "",
          roommatePhone: "",
          external_hotel_name: "",
        }));
      }

      // If current room type is no longer available, clear it
      if (
        formData.roomType &&
        !availableOptions.roomTypes.includes(formData.roomType)
      ) {
        setFormData((prev) => ({
          ...prev,
          roomType: "",
          roommateInfo: "",
          roommatePhone: "",
        }));
      }
    }

    // Auto-set travel_type based on hotel choice when travel_type field is hidden
    if (
      availableOptions &&
      !availableOptions.allowInQuotaAfterEarlyBird &&
      !availableOptions.isEarlyBird
    ) {
      setFormData((prev) => ({
        ...prev,
        travelType: prev.hotelChoice === "out-of-quota" ? "van" : "private-car",
      }));
    }
  }, [availableOptions, formData.hotelChoice, formData.roomType]);

  // Update travel_type when hotel choice changes and travel_type field is hidden
  useEffect(() => {
    if (
      availableOptions &&
      !availableOptions.allowInQuotaAfterEarlyBird &&
      !availableOptions.isEarlyBird
    ) {
      setFormData((prev) => ({
        ...prev,
        travelType: prev.hotelChoice === "out-of-quota" ? "van" : "private-car",
      }));
    }
  }, [formData.hotelChoice, availableOptions]);

  // New state for token-based updates
  const [isTokenUpdate, setIsTokenUpdate] = useState(false);
  const [updateToken, setUpdateToken] = useState<string | null>(null);
  const [updateDimension, setUpdateDimension] = useState<
    "payment" | "profile" | "tcc" | null
  >(null);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [tokenValidationError, setTokenValidationError] = useState<
    string | null
  >(null);
  const [originalRegistrationTime, setOriginalRegistrationTime] =
    useState<Date | null>(null);

  // Price calculation state
  const [priceCalculation, setPriceCalculation] = useState<{
    price: number;
    currency: string;
    isEarlyBird: boolean;
    packageCode: string;
    breakdown: {
      basePrice: number;
      roomSurcharge: number;
      total: number;
    };
  } | null>(null);

  // Function to calculate price based on current form data
  const calculatePrice = useCallback(async () => {
    const hotelChoice = formData.hotelChoice;
    const roomType = formData.roomType;

    // ✅ DEBUG: Log the current form data being used for pricing
    console.log("[REGISTRATION_FORM] calculatePrice called with:", {
      hotelChoice,
      roomType,
      fullFormData: formData,
    });

    // Only calculate if we have valid selections
    if (!hotelChoice || (hotelChoice === "in-quota" && !roomType)) {
      setPriceCalculation(null);
      return;
    }

    try {
      // ✅ NEW: Use Request Update pricing calculator for token-based updates
      if (isTokenUpdate && formData.registrationId) {
        console.log(
          "[REGISTRATION_FORM] Using Request Update pricing calculator for token-based update",
        );

        // Ensure roomType is null when not applicable (not in-quota)
        const normalizedRoomType = hotelChoice === "in-quota" ? roomType : null;

        console.log(
          "[REGISTRATION_FORM] Sending pricing calculation request:",
          {
            registrationId: formData.registrationId,
            hotelChoice,
            roomType: normalizedRoomType,
            originalRoomType: roomType,
          },
        );

        const response = await fetch("/api/pricing/calculate-update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            registrationId: formData.registrationId,
            hotelChoice,
            roomType: normalizedRoomType,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(
            "[REGISTRATION_FORM] Request Update pricing calculation failed:",
            errorData,
          );
          throw new Error(
            errorData.error || "Failed to calculate update price",
          );
        }

        const result = await response.json();
        console.log(
          "[REGISTRATION_FORM] Request Update pricing calculated successfully:",
          result,
        );
        setPriceCalculation(result);
        return;
      }

      // Original pricing calculation for new registrations
      const params = new URLSearchParams();
      params.append("hotelChoice", hotelChoice);
      if (roomType && hotelChoice === "in-quota") {
        params.append("roomType", roomType);
      }

      // Include original registration time for legacy token-based updates
      if (isTokenUpdate && originalRegistrationTime) {
        params.append(
          "originalRegistrationTime",
          originalRegistrationTime.toISOString(),
        );
        console.log(
          "[REGISTRATION_FORM] Using original registration time for pricing:",
          originalRegistrationTime.toISOString(),
        );
      }

      const response = await fetch(
        `/api/pricing/calculate?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error("Failed to calculate price");
      }

      const result = await response.json();
      setPriceCalculation(result);
    } catch (error) {
      console.error("Price calculation error:", error);
      setPriceCalculation(null);
    }
  }, [formData, isTokenUpdate, originalRegistrationTime]);

  // Calculate price when hotel choice or room type changes
  useEffect(() => {
    calculatePrice();
  }, [calculatePrice]);

  // Function to validate token and load registration data
  const validateTokenAndLoadData = async (
    token: string,
    _dimension: "payment" | "profile" | "tcc",
  ) => {
    setIsValidatingToken(true);
    setTokenValidationError(null);

    try {
      const response = await fetch(
        `/api/public/validate-update-token?token=${encodeURIComponent(token)}`,
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Token validation failed");
      }

      // Load registration data into form
      const registration = result.registration;
      const mergedData = { ...initialFormData };

      // CRITICAL: Set the registration ID for API calls
      mergedData.registrationId = registration.id;

      // ✅ CRITICAL FIX: Store original registration time for pricing preservation
      if (registration.created_at) {
        setOriginalRegistrationTime(new Date(registration.created_at));
        console.log(
          "[REGISTRATION_FORM] Stored original registration time:",
          registration.created_at,
        );
      }

      // Map registration data to form fields
      if (registration.first_name)
        mergedData.firstName = registration.first_name;
      if (registration.last_name) mergedData.lastName = registration.last_name;
      if (registration.nickname) mergedData.nickname = registration.nickname;
      if (registration.phone) mergedData.phone = registration.phone;
      if (registration.line_id) mergedData.lineId = registration.line_id;
      if (registration.email) mergedData.email = registration.email;
      if (registration.company_name)
        mergedData.companyName = registration.company_name;
      if (registration.business_type)
        mergedData.businessType = registration.business_type;
      if (registration.business_type_other)
        mergedData.businessTypeOther = registration.business_type_other;
      if (registration.yec_province)
        mergedData.yecProvince = registration.yec_province;
      if (registration.hotel_choice)
        mergedData.hotelChoice = registration.hotel_choice;
      if (registration.room_type) mergedData.roomType = registration.room_type;
      if (registration.roommate_info)
        mergedData.roommateInfo = registration.roommate_info;
      if (registration.roommate_phone)
        mergedData.roommatePhone = registration.roommate_phone;
      if (registration.external_hotel_name)
        mergedData.externalHotelName = registration.external_hotel_name;
      if (registration.travel_type)
        mergedData.travelType = registration.travel_type;

      // Handle file fields - preserve existing URLs from database
      if (registration.profile_image_url) {
        mergedData.profileImage = registration.profile_image_url;
        console.log(
          "Token update: Loaded profile image URL:",
          registration.profile_image_url,
        );
      }
      if (registration.chamber_card_url) {
        mergedData.chamberCard = registration.chamber_card_url;
        console.log(
          "Token update: Loaded chamber card URL:",
          registration.chamber_card_url,
        );
      }
      if (registration.payment_slip_url) {
        mergedData.paymentSlip = registration.payment_slip_url;
        console.log(
          "Token update: Loaded payment slip URL:",
          registration.payment_slip_url,
        );
      }

      // Log any missing image URLs for debugging
      if (!registration.profile_image_url) {
        console.log("Token update: No profile image URL found in database");
      }
      if (!registration.chamber_card_url) {
        console.log("Token update: No chamber card URL found in database");
      }
      if (!registration.payment_slip_url) {
        console.log("Token update: No payment slip URL found in database");
      }

      setFormData(mergedData);
      setIsEditing(true);

      // Clean up URL parameters
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("token");
      newUrl.searchParams.delete("dimension");
      window.history.replaceState({}, "", newUrl.toString());
    } catch (error) {
      console.error("Token validation error:", error);
      setTokenValidationError(
        error instanceof Error ? error.message : "Token validation failed",
      );
    } finally {
      setIsValidatingToken(false);
    }
  };

  // Function to determine if a field should be enabled based on dimension
  const isFieldEnabled = useCallback(
    (fieldId: string): boolean => {
      if (!isTokenUpdate || !updateDimension) {
        return true; // Enable all fields for normal registration
      }

      // Define field groups by dimension
      const dimensionFields = {
        payment: [
          "paymentSlip",
          // Hotel choice fields moved to payment dimension for pricing consistency
          "hotelChoice",
          "roomType",
          "roommateInfo",
          "roommatePhone",
          "externalHotelName",
          // Travel type is relevant for payment dimension as well
          "travelType",
        ],
        profile: [
          "firstName",
          "lastName",
          "nickname",
          "phone",
          "lineId",
          "email",
          "companyName",
          "businessType",
          "businessTypeOther",
          // ✅ CRITICAL: yecProvince is excluded from updates to preserve tracking system integrity
          // Province changes affect registration tracking numbers and cannot be modified via update requests
          "profileImage",
        ],
        tcc: ["chamberCard", "tccNumber", "tccHolderName"],
      };

      return dimensionFields[updateDimension]?.includes(fieldId) || false;
    },
    [isTokenUpdate, updateDimension],
  );

  // Function to calculate progress based on enabled fields in token update mode
  const calculateTokenUpdateProgress = (
    formData: FormDataType,
    _dimension: "payment" | "profile" | "tcc",
  ): number => {
    const enabledFields = formSchema.filter((field) =>
      isFieldEnabled(field.id),
    );
    return calculateFormProgress(formData, enabledFields);
  };

  // Load existing form data only in edit mode
  useEffect(() => {
    // Check URL parameters for different modes
    const urlParams = new URLSearchParams(window.location.search);
    const isEditMode = urlParams.get("edit") === "true";
    const token = urlParams.get("token");
    const dimension = urlParams.get("dimension") as
      | "payment"
      | "profile"
      | "tcc"
      | null;

    // Check if this is a token-based update
    if (token && dimension) {
      setIsTokenUpdate(true);
      setUpdateToken(token);
      setUpdateDimension(dimension);
      validateTokenAndLoadData(token, dimension);
      return;
    }

    // Clean up any stale localStorage data on fresh page loads
    if (!isEditMode) {
      localStorage.removeItem("yecRegistrationData");
    }

    if (isEditMode) {
      try {
        const storedData = sessionStorage.getItem("yecEditData");
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          if (parsedData && typeof parsedData === "object") {
            // Merge with initial data to ensure all fields exist
            const mergedData = { ...initialFormData, ...parsedData };

            // Handle file fields - preserve URLs or metadata for display
            const fileFields = ["profileImage", "chamberCard", "paymentSlip"];
            fileFields.forEach((fieldId) => {
              if (mergedData[fieldId]) {
                if (
                  typeof mergedData[fieldId] === "string" &&
                  (mergedData[fieldId].startsWith("http") ||
                    (mergedData[fieldId].includes("/") &&
                      (mergedData[fieldId].includes("profile-images") ||
                        mergedData[fieldId].includes("chamber-cards") ||
                        mergedData[fieldId].includes("payment-slips"))))
                ) {
                  // New format: URL from Supabase or file path - keep as is
                  // The FormField component will handle displaying the image
                  console.log(
                    `Edit mode: Preserving image path/URL for ${fieldId}:`,
                    mergedData[fieldId],
                  );
                } else if (
                  typeof mergedData[fieldId] === "object" &&
                  "dataUrl" in mergedData[fieldId]
                ) {
                  // Base64 format: file metadata with dataUrl - keep for display purposes
                  // The FormField component will handle showing the image
                  console.log(
                    `Edit mode: Preserving base64 data for ${fieldId}:`,
                    mergedData[fieldId],
                  );
                } else if (
                  typeof mergedData[fieldId] === "object" &&
                  "name" in mergedData[fieldId]
                ) {
                  // Old format: file metadata - keep for display purposes
                  // The FormField component will handle showing the file info
                  console.log(
                    `Edit mode: Preserving file metadata for ${fieldId}:`,
                    mergedData[fieldId],
                  );
                } else {
                  // Log and clear invalid data
                  console.warn(
                    `Edit mode: Clearing invalid data for ${fieldId}:`,
                    typeof mergedData[fieldId],
                    mergedData[fieldId],
                  );
                  mergedData[fieldId] = null;
                }
              } else {
                console.log(`Edit mode: No data for ${fieldId}`);
              }
            });

            setFormData(mergedData);
            setIsEditing(true);

            // Clean up sessionStorage after loading
            sessionStorage.removeItem("yecEditData");

            // Remove edit parameter from URL without page reload
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete("edit");
            window.history.replaceState({}, "", newUrl.toString());
          }
        }
      } catch (err) {
        console.error("Error loading stored form data:", err);
        // Continue with initial form data if there's an error
      }
    }

    // Cleanup function to clear any stale data
    return () => {
      // Clear any remaining edit data when component unmounts
      sessionStorage.removeItem("yecEditData");
    };
  }, []);

  // Validate form on data change
  useEffect(() => {
    if (isTokenUpdate && updateDimension) {
      // In token update mode, only validate enabled fields
      const enabledFields = formSchema.filter((field) =>
        isFieldEnabled(field.id),
      );
      const { errors: validationErrors } = validateForm(
        formData,
        enabledFields,
      );
      setErrors(validationErrors);
    } else {
      // In normal mode, validate all fields
      const { errors: validationErrors } = validateForm(formData, formSchema);
      setErrors(validationErrors);
    }
  }, [formData, isTokenUpdate, updateDimension, isFieldEnabled]);

  const handleFieldChange = (fieldId: string, value: any) => {
    // ✅ DEBUG: Log field changes
    console.log("[REGISTRATION_FORM] Field change:", {
      fieldId,
      value,
      currentFormData: formData,
    });

    setFormData((prev) => {
      const newData = {
        ...prev,
        [fieldId]: value,
      };

      // Clear dependent fields when hotel choice changes
      if (fieldId === "hotelChoice") {
        if (value === "out-of-quota") {
          // Clear room type and roommate fields when switching to out-of-quota
          newData.roomType = "";
          newData.roommateInfo = "";
          newData.roommatePhone = "";
        } else if (value === "in-quota") {
          // Clear external hotel name when switching to in-quota
          newData.external_hotel_name = "";
        }
      }

      // Clear roommate fields when room type changes from double to something else
      if (fieldId === "roomType" && value !== "double") {
        newData.roommateInfo = "";
        newData.roommatePhone = "";
      }

      return newData;
    });
  };

  const handleExtraFieldChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  // Function to handle token-based updates
  const handleTokenUpdate = async () => {
    try {
      // Handle file uploads first if needed
      const uploadFields = ["profileImage", "chamberCard", "paymentSlip"];
      const filesToProcess = uploadFields.filter(
        (fieldId) =>
          typeof window !== "undefined" && formData[fieldId] instanceof File,
      );

      const uploadedFiles: { [key: string]: string } = {};

      if (filesToProcess.length > 0) {
        // Upload files to Supabase first
        let processedFiles = 0;
        const totalFiles = filesToProcess.length;
        setFileProcessingProgress(0);

        const uploadPromises = filesToProcess.map(async (fieldId) => {
          const file = formData[fieldId] as File;

          try {
            // Determine folder based on field type
            let folder = "documents";
            if (fieldId === "profileImage") {
              folder = "profile-images";
            } else if (fieldId === "chamberCard") {
              folder = "chamber-cards";
            } else if (fieldId === "paymentSlip") {
              folder = "payment-slips";
            }

            // Upload file to Supabase via API route
            const formData = new FormData();
            formData.append("file", file);
            formData.append("folder", folder);

            const uploadResponse = await fetch("/api/upload-file", {
              method: "POST",
              body: formData,
            });

            if (!uploadResponse.ok) {
              const errorData = await uploadResponse.json();
              const errorMessage = errorData.error || "Failed to upload file";
              throw new Error(`${errorMessage}`);
            }

            const uploadResult = await uploadResponse.json();
            const fileUrl = uploadResult.fileUrl;
            uploadedFiles[fieldId] = fileUrl;

            processedFiles++;
            setFileProcessingProgress((processedFiles / totalFiles) * 100);

            console.log(`File ${fieldId} uploaded successfully:`, fileUrl);
          } catch (error) {
            console.error(`Error uploading file ${fieldId}:`, error);
            throw new Error(
              `Failed to upload ${fieldId}: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
          }
        });

        // Wait for all uploads to complete
        await Promise.all(uploadPromises);
      }

      // Prepare form data for API submission
      const submissionData = {
        ...formData,
        // Replace File objects with URLs
        profileImage:
          uploadedFiles.profileImage ||
          (typeof formData.profileImage === "string"
            ? formData.profileImage
            : null),
        chamberCard:
          uploadedFiles.chamberCard ||
          (typeof formData.chamberCard === "string"
            ? formData.chamberCard
            : null),
        paymentSlip:
          uploadedFiles.paymentSlip ||
          (typeof formData.paymentSlip === "string"
            ? formData.paymentSlip
            : null),
        // ✅ CRITICAL FIX: Include calculated pricing data for Early Bird preservation
        price: priceCalculation?.price || null,
        currency: priceCalculation?.currency || null,
        isEarlyBird: priceCalculation?.isEarlyBird || null,
        packageCode: priceCalculation?.packageCode || null,
        priceBreakdown: priceCalculation?.breakdown || null,
      };

      // ✅ DEBUG: Log the exact data being submitted
      console.log("[REGISTRATION_FORM] Submitting form data:", {
        registrationId: formData.registrationId,
        dimension: updateDimension,
        hotelChoice: formData.hotelChoice,
        roomType: formData.roomType,
        travelType: formData.travelType,
        // ✅ CRITICAL: Log pricing data being submitted
        pricingData: {
          price: submissionData.price,
          currency: submissionData.currency,
          isEarlyBird: submissionData.isEarlyBird,
          packageCode: submissionData.packageCode,
        },
        fullSubmissionData: submissionData,
      });

      // Submit update via API
      const response = await fetch(
        `/api/public/update-registration/${formData.registrationId || "unknown"}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: updateToken,
            dimension: updateDimension,
            formData: submissionData,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Update failed");
      }

      // Show success message and redirect
      alert(
        `Successfully updated ${updateDimension} information. Your changes are now pending review.`,
      );
      window.location.href = "/success";
    } catch (error) {
      console.error("Token update error:", error);
      alert(
        `Update failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsSubmitting(false);
      setIsProcessingFiles(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // In token update mode, only validate enabled fields
    const fieldsToValidate =
      isTokenUpdate && updateDimension
        ? formSchema.filter((field) => isFieldEnabled(field.id))
        : formSchema;

    const { isValid, errors: validationErrors } = validateForm(
      formData,
      fieldsToValidate,
    );

    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setIsProcessingFiles(true);

    try {
      // Handle token-based updates differently
      if (isTokenUpdate && updateToken && updateDimension) {
        await handleTokenUpdate();
        return;
      }
      // Handle File objects for upload fields
      const uploadFields = ["profileImage", "chamberCard", "paymentSlip"];
      const filesToProcess = uploadFields.filter(
        (fieldId) =>
          typeof window !== "undefined" && formData[fieldId] instanceof File,
      );

      if (filesToProcess.length === 0) {
        // No new files to upload, save data immediately
        const minimalData = {
          ...formData,
          // Keep existing URLs or metadata, remove any File objects
          profileImage:
            typeof formData.profileImage === "string"
              ? formData.profileImage
              : formData.profileImage?.dataUrl
                ? formData.profileImage
                : null,
          chamberCard:
            typeof formData.chamberCard === "string"
              ? formData.chamberCard
              : formData.chamberCard?.dataUrl
                ? formData.chamberCard
                : null,
          paymentSlip:
            typeof formData.paymentSlip === "string"
              ? formData.paymentSlip
              : formData.paymentSlip?.dataUrl
                ? formData.paymentSlip
                : null,
        };
        localStorage.setItem(
          "yecRegistrationData",
          JSON.stringify(minimalData),
        );
        window.location.href = "/preview";
        return;
      }

      // Upload files to Supabase first
      let processedFiles = 0;
      const totalFiles = filesToProcess.length;
      setFileProcessingProgress(0);

      const uploadedFiles: { [key: string]: string } = {};
      const uploadPromises = filesToProcess.map(async (fieldId) => {
        const file = formData[fieldId] as File;

        try {
          // Determine folder based on field type
          let folder = "documents";
          if (fieldId === "profileImage") {
            folder = "profile-images";
          } else if (fieldId === "chamberCard") {
            folder = "chamber-cards";
          } else if (fieldId === "paymentSlip") {
            folder = "payment-slips";
          }

          // Upload file to Supabase via API route
          const formData = new FormData();
          formData.append("file", file);
          formData.append("folder", folder);

          const uploadResponse = await fetch("/api/upload-file", {
            method: "POST",
            body: formData,
          });

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            const errorMessage = errorData.error || "Failed to upload file";
            const errorDetails = errorData.details
              ? ` (${errorData.details})`
              : "";
            console.error(`Upload failed for ${fieldId}:`, {
              status: uploadResponse.status,
              statusText: uploadResponse.statusText,
              error: errorMessage,
              details: errorData.details,
              response: errorData,
            });
            throw new Error(`${errorMessage}${errorDetails}`);
          }

          const uploadResult = await uploadResponse.json();
          const fileUrl = uploadResult.fileUrl;
          uploadedFiles[fieldId] = fileUrl;

          processedFiles++;
          setFileProcessingProgress((processedFiles / totalFiles) * 100);

          console.log(`File ${fieldId} uploaded successfully:`, fileUrl);
        } catch (error) {
          console.error(`Error uploading file ${fieldId}:`, error);
          throw new Error(
            `Failed to upload ${fieldId}: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      });

      // Wait for all uploads to complete
      await Promise.all(uploadPromises);

      // Create minimal data object with file URLs instead of File objects
      const minimalData = {
        ...formData,
        // Replace File objects with URLs, preserve existing URLs or metadata
        profileImage:
          uploadedFiles.profileImage ||
          (typeof formData.profileImage === "string"
            ? formData.profileImage
            : formData.profileImage?.dataUrl
              ? formData.profileImage
              : null),
        chamberCard:
          uploadedFiles.chamberCard ||
          (typeof formData.chamberCard === "string"
            ? formData.chamberCard
            : formData.chamberCard?.dataUrl
              ? formData.chamberCard
              : null),
        paymentSlip:
          uploadedFiles.paymentSlip ||
          (typeof formData.paymentSlip === "string"
            ? formData.paymentSlip
            : formData.paymentSlip?.dataUrl
              ? formData.paymentSlip
              : null),
      };

      // Store minimal data in localStorage
      localStorage.setItem("yecRegistrationData", JSON.stringify(minimalData));

      setIsProcessingFiles(false);
      window.location.href = "/preview";
    } catch (err) {
      console.error("Error processing form data:", err);
      // Replace alert with console.error for better error handling
      console.error("เกิดข้อผิดพลาดในการอัปโหลดไฟล์ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);
      setIsProcessingFiles(false);
    }
  };

  const isFormValid = Object.keys(errors).length === 0;

  return (
    <section id="form" className="py-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-blue-900 mb-4">
            {isTokenUpdate
              ? `อัปเดตข้อมูล ${updateDimension}`
              : "ลงทะเบียน YEC Day"}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {isTokenUpdate
              ? `กรุณาอัปเดตข้อมูลในส่วน ${updateDimension} ตามที่ทีมงานร้องขอ`
              : "กรุณากรอกข้อมูลให้ครบถ้วนเพื่อลงทะเบียนเข้าร่วมงาน YEC Day"}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-lg p-8"
        >
          {/* Token validation loading */}
          {isValidatingToken && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
                <p className="text-sm text-yellow-800">
                  กำลังตรวจสอบลิงก์อัปเดต...
                </p>
              </div>
            </div>
          )}

          {/* Token validation error */}
          {tokenValidationError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <svg
                  className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800 mb-1">
                    ไม่สามารถเข้าถึงลิงก์อัปเดตได้
                  </h3>
                  <p className="text-sm text-red-700">{tokenValidationError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Token update mode notification */}
          {isTokenUpdate && !isValidatingToken && !tokenValidationError && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <svg
                  className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-green-800 mb-1">
                    โหมดอัปเดตข้อมูล
                  </h3>
                  <p className="text-sm text-green-700">
                    คุณสามารถแก้ไขเฉพาะข้อมูลในส่วน {updateDimension} เท่านั้น
                    ข้อมูลอื่นๆ จะไม่เปลี่ยนแปลง
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Edit mode notification */}
          {isEditing && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <svg
                  className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-blue-800 mb-1">
                    กำลังแก้ไขข้อมูล
                  </h3>
                  <p className="text-sm text-blue-700">
                    ข้อมูลของคุณถูกโหลดแล้ว
                    ไฟล์รูปภาพที่อัปโหลดไว้จะแสดงด้านล่าง
                    กรุณาอัปโหลดใหม่หากต้องการเปลี่ยน
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Schema Loading and Error States */}
          {isSchemaLoading && (
            <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  กำลังโหลดตัวเลือกโรงแรม...
                </p>
              </div>
            </div>
          )}

          {schemaError && (
            <div className="mb-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start space-x-2">
                <div className="text-yellow-600 dark:text-yellow-400 mt-0.5">
                  ⚠️
                </div>
                <div className="text-sm">
                  <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                    ไม่สามารถโหลดตัวเลือกโรงแรมได้
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    กำลังแสดงตัวเลือกทั้งหมด กรุณาลองใหม่อีกครั้ง
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Render all fields except paymentSlip first */}
          {(() => {
            const otherFields = dynamicFormSchema.filter(
              (f) => f.id !== "paymentSlip",
            );
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {otherFields.map((field) => {
                  // Check if field should be shown based on dependencies
                  if (
                    field.dependsOn &&
                    formData[field.dependsOn.field] !== field.dependsOn.value
                  ) {
                    return null;
                  }

                  // Check if field is hidden due to pricing configuration
                  if ((field as any).hidden) {
                    return null;
                  }

                  // Check if field should be enabled based on dimension
                  const isEnabled = isFieldEnabled(field.id);
                  if (!isEnabled) {
                    return null; // Hide disabled fields completely
                  }

                  return (
                    <div
                      key={field.id}
                      className={field.type === "upload" ? "md:col-span-2" : ""}
                    >
                      <FormField
                        field={field}
                        value={formData[field.id]}
                        onChange={(value) => handleFieldChange(field.id, value)}
                        formData={formData}
                        onExtraFieldChange={handleExtraFieldChange}
                        disabled={!isEnabled}
                      />

                      {/* Render roommate phone field separately for better layout */}
                      {field.id === "roomType" &&
                        shouldShowExtraField(field, formData) &&
                        field.roommatePhoneField && (
                          <div className="mt-4 pl-4 border-l-2 border-blue-200">
                            <FormField
                              field={{
                                ...field.roommatePhoneField,
                                required:
                                  field.roommatePhoneField.required ?? true,
                              }}
                              value={formData[field.roommatePhoneField.id]}
                              onChange={(value) =>
                                handleExtraFieldChange(
                                  field.roommatePhoneField!.id,
                                  value,
                                )
                              }
                              formData={formData}
                              onExtraFieldChange={handleExtraFieldChange}
                            />
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Price Display Card - only for normal flow or payment dimension in token-update */}
          {priceCalculation &&
            (!isTokenUpdate || updateDimension === "payment") && (
              <div className="mt-8">
                {/* Use Request Update pricing display for token-based updates */}
                {isTokenUpdate ? (
                  <RequestUpdatePricingDisplay
                    priceCalculation={priceCalculation}
                    isLoading={false}
                  />
                ) : (
                  <PriceDisplayCard
                    hotelChoice={formData.hotelChoice}
                    roomType={formData.roomType}
                    isEarlyBird={priceCalculation.isEarlyBird}
                    breakdown={priceCalculation.breakdown}
                    currency={priceCalculation.currency}
                  />
                )}
              </div>
            )}

          {/* Payment account details (between pricing and payment slip upload) - only for payment dimension */}
          {(!isTokenUpdate || updateDimension === "payment") &&
            formData.hotelChoice && (
              <div className="mt-8">
                <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-2xl p-5 shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
                        ฿
                      </span>
                      <h3 className="text-base md:text-lg font-bold tracking-tight text-blue-900">
                        รายละเอียดการชำระเงิน
                      </h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-5 items-center">
                    {/* Left: details with copy actions */}
                    <div className="space-y-3 text-[15px] md:text-base text-gray-800 leading-6">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-gray-500">ธนาคาร</div>
                          <div className="font-semibold">กสิกรไทย</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-gray-500">เลขที่บัญชี</div>
                          <div className="font-mono tracking-wide text-lg md:text-xl">
                            213-3-51978-8
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(
                                "213-3-51978-8",
                              );
                              setCopiedKey("acct");
                              setTimeout(() => setCopiedKey(null), 1200);
                            } catch {}
                          }}
                          className="px-3 py-1.5 text-xs md:text-sm rounded-md bg-blue-600/10 text-blue-700 border border-blue-200 hover:bg-blue-600/15"
                        >
                          {copiedKey === "acct" ? "คัดลอกแล้ว" : "คัดลอก"}
                        </button>
                      </div>
                      <div>
                        <div className="text-gray-500">ชื่อบัญชี</div>
                        <div className="text-[14px] md:text-[15px] leading-6">
                          น.ส. ปภัสราภรณ์ ตันธนวงศ์ และ น.ส. สุจินดา
                          ปัญญาคุ้มวงศ์ และ น.ส. ธรรวศร ฐานมั่นคงธนิต
                        </div>
                      </div>
                    </div>

                    {/* Right: compact QR thumbnail */}
                    <div className="flex flex-col items-center gap-2">
                      <Image
                        src="/assets/PAYMENT_ACCOUNT.jpg"
                        alt="สแกน QR เพื่อชำระเงิน"
                        width={320}
                        height={200}
                        sizes="(max-width: 768px) 240px, 320px"
                        className="max-h-44 md:max-h-48 w-auto object-contain rounded-lg border border-gray-200 shadow"
                        priority={false}
                      />
                      <button
                        type="button"
                        onClick={() => setQrPreviewOpen(true)}
                        className="text-xs md:text-sm text-blue-700 hover:underline"
                      >
                        ดูภาพใหญ่
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* QR Preview Modal */}
          {qrPreviewOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black/60"
                onClick={() => setQrPreviewOpen(false)}
              />
              <div className="relative bg-white rounded-xl p-3 shadow-2xl max-w-[90vw]">
                <button
                  type="button"
                  onClick={() => setQrPreviewOpen(false)}
                  className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white shadow border border-gray-200 text-gray-600"
                >
                  ×
                </button>
                <Image
                  src="/assets/PAYMENT_ACCOUNT.jpg"
                  alt="ข้อมูลบัญชีสำหรับชำระเงิน"
                  width={1200}
                  height={1600}
                  sizes="90vw"
                  className="max-h-[80vh] w-auto object-contain rounded-md"
                  priority
                />
              </div>
            </div>
          )}

          {/* Deferred payment slip upload field rendered after account details */}
          {(() => {
            const paymentSlipField = dynamicFormSchema.find(
              (f) => f.id === "paymentSlip",
            );
            if (!paymentSlipField) return null;
            const isEnabled = isFieldEnabled(paymentSlipField.id);
            if (!isEnabled) return null;
            return (
              <div className="mt-8 md:col-span-2">
                <FormField
                  field={paymentSlipField}
                  value={formData[paymentSlipField.id]}
                  onChange={(value) =>
                    handleFieldChange(paymentSlipField.id, value)
                  }
                  formData={formData}
                  onExtraFieldChange={handleExtraFieldChange}
                  disabled={!isEnabled}
                />
              </div>
            );
          })()}

          {/* Submit Button - Enhanced */}
          <div className="mt-8 text-center">
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className={`group relative px-10 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform min-h-[56px] min-w-[220px] ${
                isFormValid && !isSubmitting
                  ? "bg-gradient-to-r from-yec-primary to-yec-accent hover:from-yec-accent hover:to-yec-primary text-white hover:scale-105 shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0 active:shadow-md focus:outline-none focus:ring-4 focus:ring-yec-accent/30 focus:ring-offset-2"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed shadow-md"
              }`}
            >
              {/* Button Background Animation */}
              {isFormValid && !isSubmitting && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              )}

              {/* Button Content */}
              <div className="relative flex items-center justify-center space-x-2">
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>
                      {isProcessingFiles
                        ? "กำลังประมวลผลไฟล์..."
                        : "กำลังส่งข้อมูล..."}
                    </span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 text-white group-hover:scale-110 transition-transform duration-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                    <span>
                      {isTokenUpdate ? "อัปเดตข้อมูล" : "ส่งข้อมูลการลงทะเบียน"}
                    </span>
                  </>
                )}
              </div>

              {/* Hover Effect */}
              {isFormValid && !isSubmitting && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              )}
            </button>

            {/* Status Messages */}
            <div className="mt-4 space-y-2">
              {!isFormValid && (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center justify-center space-x-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  <span>กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง</span>
                </p>
              )}
              {isSubmitting && (
                <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center justify-center space-x-1">
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>กำลังประมวลผลข้อมูล กรุณารอสักครู่...</span>
                </p>
              )}
            </div>
          </div>

          {/* Form Progress Indicator */}
          <div className="mt-8">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>ความคืบหน้า</span>
              <span>
                {isTokenUpdate && updateDimension
                  ? calculateTokenUpdateProgress(formData, updateDimension)
                  : calculateFormProgress(formData, formSchema)}
                %
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    isTokenUpdate && updateDimension
                      ? calculateTokenUpdateProgress(formData, updateDimension)
                      : calculateFormProgress(formData, formSchema)
                  }%`,
                }}
              ></div>
            </div>
          </div>

          {/* File Processing Progress */}
          {isProcessingFiles && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>กำลังประมวลผลไฟล์</span>
                <span>{Math.round(fileProcessingProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${fileProcessingProgress}%`,
                  }}
                ></div>
              </div>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
