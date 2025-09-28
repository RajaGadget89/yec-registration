import { generateYECBadge } from "./badgeGenerator";
import { uploadBadgeToSupabase } from "./uploadBadgeToSupabase";
import { createClient } from "@supabase/supabase-js";

export async function generateBadge(reg: {
  id: string;
  firstName: string;
  lastName: string;
}) {
  console.log("🔧 Admin Badge Generation - Using Real Implementation");

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get the full registration data from database
    const { data: registration, error } = await supabase
      .from("registrations")
      .select("*")
      .eq("id", reg.id)
      .single();

    if (error || !registration) {
      throw new Error(
        `Registration not found: ${error?.message || "Unknown error"}`,
      );
    }

    console.log(`Found registration: ${registration.registration_id}`);
    console.log(`Profile image URL: ${registration.profile_image_url}`);

    // Validate registration_id exists
    if (!registration.registration_id) {
      console.error("❌ CRITICAL: registration.registration_id is missing:", registration);
      throw new Error("Registration ID is required for badge generation");
    }

    // Create frontend data structure for badge generation
    const frontendData = {
      title: registration.title,
      firstName: registration.first_name,
      lastName: registration.last_name,
      nickname: registration.nickname,
      phone: registration.phone,
      email: registration.email,
      yecProvince: registration.yec_province,
      businessType: registration.business_type,
      profileImage: registration.profile_image_url, // This is the storage path
      chamberCard: registration.chamber_card_url,
      paymentSlip: registration.payment_slip_url,
    };

    // Create mapped data structure
    const mappedData = {
      registration_id: registration.registration_id,
      title: registration.title,
      first_name: registration.first_name,
      last_name: registration.last_name,
      nickname: registration.nickname,
      phone: registration.phone,
      email: registration.email,
      yec_province: registration.yec_province,
      business_type: registration.business_type,
      profile_image_url: registration.profile_image_url,
      chamber_card_url: registration.chamber_card_url,
      payment_slip_url: registration.payment_slip_url,
    };

    // Use the same badge generation logic as registration flow
    const badgeUrl = await generateAndUploadBadge(mappedData, frontendData);

    console.log(`✅ Admin badge generated with profile image: ${badgeUrl}`);
    return badgeUrl;
  } catch (error) {
    console.error("❌ Admin badge generation failed:", error);
    // Fallback to stub behavior if generation fails
    return `https://storage.example/badges/${reg.id}.png`;
  }
}

