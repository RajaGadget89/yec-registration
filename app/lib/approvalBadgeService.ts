import { generateYECBadge } from "./badgeGenerator";
import { uploadBadgeToSupabase } from "./uploadBadgeToSupabase";
import { getSupabaseServiceClient } from "./supabase-server";

export class ApprovalBadgeService {
  private supabase: any;

  constructor() {
    this.supabase = getSupabaseServiceClient();
  }

  /**
   * Generate badge only after 3-dimension approval
   * This ensures proper timing and includes correct regId in QR code
   */
  async generateApprovalBadge(registrationId: string): Promise<string> {
    console.log(`🏆 Generating approval badge for: ${registrationId}`);
    
    try {
      // Get full registration data
      const { data: registration, error } = await this.supabase
        .from("registrations")
        .select("*")
        .eq("registration_id", registrationId)
        .single();

      if (error || !registration) {
        throw new Error(`Registration not found: ${error?.message || "Unknown error"}`);
      }

      // Validate registration is approved
      if (registration.status !== 'approved') {
        throw new Error(`Registration not approved: ${registration.status}`);
      }

      // Validate all 3 dimensions are passed
      if (!this.isAllDimensionsPassed(registration)) {
        throw new Error("Not all review dimensions have passed");
      }

      // Generate badge with proper data structure
      const badgeData = await this.createBadgeDataWithProfile(registration);
      const badgeBuffer = await generateYECBadge(badgeData);
      
      // Upload to Supabase with approval prefix
      const filename = `approval-${registration.registration_id}.png`;
      const badgeUrl = await uploadBadgeToSupabase(badgeBuffer, filename);
      
      // Update database with new badge URL
      await this.updateBadgeUrl(registrationId, badgeUrl);
      
      console.log(`✅ Approval badge generated: ${badgeUrl}`);
      return badgeUrl;
      
    } catch (error) {
      console.error(`❌ Approval badge generation failed for ${registrationId}:`, error);
      throw error;
    }
  }

  /**
   * Regenerate badge when user updates information after approval
   */
  async regenerateBadge(registrationId: string): Promise<string> {
    console.log(`🔄 Regenerating badge for: ${registrationId}`);
    
    // Same logic as generateApprovalBadge but with regeneration flag
    return this.generateApprovalBadge(registrationId);
  }

  /**
   * Check if all 3 dimensions have passed
   */
  private isAllDimensionsPassed(registration: any): boolean {
    const normalize = (v: string | null | undefined) =>
      (v || '').toString().toLowerCase();

    // Accept both 'passed' (checklist semantics) and 'approved' (scalar semantics)
    const ok = (v: string | null | undefined) => {
      const n = normalize(v);
      return n === 'passed' || n === 'approved';
    };

    const scalarOk =
      ok(registration.payment_review_status) &&
      ok(registration.profile_review_status) &&
      ok(registration.tcc_review_status);

    if (scalarOk) return true;

    // Fallback to review_checklist if scalar statuses are inconsistent
    const checklist = registration.review_checklist || {};
    const payment = normalize(checklist?.payment?.status);
    const profile = normalize(checklist?.profile?.status);
    const tcc = normalize(checklist?.tcc?.status);

    return (payment === 'passed' && profile === 'passed' && tcc === 'passed');
  }

  /**
   * Create badge data structure with proper regId
   */
  private async createBadgeDataWithProfile(registration: any) {
    const fullName = `${registration.title} ${registration.first_name} ${registration.last_name}`;
    let profileImageBase64: string | null = null;

    try {
      const storagePath: string | null = registration.profile_image_url || null;
      if (storagePath && typeof storagePath === 'string' && storagePath.trim() !== '') {
        // profile_image_url is stored as "<bucket>/<filePath>" (e.g., "profile-images/12345.png")
        const firstSlash = storagePath.indexOf('/');
        const bucket = firstSlash > 0 ? storagePath.slice(0, firstSlash) : 'profile-images';
        const filePath = firstSlash > 0 ? storagePath.slice(firstSlash + 1) : storagePath;

        // Create a short-lived signed URL from the correct bucket
        const { data: signed, error: signedErr } = await this.supabase.storage
          .from(bucket)
          .createSignedUrl(filePath, 120);

        if (!signedErr && signed?.signedUrl) {
          const res = await fetch(signed.signedUrl);
          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            profileImageBase64 = Buffer.from(arrayBuffer).toString('base64');
          }
        }
      }
    } catch (e) {
      console.warn('Profile image fetch failed, using default silhouette:', e);
      profileImageBase64 = null;
    }

    return {
      registrationId: registration.registration_id, // This ensures regId is in QR code
      fullName,
      nickname: registration.nickname,
      phone: registration.phone,
      yecProvince: registration.yec_province,
      businessType: registration.business_type,
      businessTypeOther: registration.business_type_other,
      profileImageBase64,
    };
  }

  /**
   * Update badge URL in database
   */
  private async updateBadgeUrl(registrationId: string, badgeUrl: string) {
    const { error } = await this.supabase
      .from("registrations")
      .update({ 
        badge_url: badgeUrl,
        updated_at: new Date().toISOString()
      })
      .eq("registration_id", registrationId);

    if (error) {
      throw new Error(`Failed to update badge URL: ${error.message}`);
    }
  }
}

// Export singleton instance
export const approvalBadgeService = new ApprovalBadgeService();
