"use client";

import { useState, useEffect } from "react";
import {
  Save,
  Plus,
  Trash2,
  GripVertical,
  Link,
  MapPin,
  Copyright,
  Users,
  Share2,
  RotateCcw,
} from "lucide-react";
import { FooterConfig } from "../../../../lib/footer-config";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface FooterManagementProps {}

interface SocialLink {
  platform: string;
  url: string;
  icon_name: string;
}

interface QuickLink {
  label: string;
  url: string;
  type: "internal" | "external";
}

interface CompanyInfo {
  title: string;
  description: string;
}

interface ContactInfo {
  email: string;
  phone: string;
  address: string;
}

interface CopyrightInfo {
  main_text: string;
  credit_text: string;
}

// Available Lucide icons for social media
const SOCIAL_ICONS = [
  "Facebook",
  "Instagram",
  "Twitter",
  "Linkedin",
  "Youtube",
  "Tiktok",
  "Globe",
  "Mail",
  "Phone",
  "MessageCircle",
  "Share2",
];

export default function FooterManagement({}: FooterManagementProps) {
  const [config, setConfig] = useState<FooterConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    title: "",
    description: "",
  });
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    email: "",
    phone: "",
    address: "",
  });
  const [copyrightInfo, setCopyrightInfo] = useState<CopyrightInfo>({
    main_text: "",
    credit_text: "",
  });

  useEffect(() => {
    fetchFooterConfig();
  }, []);

  const fetchFooterConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/cms/footer-config");
      if (!response.ok) {
        throw new Error("Failed to fetch footer configuration");
      }
      const data = await response.json();

      if (data.config) {
        setConfig(data.config);
        setCompanyInfo(
          data.config.footer_company_info || { title: "", description: "" },
        );
        setSocialLinks(data.config.footer_social_links || []);
        setQuickLinks(data.config.footer_quick_links || []);
        setContactInfo(
          data.config.footer_contact_info || {
            email: "",
            phone: "",
            address: "",
          },
        );
        setCopyrightInfo(
          data.config.footer_copyright || { main_text: "", credit_text: "" },
        );
      }
    } catch (error) {
      console.error("Error fetching footer config:", error);
      setError("Failed to load footer configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload = {
        footer_company_info: companyInfo,
        footer_social_links: socialLinks,
        footer_quick_links: quickLinks,
        footer_contact_info: contactInfo,
        footer_copyright: copyrightInfo,
      };

      const response = await fetch("/api/admin/cms/footer-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to save footer configuration",
        );
      }

      const result = await response.json();
      setSuccess("Footer configuration saved successfully!");

      // Update local config
      setConfig(result.config);
    } catch (error) {
      console.error("Error saving footer config:", error);
      setError(
        error instanceof Error ? error.message : "Failed to save configuration",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setCompanyInfo(
      config.footer_company_info || { title: "", description: "" },
    );
    setSocialLinks(config.footer_social_links || []);
    setQuickLinks(config.footer_quick_links || []);
    setContactInfo(
      config.footer_contact_info || { email: "", phone: "", address: "" },
    );
    setCopyrightInfo(
      config.footer_copyright || { main_text: "", credit_text: "" },
    );
    setError(null);
    setSuccess(null);
  };

  // Social Links handlers
  const addSocialLink = () => {
    setSocialLinks([
      ...socialLinks,
      { platform: "", url: "", icon_name: "Globe" },
    ]);
  };

  const removeSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  };

  const updateSocialLink = (
    index: number,
    field: keyof SocialLink,
    value: string,
  ) => {
    const updated = [...socialLinks];
    updated[index] = { ...updated[index], [field]: value };
    setSocialLinks(updated);
  };

  // Quick Links handlers
  const addQuickLink = () => {
    setQuickLinks([...quickLinks, { label: "", url: "", type: "external" }]);
  };

  const removeQuickLink = (index: number) => {
    setQuickLinks(quickLinks.filter((_, i) => i !== index));
  };

  const updateQuickLink = (
    index: number,
    field: keyof QuickLink,
    value: string,
  ) => {
    const updated = [...quickLinks];
    updated[index] = { ...updated[index], [field]: value };
    setQuickLinks(updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yec-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={handleReset}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 bg-white"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Info Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-yec-primary" />
            <h2 className="text-lg font-semibold text-gray-900">
              Company Information
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Title
              </label>
              <input
                type="text"
                value={companyInfo.title}
                onChange={(e) =>
                  setCompanyInfo({ ...companyInfo, title: e.target.value })
                }
                placeholder="e.g., YEC Day 2025"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={companyInfo.description}
                onChange={(e) =>
                  setCompanyInfo({
                    ...companyInfo,
                    description: e.target.value,
                  })
                }
                placeholder="Company description..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent"
                maxLength={500}
              />
            </div>
          </div>
        </div>

        {/* Contact Info Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-yec-primary" />
            <h2 className="text-lg font-semibold text-gray-900">
              Contact Information
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={contactInfo.email}
                onChange={(e) =>
                  setContactInfo({ ...contactInfo, email: e.target.value })
                }
                placeholder="contact@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="text"
                value={contactInfo.phone}
                onChange={(e) =>
                  setContactInfo({ ...contactInfo, phone: e.target.value })
                }
                placeholder="+66 XX XXX XXXX"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent"
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                value={contactInfo.address}
                onChange={(e) =>
                  setContactInfo({ ...contactInfo, address: e.target.value })
                }
                placeholder="Full address..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent"
                maxLength={500}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Social Media Links Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-yec-primary" />
            <h2 className="text-lg font-semibold text-gray-900">
              Social Media Links
            </h2>
          </div>
          <button
            onClick={addSocialLink}
            className="px-3 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Link
          </button>
        </div>

        <div className="space-y-4">
          {socialLinks.map((link, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg"
            >
              <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />

              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Platform
                  </label>
                  <input
                    type="text"
                    value={link.platform}
                    onChange={(e) =>
                      updateSocialLink(index, "platform", e.target.value)
                    }
                    placeholder="e.g., Facebook"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent"
                    maxLength={50}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL
                  </label>
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) =>
                      updateSocialLink(index, "url", e.target.value)
                    }
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Icon
                  </label>
                  <select
                    value={link.icon_name}
                    onChange={(e) =>
                      updateSocialLink(index, "icon_name", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent"
                  >
                    {SOCIAL_ICONS.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={() => removeSocialLink(index)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {socialLinks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Share2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No social media links added yet.</p>
              <p className="text-sm">
                Click &quot;Add Link&quot; to get started.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Links Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link className="w-5 h-5 text-yec-primary" />
            <h2 className="text-lg font-semibold text-gray-900">Quick Links</h2>
          </div>
          <button
            onClick={addQuickLink}
            className="px-3 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Link
          </button>
        </div>

        <div className="space-y-4">
          {quickLinks.map((link, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg"
            >
              <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />

              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Label
                  </label>
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) =>
                      updateQuickLink(index, "label", e.target.value)
                    }
                    placeholder="e.g., About Us"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL / Section ID
                  </label>
                  <input
                    type="text"
                    value={link.url}
                    onChange={(e) =>
                      updateQuickLink(index, "url", e.target.value)
                    }
                    placeholder="https://... or section-id"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent"
                    maxLength={500}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={link.type}
                    onChange={(e) =>
                      updateQuickLink(
                        index,
                        "type",
                        e.target.value as "internal" | "external",
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent"
                  >
                    <option value="external">External Link</option>
                    <option value="internal">Internal Scroll</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => removeQuickLink(index)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {quickLinks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Link className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No quick links added yet.</p>
              <p className="text-sm">
                Click &quot;Add Link&quot; to get started.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Copyright Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Copyright className="w-5 h-5 text-yec-primary" />
          <h2 className="text-lg font-semibold text-gray-900">
            Copyright Information
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Main Copyright Text
            </label>
            <input
              type="text"
              value={copyrightInfo.main_text}
              onChange={(e) =>
                setCopyrightInfo({
                  ...copyrightInfo,
                  main_text: e.target.value,
                })
              }
              placeholder="e.g., 2025 YEC Day. All rights reserved."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent"
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Credit Text
            </label>
            <input
              type="text"
              value={copyrightInfo.credit_text}
              onChange={(e) =>
                setCopyrightInfo({
                  ...copyrightInfo,
                  credit_text: e.target.value,
                })
              }
              placeholder="e.g., © Power By: Mr. Pisut Khungkamano"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent"
              maxLength={200}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
