export interface FormField {
  id: string;
  type: 'upload' | 'select' | 'input' | 'tel' | 'text' | 'email';
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
    type: 'select',
    label: 'จังหวัดสมาชิก YEC',
    required: true,
    options: [
      { value: 'bangkok', label: 'กรุงเทพมหานคร' },
      { value: 'samut-prakan', label: 'สมุทรปราการ' },
      { value: 'nonthaburi', label: 'นนทบุรี' },
      { value: 'pathum-thani', label: 'ปทุมธานี' },
      { value: 'phra-nakhon-si-ayutthaya', label: 'พระนครศรีอยุธยา' },
      { value: 'ang-thong', label: 'อ่างทอง' },
      { value: 'lop-buri', label: 'ลพบุรี' },
      { value: 'sing-buri', label: 'สิงห์บุรี' },
      { value: 'chai-nat', label: 'ชัยนาท' },
      { value: 'saraburi', label: 'สระบุรี' },
      { value: 'chon-buri', label: 'ชลบุรี' },
      { value: 'rayong', label: 'ระยอง' },
      { value: 'chanthaburi', label: 'จันทบุรี' },
      { value: 'trat', label: 'ตราด' },
      { value: 'chachoengsao', label: 'ฉะเชิงเทรา' },
      { value: 'prachin-buri', label: 'ปราจีนบุรี' },
      { value: 'nakhon-nayok', label: 'นครนายก' },
      { value: 'sa-kaeo', label: 'สระแก้ว' },
      { value: 'nakhon-ratchasima', label: 'นครราชสีมา' },
      { value: 'buri-ram', label: 'บุรีรัมย์' },
      { value: 'surin', label: 'สุรินทร์' },
      { value: 'si-sa-ket', label: 'ศรีสะเกษ' },
      { value: 'ubon-ratchathani', label: 'อุบลราชธานี' },
      { value: 'yasothon', label: 'ยโสธร' },
      { value: 'chaiyaphum', label: 'ชัยภูมิ' },
      { value: 'amnat-charoen', label: 'อำนาจเจริญ' },
      { value: 'nong-bua-lamphu', label: 'หนองบัวลำภู' },
      { value: 'khon-kaen', label: 'ขอนแก่น' },
      { value: 'udon-thani', label: 'อุดรธานี' },
      { value: 'leoi', label: 'เลย' },
      { value: 'nong-khai', label: 'หนองคาย' },
      { value: 'maha-sarakham', label: 'มหาสารคาม' },
      { value: 'roi-et', label: 'ร้อยเอ็ด' },
      { value: 'kalasin', label: 'กาฬสินธุ์' },
      { value: 'sakon-nakhon', label: 'สกลนคร' },
      { value: 'nakhon-phanom', label: 'นครพนม' },
      { value: 'mukdahan', label: 'มุกดาหาร' },
      { value: 'chiang-mai', label: 'เชียงใหม่' },
      { value: 'lamphun', label: 'ลำพูน' },
      { value: 'lampang', label: 'ลำปาง' },
      { value: 'uttaradit', label: 'อุตรดิตถ์' },
      { value: 'phrae', label: 'แพร่' },
      { value: 'nan', label: 'น่าน' },
      { value: 'phayao', label: 'พะเยา' },
      { value: 'chiang-rai', label: 'เชียงราย' },
      { value: 'mae-hong-son', label: 'แม่ฮ่องสอน' },
      { value: 'nakhon-sawan', label: 'นครสวรรค์' },
      { value: 'uthai-thani', label: 'อุทัยธานี' },
      { value: 'kamphaeng-phet', label: 'กำแพงเพชร' },
      { value: 'tak', label: 'ตาก' },
      { value: 'sukhothai', label: 'สุโขทัย' },
      { value: 'phitsanulok', label: 'พิษณุโลก' },
      { value: 'phichit', label: 'พิจิตร' },
      { value: 'phetchabun', label: 'เพชรบูรณ์' },
      { value: 'ratchaburi', label: 'ราชบุรี' },
      { value: 'kanchanaburi', label: 'กาญจนบุรี' },
      { value: 'suphan-buri', label: 'สุพรรณบุรี' },
      { value: 'nakhon-pathom', label: 'นครปฐม' },
      { value: 'samut-sakhon', label: 'สมุทรสาคร' },
      { value: 'samut-songkhram', label: 'สมุทรสงคราม' },
      { value: 'phetchaburi', label: 'เพชรบุรี' },
      { value: 'prachuap-khiri-khan', label: 'ประจวบคีรีขันธ์' },
      { value: 'nakhon-si-thammarat', label: 'นครศรีธรรมราช' },
      { value: 'krabi', label: 'กระบี่' },
      { value: 'phang-nga', label: 'พังงา' },
      { value: 'phuket', label: 'ภูเก็ต' },
      { value: 'surat-thani', label: 'สุราษฎร์ธานี' },
      { value: 'ranong', label: 'ระนอง' },
      { value: 'chumphon', label: 'ชุมพร' },
      { value: 'songkhla', label: 'สงขลา' },
      { value: 'satun', label: 'สตูล' },
      { value: 'trang', label: 'ตรัง' },
      { value: 'pattani', label: 'ปัตตานี' },
      { value: 'yala', label: 'ยะลา' },
      { value: 'narathiwat', label: 'นราธิวาส' },
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
    id: 'roomType',
    type: 'select',
    label: 'ประเภทห้องพัก',
    required: true,
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
  roomType: '',
  roommateInfo: '',
  roommatePhone: '',
  travelType: '',
}; 