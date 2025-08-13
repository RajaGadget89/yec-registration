import { generateYECBadge } from './badgeGenerator';
import { uploadBadgeToSupabase } from './uploadBadgeToSupabase';

export async function generateBadge(reg: { id: string; firstName: string; lastName: string }) {
  // In prod, plug real logic; for now return deterministic URL.
  return `https://storage.example/badges/${reg.id}.png`;
}

// Generate badge and upload to Supabase
export async function generateAndUploadBadge(mappedData: any, frontendData: any) {
  try {
    console.log('Starting badge generation...');
    
    // Get YEC province display name
    const yecProvinceField = [
      { value: 'krabi', label: 'กระบี่' },
      { value: 'kanchanaburi', label: 'กาญจนบุรี' },
      { value: 'kalasin', label: 'กาฬสินธุ์' },
      { value: 'kamphaeng-phet', label: 'กำแพงเพชร' },
      { value: 'bangkok', label: 'กรุงเทพมหานคร' },
      { value: 'khon-kaen', label: 'ขอนแก่น' },
      { value: 'chachoengsao', label: 'ฉะเชิงเทรา' },
      { value: 'chai-nat', label: 'ชัยนาท' },
      { value: 'chaiyaphum', label: 'ชัยภูมิ' },
      { value: 'chanthaburi', label: 'จันทบุรี' },
      { value: 'chiang-mai', label: 'เชียงใหม่' },
      { value: 'chiang-rai', label: 'เชียงราย' },
      { value: 'chon-buri', label: 'ชลบุรี' },
      { value: 'chumphon', label: 'ชุมพร' },
      { value: 'trang', label: 'ตรัง' },
      { value: 'trat', label: 'ตราด' },
      { value: 'tak', label: 'ตาก' },
      { value: 'nan', label: 'น่าน' },
      { value: 'narathiwat', label: 'นราธิวาส' },
      { value: 'nonthaburi', label: 'นนทบุรี' },
      { value: 'nakhon-nayok', label: 'นครนายก' },
      { value: 'nakhon-pathom', label: 'นครปฐม' },
      { value: 'nakhon-phanom', label: 'นครพนม' },
      { value: 'nakhon-ratchasima', label: 'นครราชสีมา' },
      { value: 'nakhon-sawan', label: 'นครสวรรค์' },
      { value: 'nakhon-si-thammarat', label: 'นครศรีธรรมราช' },
      { value: 'nong-bua-lamphu', label: 'หนองบัวลำภู' },
      { value: 'nong-khai', label: 'หนองคาย' },
      { value: 'pathum-thani', label: 'ปทุมธานี' },
      { value: 'pattani', label: 'ปัตตานี' },
      { value: 'phang-nga', label: 'พังงา' },
      { value: 'phayao', label: 'พะเยา' },
      { value: 'phetchabun', label: 'เพชรบูรณ์' },
      { value: 'phetchaburi', label: 'เพชรบุรี' },
      { value: 'phichit', label: 'พิจิตร' },
      { value: 'phitsanulok', label: 'พิษณุโลก' },
      { value: 'phra-nakhon-si-ayutthaya', label: 'พระนครศรีอยุธยา' },
      { value: 'phrae', label: 'แพร่' },
      { value: 'phuket', label: 'ภูเก็ต' },
      { value: 'prachin-buri', label: 'ปราจีนบุรี' },
      { value: 'prachuap-khiri-khan', label: 'ประจวบคีรีขันธ์' },
      { value: 'ranong', label: 'ระนอง' },
      { value: 'ratchaburi', label: 'ราชบุรี' },
      { value: 'rayong', label: 'ระยอง' },
      { value: 'roi-et', label: 'ร้อยเอ็ด' },
      { value: 'lampang', label: 'ลำปาง' },
      { value: 'lamphun', label: 'ลำพูน' },
      { value: 'leoi', label: 'เลย' },
      { value: 'lop-buri', label: 'ลพบุรี' },
      { value: 'mae-hong-son', label: 'แม่ฮ่องสอน' },
      { value: 'maha-sarakham', label: 'มหาสารคาม' },
      { value: 'mukdahan', label: 'มุกดาหาร' },
      { value: 'yasothon', label: 'ยโสธร' },
      { value: 'yala', label: 'ยะลา' },
      { value: 'sa-kaeo', label: 'สระแก้ว' },
      { value: 'sakon-nakhon', label: 'สกลนคร' },
      { value: 'samut-prakan', label: 'สมุทรปราการ' },
      { value: 'samut-sakhon', label: 'สมุทรสาคร' },
      { value: 'samut-songkhram', label: 'สมุทรสงคราม' },
      { value: 'saraburi', label: 'สระบุรี' },
      { value: 'satun', label: 'สตูล' },
      { value: 'si-sa-ket', label: 'ศรีสะเกษ' },
      { value: 'sing-buri', label: 'สิงห์บุรี' },
      { value: 'songkhla', label: 'สงขลา' },
      { value: 'sukhothai', label: 'สุโขทัย' },
      { value: 'suphan-buri', label: 'สุพรรณบุรี' },
      { value: 'surat-thani', label: 'สุราษฎร์ธานี' },
      { value: 'surin', label: 'สุรินทร์' },
      { value: 'ubon-ratchathani', label: 'อุบลราชธานี' },
      { value: 'udon-thani', label: 'อุดรธานี' },
      { value: 'uthai-thani', label: 'อุทัยธานี' },
      { value: 'uttaradit', label: 'อุตรดิตถ์' },
      { value: 'buri-ram', label: 'บุรีรัมย์' },
      { value: 'ang-thong', label: 'อ่างทอง' },
      { value: 'amnat-charoen', label: 'อำนาจเจริญ' },
    ].find(province => province.value === mappedData.yec_province);
    
    const yecProvinceDisplay = yecProvinceField?.label || mappedData.yec_province;

    // Handle profile image - could be URL or base64 data
    let profileImageBase64: string | undefined;
    
    if (typeof frontendData.profileImage === 'string' && frontendData.profileImage.startsWith('http')) {
      // New format: URL from Supabase
      try {
        console.log('Fetching profile image from URL:', frontendData.profileImage);
        const response = await fetch(frontendData.profileImage);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
          throw new Error(`Invalid content type: ${contentType}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Validate buffer size (max 5MB)
        if (buffer.length > 5 * 1024 * 1024) {
          throw new Error('Image file too large (max 5MB)');
        }
        
        profileImageBase64 = `data:${contentType};base64,${buffer.toString('base64')}`;
        console.log('Profile image fetched successfully from URL, size:', buffer.length, 'bytes');
      } catch (error) {
        console.error('Error fetching profile image from URL:', error);
        // Continue without profile image if fetch fails
      }
    } else if (frontendData.profileImage?.dataUrl) {
      // Old format: base64 data (backward compatibility)
      profileImageBase64 = frontendData.profileImage.dataUrl;
      console.log('Using profile image from base64 data (backward compatibility)');
    }

    const fullName = `${mappedData.title} ${mappedData.first_name} ${mappedData.last_name}`;
    
    const badgeData = {
      registrationId: mappedData.registration_id,
      fullName,
      nickname: mappedData.nickname,
      phone: mappedData.phone,
      yecProvince: yecProvinceDisplay,
      businessType: mappedData.business_type,
      businessTypeOther: mappedData.business_type_other,
      profileImageBase64
    };

    // Generate badge
    const badgeBuffer = await generateYECBadge(badgeData);
    console.log('Badge generated successfully');

    // Upload badge to Supabase
    const filename = `${mappedData.registration_id}.png`;
    const badgeUrl = await uploadBadgeToSupabase(badgeBuffer, filename);
    console.log('Badge uploaded to Supabase:', badgeUrl);
    
    return badgeUrl;
  } catch (error) {
    console.error('Error in badge generation/upload:', error);
    throw error;
  }
}
