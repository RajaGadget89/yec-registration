import { generateYECBadge } from "../badgeGenerator";
import { uploadBadgeToSupabase } from "../uploadBadgeToSupabase";
import { getSupabaseServiceClient } from "../supabase-server";

export interface BadgeGenerationResult {
  success: boolean;
  badgeUrl?: string;
  error?: string;
}

export interface BadgeGenerationData {
  registrationId: string;
  fullName: string;
  nickname?: string;
  phone: string;
  yecProvince: string;
  businessType: string;
  businessTypeOther?: string;
  profileImageBase64?: string;
}

export class BadgeGenerationService {
  private supabase: any;

  constructor() {
    this.supabase = getSupabaseServiceClient();
  }

  /**
   * Generate badge for imported registration data
   * This service is specifically designed for the import system
   */
  async generateImportBadge(
    registrationData: any,
  ): Promise<BadgeGenerationResult> {
    try {
      console.log(
        `🏆 Generating import badge for: ${registrationData.registration_id}`,
      );

      // Prepare badge data
      const badgeData = await this.prepareBadgeData(registrationData);

      // Generate badge image
      const badgeBuffer = await generateYECBadge({
        ...badgeData,
        nickname: badgeData.nickname || "",
      });
      console.log("Badge generated successfully");

      // Upload to Supabase with import prefix
      const filename = `import-${registrationData.registration_id}.png`;
      const badgeUrl = await uploadBadgeToSupabase(badgeBuffer, filename);
      console.log("Badge uploaded to Supabase:", badgeUrl);

      return {
        success: true,
        badgeUrl: badgeUrl,
      };
    } catch (error: any) {
      console.error(
        `❌ Import badge generation failed for ${registrationData.registration_id}:`,
        error,
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate badges for multiple registrations in batch
   */
  async generateBatchBadges(
    registrations: any[],
  ): Promise<BadgeGenerationResult[]> {
    const results: BadgeGenerationResult[] = [];

    for (const registration of registrations) {
      const result = await this.generateImportBadge(registration);
      results.push(result);
    }

    return results;
  }

  /**
   * Prepare badge data from registration data
   */
  private async prepareBadgeData(
    registrationData: any,
  ): Promise<BadgeGenerationData> {
    const fullName = `${registrationData.title || "คุณ"} ${registrationData.first_name} ${registrationData.last_name}`;

    // Get province display name
    const yecProvinceDisplay = await this.getProvinceDisplayName(
      registrationData.yec_province,
    );

    // Handle profile image
    let profileImageBase64: string | undefined;
    if (registrationData.profile_image_url) {
      try {
        profileImageBase64 = await this.fetchProfileImageAsBase64(
          registrationData.profile_image_url,
        );
      } catch (error) {
        console.warn(
          `Failed to fetch profile image for ${registrationData.registration_id}:`,
          error,
        );
        // Continue without profile image
      }
    }

    return {
      registrationId: registrationData.registration_id,
      fullName: fullName,
      nickname: registrationData.nickname,
      phone: registrationData.phone,
      yecProvince: yecProvinceDisplay,
      businessType: registrationData.business_type,
      businessTypeOther: registrationData.business_type_other,
      profileImageBase64: profileImageBase64,
    };
  }

  /**
   * Get province display name from province code
   */
  private async getProvinceDisplayName(provinceCode: string): Promise<string> {
    const provinceMap: Record<string, string> = {
      BK: "กรุงเทพมหานคร",
      CM: "เชียงใหม่",
      CR: "เชียงราย",
      LP: "ลำปาง",
      LN: "ลำพูน",
      MH: "แม่ฮ่องสอน",
      NSN: "นครสวรรค์", // Nakhon Sawan
      UT: "อุทัยธานี",
      KP: "กำแพงเพชร",
      TK: "ตาก",
      STI: "สุโขทัย", // Sukhothai
      PSL: "พิษณุโลก", // Phitsanulok
      PC: "พิจิตร",
      PB: "เพชรบูรณ์",
      RB: "ราชบุรี",
      KB: "กาญจนบุรี",
      SP: "สุพรรณบุรี",
      NP: "นครปฐม",
      SSK: "สมุทรสาคร", // Samut Sakhon
      SM: "สมุทรสงคราม",
      PR: "เพชรบุรี",
      PKN: "ประจวบคีรีขันธ์", // Prachuap Khiri Khan
      CP: "ชุมพร",
      RN: "ระนอง",
      KR: "กระบี่",
      PG: "พังงา",
      PK: "ภูเก็ต", // Phuket
      SRT: "สุราษฎร์ธานี",
      NST: "นครศรีธรรมราช", // Nakhon Si Thammarat
      TR: "ตรัง",
      PTL: "พัทลุง", // Phatthalung
      SKA: "สงขลา", // Songkhla
      YL: "ยะลา",
      NW: "นราธิวาส",
      PT: "ปัตตานี",
      STN: "สตูล", // Satun
      NMA: "นครราชสีมา",
      BRM: "บุรีรัมย์",
      SRN: "สุรินทร์",
      SISK: "ศรีสะเกษ", // Si Sa Ket (changed from SSK to avoid duplicate with Samut Sakhon)
      UBN: "อุบลราชธานี",
      YST: "ยโสธร",
      CPM: "ชัยภูมิ",
      ACR: "อำนาจเจริญ",
      NBP: "หนองบัวลำภู",
      KKN: "ขอนแก่น",
      UDN: "อุดรธานี",
      LEI: "เลย",
      NKI: "หนองคาย",
      MKM: "มหาสารคาม",
      RET: "ร้อยเอ็ด",
      KSN: "กาฬสินธุ์",
      SKN: "สกลนคร",
      NPM: "นครพนม",
      MUK: "มุกดาหาร",
      BKN: "บึงกาฬ",
      CTI: "จันทบุรี",
      CCO: "ฉะเชิงเทรา",
      CBI: "ชลบุรี",
      TRT: "ตราด",
      NKY: "นครนายก",
      PRC: "ปราจีนบุรี",
      RYG: "ระยอง",
      SKW: "สระแก้ว",
      SPK: "สมุทรปราการ",
      ATG: "อ่างทอง",
      CNT: "ชัยนาท",
      AYA: "พระนครศรีอยุธยา",
      LRI: "ลพบุรี",
      SBR: "สิงห์บุรี",
      SRI: "สระบุรี",
      UTI: "อุทัยธานี",
      KPT: "กำแพงเพชร",
      NWS: "นครสวรรค์",
      PCT: "พิจิตร",
      PLK: "พิษณุโลก",
      PBN: "เพชรบูรณ์",
      SKT: "สุโขทัย", // Sukhothai (changed from STI to avoid duplicate)
      TAK: "ตาก",
    };

    return provinceMap[provinceCode] || provinceCode;
  }

  /**
   * Fetch profile image from Supabase storage and convert to base64
   */
  private async fetchProfileImageAsBase64(imageUrl: string): Promise<string> {
    try {
      // If it's already a Supabase storage URL, download it
      if (imageUrl.includes("supabase")) {
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        return `data:image/jpeg;base64,${base64}`;
      }

      // If it's a Google Drive URL, it should have been processed by FileProcessingPipeline
      // and converted to Supabase storage URL
      throw new Error("Profile image URL is not a Supabase storage URL");
    } catch (error: any) {
      console.error("Error fetching profile image:", error);
      throw error;
    }
  }

  /**
   * Update registration with badge URL
   */
  async updateRegistrationBadgeUrl(
    registrationId: string,
    badgeUrl: string,
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("registrations")
        .update({ badge_url: badgeUrl })
        .eq("registration_id", registrationId);

      if (error) {
        throw new Error(`Failed to update badge URL: ${error.message}`);
      }

      console.log(`✅ Badge URL updated for registration: ${registrationId}`);
    } catch (error: any) {
      console.error(
        `❌ Failed to update badge URL for ${registrationId}:`,
        error,
      );
      throw error;
    }
  }
}
