"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Loader2, Upload, CheckCircle, XCircle } from "lucide-react";

interface UpdateFormData {
  first_name?: string;
  last_name?: string;
  nickname?: string;
  phone?: string;
  line_id?: string;
  email?: string;
  company_name?: string;
  business_type?: string;
  business_type_other?: string;
  yec_province?: string;
  profile_image?: File | null;
  payment_slip?: File | null;
  chamber_card?: File | null;
}

interface TokenValidation {
  success: boolean;
  registration_id: string;
  dimension: string;
  admin_email: string;
  notes: string;
  message: string;
}

function UpdateForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [tokenValidation, setTokenValidation] =
    useState<TokenValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<UpdateFormData>({});
  const [fileUploads, setFileUploads] = useState<{
    profile_image?: File;
    payment_slip?: File;
    chamber_card?: File;
  }>({});

  const validateToken = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/registrations/validate-token?token=${token}`,
      );
      const data = await response.json();

      if (response.ok) {
        setTokenValidation(data);
        // Pre-fill form data if available
        if (data.registration) {
          setFormData({
            first_name: data.registration.first_name || "",
            last_name: data.registration.last_name || "",
            nickname: data.registration.nickname || "",
            phone: data.registration.phone || "",
            line_id: data.registration.line_id || "",
            email: data.registration.email || "",
            company_name: data.registration.company_name || "",
            business_type: data.registration.business_type || "",
            business_type_other: data.registration.business_type_other || "",
            yec_province: data.registration.yec_province || "",
          });
        }
      } else {
        setError(data.message || "Invalid or expired token");
      }
    } catch {
      setError("Failed to validate token. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setError(
        "Missing update token. Please use the link provided in your email.",
      );
      setLoading(false);
      return;
    }

    validateToken();
  }, [token, validateToken]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (field: string, file: File | null) => {
    setFileUploads((prev) => ({ ...prev, [field]: file || undefined }));
  };

  const handleInputChangeEvent =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      handleInputChange(field, e.target.value);
    };

  const handleFileChangeEvent =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFileChange(field, e.target.files?.[0] || null);
    };

  const getDimensionDisplayName = (dimension: string) => {
    switch (dimension) {
      case "payment":
        return "Payment Information";
      case "profile":
        return "Profile Information";
      case "tcc":
        return "Chamber of Commerce Card";
      default:
        return dimension;
    }
  };

  const getDimensionDescription = (dimension: string) => {
    switch (dimension) {
      case "payment":
        return "Please provide a clear payment slip or receipt for your registration fee.";
      case "profile":
        return "Please update your profile information as requested by our review team.";
      case "tcc":
        return "Please provide a valid Chamber of Commerce membership card.";
      default:
        return "Please provide the requested information.";
    }
  };

  const getFileRequirements = (dimension: string) => {
    switch (dimension) {
      case "payment":
        return "Payment slip (JPEG, PNG, PDF - max 5MB)";
      case "profile":
        return "Profile image (JPEG, PNG - max 2MB)";
      case "tcc":
        return "Chamber card (JPEG, PNG, PDF - max 5MB)";
      default:
        return "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const submitData = new FormData();

      // Add file uploads
      if (fileUploads.profile_image) {
        submitData.append("profile_image", fileUploads.profile_image);
      }
      if (fileUploads.payment_slip) {
        submitData.append("payment_slip", fileUploads.payment_slip);
      }
      if (fileUploads.chamber_card) {
        submitData.append("chamber_card", fileUploads.chamber_card);
      }

      // Add text fields for profile updates
      if (tokenValidation?.dimension === "profile") {
        Object.entries(formData).forEach(([key, value]) => {
          if (value) {
            submitData.append(key, value);
          }
        });
      }

      const response = await fetch("/api/registrations/update", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: submitData,
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.message || "Failed to submit update");
      }
    } catch {
      setError("Failed to submit update. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Validating your update request...</p>
        </div>
      </div>
    );
  }

  if (error && !tokenValidation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">
              <XCircle className="h-8 w-8 mx-auto mb-2" />
              Update Request Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Please contact support if you believe this is an error.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-green-600">
              <CheckCircle className="h-8 w-8 mx-auto mb-2" />
              Update Submitted Successfully
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              Your{" "}
              {getDimensionDisplayName(
                tokenValidation?.dimension || "",
              ).toLowerCase()}{" "}
              has been updated successfully.
            </p>
            <p className="text-sm text-gray-500">
              Your registration is now back under review. You will be notified
              once the review is complete.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tokenValidation) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold text-gray-800">
              Update Your Registration
            </CardTitle>
            <p className="text-center text-gray-600">
              {getDimensionDisplayName(tokenValidation.dimension)}
            </p>
          </CardHeader>
          <CardContent>
            {tokenValidation.notes && (
              <Alert className="mb-6">
                <AlertDescription>
                  <strong>Admin Notes:</strong> {tokenValidation.notes}
                </AlertDescription>
              </Alert>
            )}

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">
                What needs to be updated:
              </h3>
              <p className="text-gray-600">
                {getDimensionDescription(tokenValidation.dimension)}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {tokenValidation.dimension === "profile" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name || ""}
                        onChange={handleInputChangeEvent("first_name")}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name || ""}
                        onChange={handleInputChangeEvent("last_name")}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="nickname">Nickname</Label>
                    <Input
                      id="nickname"
                      value={formData.nickname || ""}
                      onChange={handleInputChangeEvent("nickname")}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        value={formData.phone || ""}
                        onChange={handleInputChangeEvent("phone")}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="line_id">Line ID</Label>
                      <Input
                        id="line_id"
                        value={formData.line_id || ""}
                        onChange={handleInputChangeEvent("line_id")}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ""}
                      onChange={handleInputChangeEvent("email")}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="company_name">Company Name *</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name || ""}
                      onChange={handleInputChangeEvent("company_name")}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="business_type">Business Type *</Label>
                      <Input
                        id="business_type"
                        value={formData.business_type || ""}
                        onChange={handleInputChangeEvent("business_type")}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="yec_province">YEC Province *</Label>
                      <Input
                        id="yec_province"
                        value={formData.yec_province || ""}
                        onChange={handleInputChangeEvent("yec_province")}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="business_type_other">
                      Other Business Type
                    </Label>
                    <Input
                      id="business_type_other"
                      value={formData.business_type_other || ""}
                      onChange={handleInputChangeEvent("business_type_other")}
                    />
                  </div>
                </div>
              )}

              {/* File Upload Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  Upload Required Documents
                </h3>

                {tokenValidation.dimension === "profile" && (
                  <div>
                    <Label htmlFor="profile_image">Profile Image</Label>
                    <div className="mt-2">
                      <Input
                        id="profile_image"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={handleFileChangeEvent("profile_image")}
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {getFileRequirements("profile")}
                    </p>
                  </div>
                )}

                {tokenValidation.dimension === "payment" && (
                  <div>
                    <Label htmlFor="payment_slip">Payment Slip</Label>
                    <div className="mt-2">
                      <Input
                        id="payment_slip"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,application/pdf"
                        onChange={handleFileChangeEvent("payment_slip")}
                        required
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {getFileRequirements("payment")}
                    </p>
                  </div>
                )}

                {tokenValidation.dimension === "tcc" && (
                  <div>
                    <Label htmlFor="chamber_card">
                      Chamber of Commerce Card
                    </Label>
                    <div className="mt-2">
                      <Input
                        id="chamber_card"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,application/pdf"
                        onChange={handleFileChangeEvent("chamber_card")}
                        required
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {getFileRequirements("tcc")}
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <Alert>
                  <AlertDescription className="text-red-600">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end space-x-4">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Submit Update
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function UpdatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading update form...</p>
          </div>
        </div>
      }
    >
      <UpdateForm />
    </Suspense>
  );
}