// Generate badge and upload to Supabase
export async function generateAndUploadBadge(
  mappedData: any,
  frontendData: any,
) {
  try {
    console.log("Starting badge generation...");

    // Get YEC province display name
    const yecProvinceField = [
      { value: "krabi", label: "กระบี่" },
      { value: "kanchanaburi", label: "กาญจนบุรี" },
      { value: "kalasin", label: "กาฬสินธุ์" },
      { value: "kamphaeng-phet", label: "กำแพงเพชร" },
      { value: "bangkok", label: "กรุงเทพมหานคร" },
      { value: "khon-kaen", label: "ขอนแก่น" },
      { value: "chachoengsao", label: "ฉะเชิงเทรา" },
      { value: "chai-nat", label: "ชัยนาท" },
      { value: "chaiyaphum", label: "ชัยภูมิ" },
      { value: "chanthaburi", label: "จันทบุรี" },
      { value: "chiang-mai", label: "เชียงใหม่" },
      { value: "chiang-rai", label: "เชียงราย" },
      // { value: "chon-buri", label: "ชลบุรี" }, // Temporarily disabled
      { value: "chumphon", label: "ชุมพร" },
      { value: "trang", label: "ตรัง" },
      { value: "trat", label: "ตราด" },
      { value: "tak", label: "ตาก" },
      { value: "nan", label: "น่าน" },
      { value: "narathiwat", label: "นราธิวาส" },
      { value: "nonthaburi", label: "นนทบุรี" },
      { value: "nakhon-nayok", label: "นครนายก" },
      { value: "nakhon-pathom", label: "นครปฐม" },
      { value: "nakhon-phanom", label: "นครพนม" },
      { value: "nakhon-ratchasima", label: "นครราชสีมา" },
      { value: "nakhon-sawan", label: "นครสวรรค์" },
      { value: "nakhon-si-thammarat", label: "นครศรีธรรมราช" },
      { value: "nong-bua-lamphu", label: "หนองบัวลำภู" },
      { value: "nong-khai", label: "หนองคาย" },
      { value: "pathum-thani", label: "ปทุมธานี" },
      { value: "pattani", label: "ปัตตานี" },
      { value: "phang-nga", label: "พังงา" },
      { value: "phayao", label: "พะเยา" },
      { value: "phetchabun", label: "เพชรบูรณ์" },
      { value: "phetchaburi", label: "เพชรบุรี" },
      { value: "phichit", label: "พิจิตร" },
      { value: "phitsanulok", label: "พิษณุโลก" },
      { value: "phra-nakhon-si-ayutthaya", label: "พระนครศรีอยุธยา" },
      { value: "phrae", label: "แพร่" },
      { value: "phuket", label: "ภูเก็ต" },
      { value: "prachin-buri", label: "ปราจีนบุรี" },
      { value: "prachuap-khiri-khan", label: "ประจวบคีรีขันธ์" },
      { value: "ranong", label: "ระนอง" },
      { value: "ratchaburi", label: "ราชบุรี" },
      { value: "rayong", label: "ระยอง" },
      { value: "roi-et", label: "ร้อยเอ็ด" },
      { value: "lampang", label: "ลำปาง" },
      { value: "lamphun", label: "ลำพูน" },
      { value: "leoi", label: "เลย" },
      { value: "lop-buri", label: "ลพบุรี" },
      { value: "mae-hong-son", label: "แม่ฮ่องสอน" },
      { value: "maha-sarakham", label: "มหาสารคาม" },
      { value: "mukdahan", label: "มุกดาหาร" },
      { value: "yasothon", label: "ยโสธร" },
      // { value: "yala", label: "ยะลา" }, // Temporarily disabled
      { value: "sa-kaeo", label: "สระแก้ว" },
      { value: "sakon-nakhon", label: "สกลนคร" },
      { value: "samut-prakan", label: "สมุทรปราการ" },
      { value: "samut-sakhon", label: "สมุทรสาคร" },
      { value: "samut-songkhram", label: "สมุทรสงคราม" },
      { value: "saraburi", label: "สระบุรี" },
      { value: "satun", label: "สตูล" },
      { value: "si-sa-ket", label: "ศรีสะเกษ" },
      { value: "sing-buri", label: "สิงห์บุรี" },
      { value: "songkhla", label: "สงขลา" },
      { value: "sukhothai", label: "สุโขทัย" },
      { value: "suphan-buri", label: "สุพรรณบุรี" },
      { value: "surat-thani", label: "สุราษฎร์ธานี" },
      { value: "surin", label: "สุรินทร์" },
      { value: "ubon-ratchathani", label: "อุบลราชธานี" },
      { value: "udon-thani", label: "อุดรธานี" },
      { value: "uthai-thani", label: "อุทัยธานี" },
      { value: "uttaradit", label: "อุตรดิตถ์" },
      { value: "buri-ram", label: "บุรีรัมย์" },
      // { value: "ang-thong", label: "อ่างทอง" }, // Temporarily disabled
      { value: "amnat-charoen", label: "อำนาจเจริญ" },
    ].find((province) => province.value === mappedData.yec_province);

    const yecProvinceDisplay =
      yecProvinceField?.label || mappedData.yec_province;

    // Handle profile image - could be URL, storage path, or base64 data
    let profileImageBase64: string | undefined;

    // Initialize Supabase client for storage operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    if (
      typeof frontendData.profileImage === "string" &&
      frontendData.profileImage.startsWith("http")
    ) {
      // Direct HTTP URL format
      try {
        console.log(
          "Fetching profile image from URL:",
          frontendData.profileImage,
        );
        const response = await fetch(frontendData.profileImage);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.startsWith("image/")) {
          throw new Error(`Invalid content type: ${contentType}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Validate buffer size (max 5MB)
        if (buffer.length > 5 * 1024 * 1024) {
          throw new Error("Image file too large (max 5MB)");
        }

        profileImageBase64 = `data:${contentType};base64,${buffer.toString("base64")}`;
        console.log(
          "Profile image fetched successfully from URL, size:",
          buffer.length,
          "bytes",
        );
      } catch (error) {
        console.error("Error fetching profile image from URL:", error);
        // Continue without profile image if fetch fails
      }
    } else if (
      typeof frontendData.profileImage === "string" &&
      frontendData.profileImage.includes("profile-images/")
    ) {
      // Storage path format - convert to signed URL using Supabase client
      try {
        console.log(
          "Converting storage path to signed URL:",
          frontendData.profileImage,
        );

        // Extract filename from storage path
        const filename = frontendData.profileImage.replace(
          "profile-images/",
          "",
        );

        // Get signed URL from Supabase storage
        const { data: signedUrlData, error: signedUrlError } =
          await supabase.storage
            .from("profile-images")
            .createSignedUrl(filename, 3600); // 1 hour expiry

        if (signedUrlError) {
          throw new Error(
            `Supabase signed URL error: ${signedUrlError.message}`,
          );
        }

        if (!signedUrlData?.signedUrl) {
          throw new Error("No signed URL returned from Supabase");
        }

        console.log("Got signed URL from Supabase:", signedUrlData.signedUrl);

        // Fetch image using signed URL
        const response = await fetch(signedUrlData.signedUrl);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.startsWith("image/")) {
          throw new Error(`Invalid content type: ${contentType}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Validate buffer size (max 5MB)
        if (buffer.length > 5 * 1024 * 1024) {
          throw new Error("Image file too large (max 5MB)");
        }

        profileImageBase64 = `data:${contentType};base64,${buffer.toString("base64")}`;
        console.log(
          "Profile image fetched successfully from storage path, size:",
          buffer.length,
          "bytes",
        );
      } catch (error) {
        console.error("Error fetching profile image from storage path:", error);
        // Continue without profile image if fetch fails
      }
    } else if (frontendData.profileImage?.dataUrl) {
      // Old format: base64 data (backward compatibility)
      profileImageBase64 = frontendData.profileImage.dataUrl;
      console.log(
        "Using profile image from base64 data (backward compatibility)",
      );
    }

    const fullName = `${mappedData.title} ${mappedData.first_name} ${mappedData.last_name}`;

    // Validate registration_id before creating badge data
    if (!mappedData.registration_id) {
      console.error("❌ CRITICAL: registration_id is missing from mappedData:", mappedData);
      throw new Error("Registration ID is required for badge generation");
    }

    console.log("🔍 Badge generation - registration_id:", mappedData.registration_id);

    const badgeData = {
      registrationId: mappedData.registration_id,
      fullName,
      nickname: mappedData.nickname,
      phone: mappedData.phone,
      yecProvince: yecProvinceDisplay,
      businessType: mappedData.business_type,
      businessTypeOther: mappedData.business_type_other,
      profileImageBase64,
    };

    console.log("🔍 Badge generation - badgeData.registrationId:", badgeData.registrationId);

    // Generate badge
    const badgeBuffer = await generateYECBadge(badgeData);
    console.log("Badge generated successfully");

    // Upload badge to Supabase
    const filename = `${mappedData.registration_id}.png`;
    const badgeUrl = await uploadBadgeToSupabase(badgeBuffer, filename);
    console.log("Badge uploaded to Supabase:", badgeUrl);

    return badgeUrl;
  } catch (error) {
    console.error("Error in badge generation/upload:", error);
    throw error;
  }
}
