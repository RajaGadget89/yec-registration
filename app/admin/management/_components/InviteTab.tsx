"use client";

import { useState } from "react";
import { Mail, Send } from "lucide-react";
import { Alert, Button, Input, Checkbox } from "./shared/AdminUIComponents";
import { ssrSafeIdempotencyKey } from "../../../lib/ssr-safe";

interface InviteFormData {
  email: string;
  roles: string[];
}

interface InviteResponse {
  id: string;
  email: string;
  expires_at: string;
  message: string;
  correlation_id: string;
}

export default function InviteTab() {
  const [formData, setFormData] = useState<InviteFormData>({
    email: "",
    roles: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<InviteResponse | null>(null);

  const roleOptions = [
    { value: "admin", label: "Admin" },
    { value: "super_admin", label: "Super Admin" },
  ];

  const generateIdempotencyKey = () => {
    return ssrSafeIdempotencyKey("invite");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || formData.roles.length === 0) {
      setError("Please fill in all required fields");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/management/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": generateIdempotencyKey(),
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data);
        setFormData({ email: "", roles: [] });
      } else {
        // Handle different error types
        if (response.status === 409) {
          setError("An invitation already exists for this email address");
        } else if (response.status === 422) {
          setError(data.details?.[0]?.message || "Invalid request data");
        } else if (response.status === 429) {
          setError("Rate limit exceeded. Please try again later.");
        } else if (response.status === 403) {
          setError("Access denied. Super admin privileges required.");
        } else {
          setError(data.error || "Failed to send invitation");
        }
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
          <Mail className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Invite New Admin
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Send invitation emails to new admin users
          </p>
        </div>
      </div>

      {/* Invite Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
          data-testid="invite-form"
        >
          {/* Email Field */}
          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, email: value }))
            }
            placeholder="Enter email address"
            required
            data-testid="invite-email"
          />

          {/* Roles Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Roles *
            </label>
            <div className="space-y-2" data-testid="invite-roles">
              {roleOptions.map((role) => (
                <Checkbox
                  key={role.value}
                  label={role.label}
                  checked={formData.roles.includes(role.value)}
                  onChange={(checked) => {
                    if (checked) {
                      setFormData((prev) => ({
                        ...prev,
                        roles: [...prev.roles, role.value],
                      }));
                    } else {
                      setFormData((prev) => ({
                        ...prev,
                        roles: prev.roles.filter((r) => r !== role.value),
                      }));
                    }
                  }}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Select at least one role for the new admin user
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              disabled={
                loading || !formData.email || formData.roles.length === 0
              }
              data-testid="invite-submit"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Invitation
            </Button>
          </div>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <Alert
          type="error"
          onClose={() => setError(null)}
          data-testid="invite-error"
        >
          {error}
        </Alert>
      )}

      {/* Success Message */}
      {success && (
        <Alert type="success" data-testid="invite-success">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Invitation sent successfully to {success.email}</span>
              <a
                href="/admin/management?tab=pending"
                className="text-sm text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 underline"
              >
                View Pending Invitations
              </a>
            </div>
            <div className="text-xs">
              Invitation ID: {success.id} | Expires:{" "}
              {new Date(success.expires_at).toLocaleString()}
            </div>
          </div>
        </Alert>
      )}
    </div>
  );
}
