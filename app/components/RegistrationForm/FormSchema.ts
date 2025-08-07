export interface FormField {
  id: string;
  type: 'upload' | 'select' | 'input' | 'tel' | 'text' | 'email' | 'province';
  label: string;
  required: boolean;
  validation?: {
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    fileTypes?: string[];
    maxFileSize?: number; // in MB
    customValidation?: (value: any) => string | null;
  };
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  dependsOn?: {
    field: string;
    value: string;
  };
  extraField?: {
    id: string;
    label: string;
    type: 'input' | 'tel';
    required?: boolean;
    validation?: {
      pattern?: RegExp;
      minLength?: number;
      maxLength?: number;
    };
  };
  roommatePhoneField?: {
    id: string;
    label: string;
    type: 'tel';
    required?: boolean;
    validation?: {
      pattern?: RegExp;
      customValidation?: (value: string) => string | null;
    };
  };
}

export const formSchema: FormField[] = [
  {
    id: 'paymentSlip',
    type: 'upload',
    label: 'Payment Slip',
    required: true,
    validation: {
      fileTypes: ['image/jpeg', 'image/jpg', 'image/png'],
      maxFileSize: 10,
    },
  },
  {
    id: 'yecProvince',
    type: 'province',
    label: 'จังหวัดสมาชิก YEC',
    required: true,
    options: [
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
    ],
  },
  {
    id: 'chamberCard',
    type: 'upload',
    label: 'บัตรสมาชิกหอการค้า',
    required: true,
    validation: {
      fileTypes: ['image/jpeg', 'image/jpg', 'image/png'],
      maxFileSize: 10,
    },
  },
  {
    id: 'title',
    type: 'select',
    label: 'คำนำหน้า',
    required: true,
    options: [
      { value: 'นาย', label: 'นาย' },
      { value: 'นางสาว', label: 'นางสาว' },
      { value: 'นาง', label: 'นาง' },
      { value: 'Mr.', label: 'Mr.' },
      { value: 'Ms.', label: 'Ms.' },
      { value: 'Mrs.', label: 'Mrs.' },
    ],
  },
  {
    id: 'firstName',
    type: 'input',
    label: 'ชื่อ',
    required: true,
    placeholder: 'กรุณากรอกชื่อ',
    validation: {
      minLength: 1,
      maxLength: 50,
    },
  },
  {
    id: 'lastName',
    type: 'input',
    label: 'นามสกุล',
    required: true,
    placeholder: 'กรุณากรอกนามสกุล',
    validation: {
      minLength: 1,
      maxLength: 50,
    },
  },
  {
    id: 'nickname',
    type: 'input',
    label: 'ชื่อเล่น',
    required: true,
    placeholder: 'กรุณากรอกชื่อเล่น',
    validation: {
      minLength: 1,
      maxLength: 30,
    },
  },
  {
    id: 'phone',
    type: 'tel',
    label: 'เบอร์โทรศัพท์',
    required: true,
    placeholder: '0812345678',
    validation: {
      pattern: /^0\d{9}$/,
      customValidation: (value: string) => {
        if (!value) return 'กรุณากรอกเบอร์โทรศัพท์';
        if (!/^0\d{9}$/.test(value)) return 'เบอร์โทรศัพท์ต้องขึ้นต้นด้วย 0 และมี 10 หลัก';
        return null;
      },
    },
  },
  {
    id: 'lineId',
    type: 'text',
    label: 'Line ID',
    required: true,
    placeholder: 'กรุณากรอก Line ID',
    validation: {
      pattern: /^[a-zA-Z0-9._-]+$/,
      minLength: 1,
      maxLength: 30,
      customValidation: (value: string) => {
        if (!value) return 'กรุณากรอก Line ID';
        if (!/^[a-zA-Z0-9._-]+$/.test(value)) return 'Line ID ต้องเป็นภาษาอังกฤษเท่านั้น';
        return null;
      },
    },
  },
  {
    id: 'email',
    type: 'email',
    label: 'อีเมล',
    required: true,
    placeholder: 'example@email.com',
    validation: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      customValidation: (value: string) => {
        if (!value) return 'กรุณากรอกอีเมล';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'รูปแบบอีเมลไม่ถูกต้อง';
        return null;
      },
    },
  },
  {
    id: 'companyName',
    type: 'text',
    label: 'ชื่อกิจการ / บริษัท',
    required: true,
    placeholder: 'กรุณากรอกชื่อกิจการหรือบริษัท',
    validation: {
      minLength: 1,
      maxLength: 100,
    },
  },
  {
    id: 'businessType',
    type: 'select',
    label: 'ประเภทกิจการ',
    required: true,
    options: [
      { value: 'technology', label: 'เทคโนโลยี' },
      { value: 'finance', label: 'การเงินและการธนาคาร' },
      { value: 'healthcare', label: 'สุขภาพและการแพทย์' },
      { value: 'education', label: 'การศึกษา' },
      { value: 'retail', label: 'ค้าปลีก' },
      { value: 'manufacturing', label: 'การผลิต' },
      { value: 'construction', label: 'การก่อสร้าง' },
      { value: 'real-estate', label: 'อสังหาริมทรัพย์' },
      { value: 'tourism', label: 'การท่องเที่ยว' },
      { value: 'food-beverage', label: 'อาหารและเครื่องดื่ม' },
      { value: 'fashion', label: 'แฟชั่นและเสื้อผ้า' },
      { value: 'automotive', label: 'ยานยนต์' },
      { value: 'energy', label: 'พลังงาน' },
      { value: 'logistics', label: 'โลจิสติกส์' },
      { value: 'media', label: 'สื่อและบันเทิง' },
      { value: 'consulting', label: 'ที่ปรึกษา' },
      { value: 'legal', label: 'กฎหมาย' },
      { value: 'marketing', label: 'การตลาด' },
      { value: 'agriculture', label: 'เกษตรกรรม' },
      { value: 'other', label: 'อื่น ๆ' },
    ],
    extraField: {
      id: 'businessTypeOther',
      label: 'ระบุประเภทกิจการ',
      type: 'input',
      required: true,
      validation: {
        minLength: 1,
        maxLength: 50,
      },
    },
  },
  {
    id: 'profileImage',
    type: 'upload',
    label: 'รูปโปรไฟล์',
    required: true,
    validation: {
      fileTypes: ['image/jpeg', 'image/jpg', 'image/png'],
      maxFileSize: 10,
    },
  },
  {
    id: 'hotelChoice',
    type: 'select',
    label: 'ตัวเลือกโรงแรม',
    required: true,
    options: [
      { value: 'in-quota', label: 'เลือกโรงแรมที่ผู้จัดงานจัดไว้ให้ (ในสิทธิ์)' },
      { value: 'out-of-quota', label: 'เลือกโรงแรมเอง (นอกสิทธิ์)' },
    ],
  },
  {
    id: 'roomType',
    type: 'select',
    label: 'ประเภทห้องพัก',
    required: true,
    dependsOn: {
      field: 'hotelChoice',
      value: 'in-quota',
    },
    options: [
      { value: 'single', label: 'พักเดี่ยว' },
      { value: 'double', label: 'พักคู่' },
      { value: 'suite', label: 'ห้องสวีท' },
      { value: 'no-accommodation', label: 'ไม่ต้องการที่พัก' },
    ],
    extraField: {
      id: 'roommateInfo',
      label: 'ชื่อ นามสกุล ผู้นอนร่วม',
      type: 'input',
      required: true,
      validation: {
        minLength: 1,
        maxLength: 100,
      },
    },
    // Add roommate phone field when roomType is 'double'
    roommatePhoneField: {
      id: 'roommatePhone',
      label: 'เบอร์โทรผู้ร่วมพัก',
      type: 'tel',
      required: true,
      validation: {
        pattern: /^0\d{9}$/,
        customValidation: (value: string) => {
          if (!value) return 'กรุณากรอกเบอร์โทรผู้ร่วมพัก';
          if (!/^0\d{9}$/.test(value)) return 'เบอร์โทรผู้ร่วมพักต้องขึ้นต้นด้วย 0 และมี 10 หลัก';
          return null;
        },
      },
    },
  },
  {
    id: 'external_hotel_name',
    type: 'text',
    label: 'ชื่อโรงแรมที่เลือกเอง',
    required: true,
    dependsOn: {
      field: 'hotelChoice',
      value: 'out-of-quota',
    },
    placeholder: 'กรุณากรอกชื่อโรงแรม',
    validation: {
      minLength: 1,
      maxLength: 100,
    },
  },
  {
    id: 'travelType',
    type: 'select',
    label: 'ประเภทการเดินทาง',
    required: true,
    options: [
      { value: 'private-car', label: 'รถยนต์ส่วนตัว' },
      { value: 'van', label: 'รถตู้' },
    ],
  },
];

export interface FormData {
  [key: string]: any;
}

export const initialFormData: FormData = {
  paymentSlip: null,
  yecProvince: '',
  chamberCard: null,
  title: '',
  firstName: '',
  lastName: '',
  nickname: '',
  phone: '',
  lineId: '',
  email: '',
  companyName: '',
  businessType: '',
  businessTypeOther: '',
  profileImage: null,
  hotelChoice: '',
  roomType: '',
  roommateInfo: '',
  roommatePhone: '',
  external_hotel_name: '',
  travelType: '',
}; 