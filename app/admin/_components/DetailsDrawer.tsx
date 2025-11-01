"use client";

import { useState, useMemo, useEffect } from "react";
import {
  X,
  Calendar,
  Globe,
  User,
  Phone,
  Mail,
  Building,
  MapPin,
  CreditCard,
  AlertTriangle,
  Clock,
  Shield,
  Star,
  Award,
  Camera,
  ChevronRight,
  FileText,
} from "lucide-react";
import StatusBadge from "./StatusBadge";
import StatusBadges from "./StatusBadges";
import DimensionActionButtons from "./DimensionActionButtons";
import ActionButtons from "./ActionButtons";
import FileCard from "./FileCard";
import LightboxModal from "./LightboxModal";
import PackageInfoCard from "./PackageInfoCard";
import PaymentIntelligencePanel from "./PaymentIntelligencePanel";
import type { Registration } from "../../types/database";
import { formatDate } from "../../lib/datetime";
import { useUserPermissions } from "../../lib/rbac-client";
import { isTerminalState } from "../../lib/registration-utils";

interface DetailsDrawerProps {
  registration: Registration | null;
  isOpen: boolean;
  onClose: () => void;
  onActionComplete?: (registrationId: string, newStatus: string) => void;
}

type TabType = "review" | "audit";

export default function DetailsDrawer({
  registration,
  isOpen,
  onClose,
  onActionComplete,
}: DetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>("review");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxSignedUrls, setLightboxSignedUrls] = useState<
    Record<string, string>
  >({});
  const { permissions } = useUserPermissions();

  // Prepare images for lightbox
  const lightboxImages = useMemo(() => {
    if (!registration) return [];

    const images = [];

    if (registration.profile_image_url) {
      images.push({
        url: registration.profile_image_url,
        label: "Profile Image",
        type: "image" as const,
      });
    }

    if (registration.chamber_card_url) {
      images.push({
        url: registration.chamber_card_url,
        label: "Chamber Card (TCC)",
        type: registration.chamber_card_url.toLowerCase().includes(".pdf")
          ? ("pdf" as const)
          : ("document" as const),
      });
    }

    if (registration.payment_slip_url) {
      images.push({
        url: registration.payment_slip_url,
        label: "Payment Slip",
        type: "image" as const,
      });
    }

    if (registration.status === "approved" && registration.badge_url) {
      images.push({
        url: registration.badge_url,
        label: "Badge",
        type: "image" as const,
      });
    }

    return images;
  }, [registration]);

  // Fetch signed URLs for lightbox images
  useEffect(() => {
    if (!registration || lightboxImages.length === 0) return;

    const fetchSignedUrls = async () => {
      const newSignedUrls: Record<string, string> = {};

      for (const image of lightboxImages) {
        if (image.url && !lightboxSignedUrls[image.url]) {
          try {
            const response = await fetch("/api/admin/files/signed-url", {
              method: "POST",
              credentials: "same-origin",
              headers: {
                "content-type": "application/json",
              },
              body: JSON.stringify({
                registrationId: registration.id,
                path: image.url,
                expires: 900,
              }),
            });

            if (response.ok) {
              const data = await response.json();
              newSignedUrls[image.url] = data.url;
            }
          } catch (error) {
            console.warn(
              "[DetailsDrawer] Failed to fetch signed URL for:",
              image.url,
              error,
            );
          }
        }
      }

      if (Object.keys(newSignedUrls).length > 0) {
        setLightboxSignedUrls((prev) => ({ ...prev, ...newSignedUrls }));
      }
    };

    fetchSignedUrls();
  }, [registration, lightboxImages, lightboxSignedUrls]);

  // Create lightbox images with signed URLs
  const lightboxImagesWithSignedUrls = useMemo(() => {
    return lightboxImages.map((image) => ({
      ...image,
      url: lightboxSignedUrls[image.url] || image.url,
    }));
  }, [lightboxImages, lightboxSignedUrls]);

  if (!registration) return null;

  const formatDateDisplay = (dateString: string) => {
    return formatDate(dateString, true);
  };

  const formatJson = (data: any) => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const getStatusBadgeStatus = (status: Registration["status"]) => {
    switch (status) {
      case "waiting_for_review":
        return "waiting_for_review" as const;
      case "approved":
        return "approved" as const;
      case "rejected":
        return "rejected" as const;
      default:
        return "pending" as const;
    }
  };

  const handleFileClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const tabs = [
    { id: "review", label: "Review", icon: Shield },
    { id: "audit", label: "Audit", icon: Calendar },
  ];

  // Helper function to get dimension status
  const getDimensionStatus = (dimension: "payment" | "profile" | "tcc") => {
    const checklist = registration.review_checklist;
    if (!checklist) return "pending";
    return checklist[dimension]?.status || "pending";
  };

  // Helper function to get dimension status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "passed":
        return "text-emerald-600 bg-emerald-50/80 border-emerald-200/60";
      case "needs_update":
        return "text-amber-600 bg-amber-50/80 border-amber-200/60";
      case "rejected":
        return "text-red-600 bg-red-50/80 border-red-200/60";
      default:
        return "text-slate-600 bg-slate-50/80 border-slate-200/60";
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        data-testid="drawer-root"
        className={`fixed top-0 right-0 h-full w-[980px] max-w-[98vw] bg-white dark:bg-gray-900 shadow-2xl z-50 transform transition-all duration-500 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } border-l-2 border-blue-200 dark:border-blue-900/40`}
      >
        {/* Header */}
        <div className="h-20 bg-gradient-to-r from-[#2246d2] via-[#3457e6] to-[#4f80ff] text-white dark:text-white border-b-0 flex items-center justify-between px-6 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-xl shadow-sm">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-extrabold tracking-tight">
                Registration Details
              </h2>
              <span
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white shadow-sm ring-1 ring-white/20 backdrop-blur-sm text-sm font-semibold"
                title="Registration reference"
              >
                <span className="opacity-90">Ref</span>
                <span className="font-mono tracking-wider">
                  {registration.registration_id}
                </span>
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gradient-to-b from-[#f4f7ff] to-white dark:from-gray-900 dark:to-gray-900 border-b-2 border-blue-200/60 dark:border-blue-900/40">
          <div className="flex space-x-1 px-6 py-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center space-x-2 px-5 py-2 rounded-full font-semibold transition-all shadow-sm ${
                    isActive
                      ? "bg-white text-[#2246d2] ring-1 ring-blue-200"
                      : "text-gray-600 dark:text-gray-300 hover:text-[#2246d2] hover:bg-white/60"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col h-[calc(100vh-140px)]">
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[920px] px-6 py-4">
              {activeTab === "review" && (
                <>
                  {/* Overall Status Header */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border-2 border-blue-200/80 dark:border-blue-900/50 mb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-500" />
                          Review Status
                        </h3>
                        <StatusBadge
                          status={getStatusBadgeStatus(registration.status)}
                        />
                        {/* Removed top-line rejected reason chip per UX */}
                        {isTerminalState(registration) && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                            Read-only
                          </span>
                        )}
                      </div>

                      {/* Status Badges */}
                      <StatusBadges registration={registration} />
                    </div>

                    {/* Global Approve / Reject (Super Admin only via RBAC inside component) */}
                    <div className="mt-2">
                      <ActionButtons
                        registration={registration}
                        onActionComplete={onActionComplete}
                      />
                    </div>

                    {registration.status === "rejected" &&
                    registration.rejected_reason ? (
                      <div className="flex items-center gap-2 p-2 bg-red-50/80 dark:bg-red-900/20 rounded-lg border border-red-200/60 dark:border-red-800/60 mt-3">
                        <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400" />
                        <span className="text-xs text-red-800 dark:text-red-200">
                          {registration.rejected_reason}
                        </span>
                      </div>
                    ) : (
                      registration.update_reason && (
                        <div className="flex items-center gap-2 p-2 bg-yellow-50/80 dark:bg-yellow-900/20 rounded-lg border border-yellow-200/60 dark:border-yellow-800/60 mt-3">
                          <AlertTriangle className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                          <span className="text-xs text-yellow-800 dark:text-yellow-200">
                            Update Required:{" "}
                            {registration.update_reason.replace("_", " ")}
                          </span>
                        </div>
                      )
                    )}
                  </div>

                  {/* Payment Section */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border-2 border-blue-200/80 dark:border-blue-900/50 mb-3">
                    <div className="grid grid-cols-[1fr_320px] gap-6">
                      {/* Left Column - Content */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1 bg-blue-100/80 dark:bg-blue-900/30 rounded-lg">
                            <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                              Payment Verification
                            </h3>
                            <div
                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(getDimensionStatus("payment"))}`}
                            >
                              <span>
                                {getDimensionStatus("payment").replace(
                                  "_",
                                  " ",
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Payment Slip
                            </span>
                          </div>
                          <div className="flex justify-center">
                            <FileCard
                              registrationId={String(registration.id)}
                              path={registration.payment_slip_url}
                              label="Payment Slip"
                              onClick={() => handleFileClick(2)}
                              className="h-48 w-64 rounded-lg shadow-sm"
                            />
                          </div>

                          {/* Travel Type - moved from profile to payment dimension */}
                          <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <Globe className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Travel Type
                              </p>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                                {registration.travel_type.replace("-", " ")}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column - Actions + Intelligence */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Actions
                        </h4>
                        <DimensionActionButtons
                          registration={registration}
                          dimension="payment"
                          onActionComplete={onActionComplete}
                        />

                        {/* Package Information Card - Underneath Actions */}
                        <div className="mt-4">
                          <PackageInfoCard registration={registration} />
                        </div>

                        {/* Intelligence Audit Panel */}
                        <div className="mt-2">
                          <PaymentIntelligencePanel
                            applicationId={String(registration.registration_id)}
                            expectedAmount={Number(
                              typeof (registration as any).price_applied ===
                                "string"
                                ? parseFloat(
                                    (registration as any).price_applied,
                                  )
                                : (registration as any).price_applied || 0,
                            )}
                            slipPath={registration.payment_slip_url}
                            analysis={null}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TCC Section */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border-2 border-blue-200/80 dark:border-blue-900/50 mb-3">
                    <div className="grid grid-cols-[1fr_280px] gap-6">
                      {/* Left Column - Content */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1 bg-purple-100/80 dark:bg-purple-900/30 rounded-lg">
                            <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                              Chamber Card (TCC)
                            </h3>
                            <div
                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(getDimensionStatus("tcc"))}`}
                            >
                              <span>
                                {getDimensionStatus("tcc").replace("_", " ")}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Chamber Card Document
                            </span>
                          </div>
                          <div className="flex justify-center">
                            <FileCard
                              registrationId={String(registration.id)}
                              path={registration.chamber_card_url}
                              label="Chamber Card (TCC)"
                              onClick={() => handleFileClick(1)}
                              className="h-44 w-44 rounded-lg shadow-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right Column - Actions */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Actions
                        </h4>
                        <DimensionActionButtons
                          registration={registration}
                          dimension="tcc"
                          onActionComplete={onActionComplete}
                        />
                      </div>
                    </div>
                  </div>

                  {/* User Info Group */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700 mb-3">
                    <div className="grid grid-cols-[1fr_280px] gap-6">
                      {/* Left Column - Content */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1 bg-green-100/80 dark:bg-green-900/30 rounded-lg">
                            <User className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                              User Information
                            </h3>
                            <div
                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(getDimensionStatus("profile"))}`}
                            >
                              <span>
                                {getDimensionStatus("profile").replace(
                                  "_",
                                  " ",
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {/* Profile Image Section */}
                          {registration.profile_image_url && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Camera className="h-3 w-3 text-pink-600 dark:text-pink-400" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Profile Image
                                </span>
                              </div>
                              <div className="flex justify-center">
                                <FileCard
                                  registrationId={String(registration.id)}
                                  path={registration.profile_image_url}
                                  label="Profile Image"
                                  onClick={() => handleFileClick(0)}
                                  className="h-44 w-44 rounded-lg shadow-sm"
                                />
                              </div>
                            </div>
                          )}

                          {/* Profile Information Section */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <User className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Personal Details
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <User className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Full Name
                                  </p>
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {registration.title}{" "}
                                    {registration.first_name}{" "}
                                    {registration.last_name}
                                  </p>
                                </div>
                              </div>

                              {registration.nickname && (
                                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                  <Award className="h-3 w-3 text-green-600 dark:text-green-400" />
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      Nickname
                                    </p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                      {registration.nickname}
                                    </p>
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <Mail className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Email
                                  </p>
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {registration.email}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <Phone className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Phone
                                  </p>
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {registration.phone}
                                  </p>
                                </div>
                              </div>

                              {registration.line_id && (
                                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                  <Globe className="h-3 w-3 text-green-600 dark:text-green-400" />
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      Line ID
                                    </p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                      {registration.line_id}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Business Information Section */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Building className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Business Information
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <Building className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Company
                                  </p>
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {registration.company_name}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <CreditCard className="h-3 w-3 text-teal-600 dark:text-teal-400" />
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Business Type
                                  </p>
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {registration.business_type}
                                    {registration.business_type_other &&
                                      ` - ${registration.business_type_other}`}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <MapPin className="h-3 w-3 text-pink-600 dark:text-pink-400" />
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Province
                                  </p>
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {registration.yec_province}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column - Actions */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Actions
                        </h4>
                        <DimensionActionButtons
                          registration={registration}
                          dimension="profile"
                          onActionComplete={onActionComplete}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Badge Section (if approved) */}
                  {registration.status === "approved" &&
                    registration.badge_url && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border-2 border-blue-200/80 dark:border-blue-900/50">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1 bg-yellow-100/80 dark:bg-yellow-900/30 rounded-lg">
                            <Award className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                          </div>
                          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                            Generated Badge
                          </h3>
                        </div>

                        <div className="flex justify-center">
                          <FileCard
                            registrationId={String(registration.id)}
                            path={registration.badge_url}
                            label="Badge"
                            onClick={() => handleFileClick(3)}
                            className="h-64 w-96 rounded-lg shadow-sm"
                          />
                        </div>
                      </div>
                    )}
                </>
              )}

              {activeTab === "audit" && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border-2 border-blue-200/80 dark:border-blue-900/50">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
                    <Calendar className="h-4 w-4 text-indigo-500" />
                    Audit Information
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="p-1 bg-indigo-100/80 dark:bg-indigo-900/30 rounded-lg">
                          <Calendar className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Created At
                          </p>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {formatDateDisplay(registration.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="p-1 bg-green-100/80 dark:bg-green-900/30 rounded-lg">
                          <Clock className="h-3 w-3 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Updated At
                          </p>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {formatDateDisplay(registration.updated_at)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {registration.ip_address && (
                        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="p-1 bg-orange-100/80 dark:bg-orange-900/30 rounded-lg">
                            <Globe className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              IP Address
                            </p>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {registration.ip_address}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="p-1 bg-purple-100/80 dark:bg-purple-900/30 rounded-lg">
                          <Mail className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Email Sent
                          </p>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {registration.email_sent ? "Yes" : "No"}
                            {registration.email_sent_at && (
                              <span className="block text-xs text-gray-500">
                                {formatDateDisplay(registration.email_sent_at)}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Raw JSON (super_admin only) */}
                  {permissions.canApprove && registration.form_data && (
                    <div className="mt-4">
                      <details className="group">
                        <summary className="cursor-pointer text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors flex items-center gap-2">
                          <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform" />
                          Raw JSON (advanced)
                        </summary>
                        <div className="mt-3">
                          <pre className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-xs text-gray-900 dark:text-gray-100 overflow-x-auto border border-gray-200 dark:border-gray-600">
                            <code>{formatJson(registration.form_data)}</code>
                          </pre>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-yec-primary text-white flex-shrink-0">
            <div className="px-6 py-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                {/* Logo and basic info */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-bold text-white">YEC</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">YEC Day 2025</h4>
                    <p className="text-xs text-gray-300">
                      Young Entrepreneurs Chamber
                    </p>
                  </div>
                </div>

                {/* Contact info */}
                <div className="text-center md:text-right">
                  <p className="text-xs text-gray-300">
                    <span className="font-medium">Email:</span>{" "}
                    yecsongkhla.official@gmail.com
                  </p>
                  <p className="text-xs text-gray-300">
                    <span className="font-medium">Phone:</span> 074 246 388
                  </p>
                </div>
              </div>

              {/* Copyright */}
              <div className="border-t border-gray-700 mt-5 pt-5 text-center">
                <p className="text-xs text-gray-300 leading-relaxed">
                  © 2025 YEC Day. All rights reserved. | Power By: Mr. Pisut
                  Khungkamano
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      <LightboxModal
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={lightboxImagesWithSignedUrls}
        currentIndex={lightboxIndex}
        onIndexChange={setLightboxIndex}
      />
    </>
  );
}
