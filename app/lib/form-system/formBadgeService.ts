import { getSupabaseServerClient } from "../supabase/server";
import { EventFactory } from "../events/eventFactory";
import { EventService } from "../events/eventService";
import { audit } from "../audit";
import { uploadFileToSupabase } from "../uploadFileToSupabase";
import { encryptQrPayload, renderQrToCanvas } from "../qr/qrService";

export interface BadgeTemplate {
  logo_url?: string;
  title_text: string;
  subtitle_text?: string;
  background_color: string;
  text_color: string;
  fields: string[];
  field_labels?: Record<string, string>;
  show_field_labels?: boolean;
  field_label_visibility?: Record<string, boolean>;
  field_visibility?: Record<string, boolean>;
  layout: "vertical" | "horizontal";
  font_family?: string;
  font_size?: {
    title: number;
    subtitle: number;
    field: number;
  };
  dimensions: {
    width: number;
    height: number;
  };
  qr?: {
    enabled?: boolean;
    size?: number;
    margin?: number;
  };
}

export interface BadgeGenerationResult {
  success: boolean;
  badge_path?: string;
  badge_url?: string;
  error?: string;
}

export class FormBadgeService {
  private supabase: any;

  constructor() {
    this.supabase = null; // Will be initialized when needed
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await getSupabaseServerClient();
    }
    return this.supabase;
  }

  /**
   * Get badge template for a form
   */
  async getBadgeTemplate(formKey: string): Promise<BadgeTemplate | null> {
    try {
      const supabase = await this.getSupabase();
      // Prefer new table
      const { data: row } = await supabase
        .from("form_badge_templates")
        .select("template")
        .eq("form_key", formKey)
        .eq("is_active", true)
        .maybeSingle();
      let badgeConfig = row?.template;
      if (!badgeConfig) {
        const { data: legacy } = await supabase
          .from("form_types")
          .select("config")
          .eq("form_key", formKey)
          .eq("is_active", true)
          .single();
        badgeConfig = legacy?.config?.badge_config;
      }
      if (!badgeConfig) return null;
      return this.normalizeBadgeTemplate(badgeConfig);
    } catch (error) {
      console.error("Error getting badge template:", error);
      return null;
    }
  }

  /**
   * Normalize badge template with defaults
   */
  private normalizeBadgeTemplate(config: any): BadgeTemplate {
    return {
      logo_url: config.logo_url || "",
      title_text: config.title_text || "Event Badge",
      subtitle_text: config.subtitle_text || "",
      background_color: config.background_color || "#2F68C9",
      text_color: config.text_color || "#FFFFFF",
      fields: config.fields || ["name", "tracking_id"],
      field_labels: config.field_labels || {},
      show_field_labels: config.show_field_labels !== false,
      field_label_visibility: config.field_label_visibility || {},
      field_visibility: config.field_visibility || {},
      layout: config.layout || "vertical",
      font_family: config.font_family || "Arial, sans-serif",
      font_size: {
        title: config.font_size?.title || 24,
        subtitle: config.font_size?.subtitle || 16,
        field: config.font_size?.field || 14,
      },
      dimensions: {
        width: config.dimensions?.width || 400,
        height: config.dimensions?.height || 600,
      },
      qr: {
        enabled: config.qr?.enabled !== false,
        size: config.qr?.size || 120,
        margin: config.qr?.margin || 12,
      },
    };
  }

  /**
   * Generate badge for a form registration
   */
  async generateBadge(
    formKey: string,
    registrationId: string,
    registrationData: any,
  ): Promise<BadgeGenerationResult> {
    try {
      const template = await this.getBadgeTemplate(formKey);
      if (!template) {
        return {
          success: false,
          error: "Badge template not found for form",
        };
      }

      // Generate badge using canvas
      const badgeDataUrl = await this.generateBadgeCanvas(
        template,
        registrationData,
      );

      // Convert data URL to buffer
      const base64Data = badgeDataUrl.split(",")[1];
      const buffer = Buffer.from(base64Data, "base64");

      // Upload to Supabase storage
      const fileName = `${formKey}-${registrationData.tracking_id || registrationId}.png`;
      const filePath = `badges/${formKey}/${fileName}`;

      const uploadResult = await uploadFileToSupabase(
        buffer as any,
        filePath,
        "image/png",
      );

      if (!(uploadResult as any).success) {
        return {
          success: false,
          error: "Failed to upload badge to storage",
        };
      }

      // Update registration with badge path
      const supabase = await this.getSupabase();
      const { error: updateError } = await supabase
        .from("form_registrations")
        .update({
          badge_path: filePath,
          updated_at: new Date().toISOString(),
        })
        .eq("id", registrationId)
        .eq("form_key", formKey);

      if (updateError) {
        console.error("Error updating badge path:", updateError);
        return {
          success: false,
          error: "Failed to update registration with badge path",
        };
      }

      // Emit badge generated event
      await EventService.emit(
        EventFactory.createBadgeGenerated({
          applicationId: registrationId,
          badgePath: filePath,
          correlationId: crypto.randomUUID(),
        }),
      );

      // Log audit event
      await audit.logEvent({
        action: "form_badge_generated",
        resource: "form_registrations",
        resource_id: registrationId,
        actor_id: "system",
        actor_role: "system",
        result: "success",
        correlation_id: crypto.randomUUID(),
        meta: {
          form_key: formKey,
          badge_path: filePath,
        },
      });

      return {
        success: true,
        badge_path: filePath,
        badge_url: (uploadResult as any).url,
      };
    } catch (error) {
      console.error("Error generating badge:", error);
      return {
        success: false,
        error: "Error generating badge",
      };
    }
  }

  /**
   * Generate badge canvas using HTML5 Canvas
   */
  private async generateBadgeCanvas(
    template: BadgeTemplate,
    registrationData: any,
  ): Promise<string> {
    // This would typically use a canvas library like node-canvas
    // For now, we'll create a simple HTML-based approach
    const canvas = await this.createBadgeCanvas(template, registrationData);
    return canvas.toDataURL("image/png");
  }

  /**
   * Create badge canvas (simplified implementation)
   */
  private async createBadgeCanvas(
    template: BadgeTemplate,
    registrationData: any,
  ): Promise<HTMLCanvasElement> {
    // This is a simplified implementation
    // In a real implementation, you would use a proper canvas library
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Could not get canvas context");
    }

    // Set canvas dimensions
    canvas.width = template.dimensions.width;
    canvas.height = template.dimensions.height;

    // Fill background
    ctx.fillStyle = template.background_color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set text properties
    ctx.fillStyle = template.text_color;
    ctx.font = `${template.font_size?.title || 16}px ${template.font_family}`;
    ctx.textAlign = "center";

    // Draw title
    ctx.fillText(template.title_text, canvas.width / 2, 50);

    // Draw subtitle if exists
    if (template.subtitle_text) {
      ctx.font = `${template.font_size?.subtitle || 14}px ${template.font_family}`;
      ctx.fillText(template.subtitle_text, canvas.width / 2, 80);
    }

    // Draw fields
    let yPosition = 120;
    ctx.font = `${template.font_size?.field || 12}px ${template.font_family}`;

    for (const field of template.fields) {
      if (
        template.field_visibility &&
        template.field_visibility[field] === false
      ) {
        continue;
      }
      const value = this.getFieldValue(registrationData, field);
      if (value) {
        const showLabel =
          template.field_label_visibility &&
          field in template.field_label_visibility
            ? template.field_label_visibility[field] !== false
            : template.show_field_labels !== false;
        const labelPrefix = showLabel
          ? `${(template.field_labels && template.field_labels[field]) || field.toUpperCase()}: `
          : "";
        ctx.fillText(`${labelPrefix}${value}`, canvas.width / 2, yPosition);
        yPosition += 30;
      }
    }

    // Draw QR at bottom center if enabled
    try {
      const qrEnabled = template.qr?.enabled !== false;
      const trackingId = this.getFieldValue(registrationData, "tracking_id");
      const formKey =
        registrationData?.form_key || registrationData?.formKey || "generic";
      if (qrEnabled && trackingId) {
        const size = Math.min(template.qr?.size || 120, canvas.width - 24);
        const margin = template.qr?.margin ?? 12;
        const x = Math.floor((canvas.width - size) / 2);
        const y = canvas.height - size - margin;
        const token = await encryptQrPayload({
          tracking_id: trackingId,
          form_key: String(formKey),
        });
        await renderQrToCanvas(ctx as any, x, y, size, token);
      }
    } catch (err) {
      console.warn("QR render skipped:", err);
    }

    return canvas;
  }

  /**
   * Get field value from registration data
   */
  private getFieldValue(registrationData: any, field: string): string {
    // Handle nested field access (e.g., "core_data.name")
    const parts = field.split(".");
    let value = registrationData;

    for (const part of parts) {
      if (value && typeof value === "object") {
        value = value[part];
      } else {
        return "";
      }
    }

    return value ? String(value) : "";
  }

  /**
   * Get badge URL for a registration
   */
  async getBadgeUrl(
    formKey: string,
    registrationId: string,
  ): Promise<string | null> {
    try {
      const supabase = await this.getSupabase();
      const { data: registration, error } = await supabase
        .from("form_registrations")
        .select("badge_path")
        .eq("id", registrationId)
        .eq("form_key", formKey)
        .single();

      if (error || !registration || !registration.badge_path) {
        return null;
      }

      // Get signed URL from Supabase storage
      const { data, error: urlError } = await supabase.storage
        .from("badges")
        .createSignedUrl(registration.badge_path, 3600); // 1 hour expiry

      if (urlError || !data) {
        console.error("Error creating signed URL:", urlError);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error("Error getting badge URL:", error);
      return null;
    }
  }

  /**
   * Regenerate badge for a registration
   */
  async regenerateBadge(
    formKey: string,
    registrationId: string,
  ): Promise<BadgeGenerationResult> {
    try {
      const supabase = await this.getSupabase();

      // Get registration data
      const { data: registration, error } = await supabase
        .from("form_registrations")
        .select("*")
        .eq("id", registrationId)
        .eq("form_key", formKey)
        .single();

      if (error || !registration) {
        return {
          success: false,
          error: "Registration not found",
        };
      }

      // Delete existing badge if it exists
      if (registration.badge_path) {
        try {
          await supabase.storage
            .from("badges")
            .remove([registration.badge_path]);
        } catch (deleteError) {
          console.error("Error deleting existing badge:", deleteError);
          // Continue with regeneration
        }
      }

      // Generate new badge
      return await this.generateBadge(formKey, registrationId, registration);
    } catch (error) {
      console.error("Error regenerating badge:", error);
      return {
        success: false,
        error: "Error regenerating badge",
      };
    }
  }

  /**
   * Get badge statistics for a form
   */
  async getBadgeStats(formKey: string): Promise<{
    total_registrations: number;
    badges_generated: number;
    badges_pending: number;
    badge_generation_rate: number;
  }> {
    try {
      const supabase = await this.getSupabase();

      // Get total registrations
      const { count: total, error: totalError } = await supabase
        .from("form_registrations")
        .select("*", { count: "exact", head: true })
        .eq("form_key", formKey)
        .eq("is_active", true);

      if (totalError) {
        console.error("Error getting total registrations:", totalError);
      }

      // Get badges generated
      const { count: badgesGenerated, error: badgesError } = await supabase
        .from("form_registrations")
        .select("*", { count: "exact", head: true })
        .eq("form_key", formKey)
        .eq("is_active", true)
        .not("badge_path", "is", null);

      if (badgesError) {
        console.error("Error getting badges generated:", badgesError);
      }

      const totalCount = total || 0;
      const badgesCount = badgesGenerated || 0;
      const badgesPending = totalCount - badgesCount;
      const generationRate =
        totalCount > 0 ? (badgesCount / totalCount) * 100 : 0;

      return {
        total_registrations: totalCount,
        badges_generated: badgesCount,
        badges_pending: badgesPending,
        badge_generation_rate: Math.round(generationRate * 100) / 100,
      };
    } catch (error) {
      console.error("Error getting badge stats:", error);
      return {
        total_registrations: 0,
        badges_generated: 0,
        badges_pending: 0,
        badge_generation_rate: 0,
      };
    }
  }

  /**
   * Batch generate badges for multiple registrations
   */
  async batchGenerateBadges(
    formKey: string,
    registrationIds: string[],
  ): Promise<{
    success: number;
    failed: number;
    results: Array<{
      registrationId: string;
      success: boolean;
      error?: string;
    }>;
  }> {
    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (const registrationId of registrationIds) {
      try {
        const result = await this.generateBadge(formKey, registrationId, {});
        results.push({
          registrationId,
          success: result.success,
          error: result.error,
        });

        if (result.success) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (_error) {
        results.push({
          registrationId,
          success: false,
          error: "Error generating badge",
        });
        failedCount++;
      }
    }

    return {
      success: successCount,
      failed: failedCount,
      results,
    };
  }
}

// Export singleton instance
export const formBadgeService = new FormBadgeService();
