import { createCanvas, loadImage } from 'canvas';
import QRCode from 'qrcode';

// YEC Brand Colors from globals.css
const YEC_COLORS = {
  primary: '#1A237E',    // PANTONE 3591
  accent: '#4285C5',     // PANTONE 2394
  highlight: '#4CD1E0',  // PANTONE 3105
  white: '#FFFFFF',
  black: '#171717',
  gray: '#6B7280',
  lightGray: '#F3F4F6'
};

// Business type mapping from FormSchema
const BUSINESS_TYPE_LABELS: { [key: string]: string } = {
  'technology': 'เทคโนโลยี',
  'finance': 'การเงินและการธนาคาร',
  'healthcare': 'สุขภาพและการแพทย์',
  'education': 'การศึกษา',
  'retail': 'ค้าปลีก',
  'manufacturing': 'การผลิต',
  'construction': 'การก่อสร้าง',
  'real-estate': 'อสังหาริมทรัพย์',
  'tourism': 'การท่องเที่ยว',
  'food-beverage': 'อาหารและเครื่องดื่ม',
  'fashion': 'แฟชั่นและเสื้อผ้า',
  'automotive': 'ยานยนต์',
  'energy': 'พลังงาน',
  'logistics': 'โลจิสติกส์',
  'media': 'สื่อและบันเทิง',
  'consulting': 'ที่ปรึกษา',
  'legal': 'กฎหมาย',
  'marketing': 'การตลาด',
  'agriculture': 'เกษตรกรรม',
  'other': 'อื่น ๆ'
};

interface BadgeData {
  registrationId: string;
  fullName: string;
  nickname: string;
  phone: string;
  yecProvince: string;
  businessType: string;
  businessTypeOther?: string;
  profileImageBase64?: string;
}

interface QRCodeData {
  regId: string;
  fullName: string;
  phone: string;
}

export async function generateYECBadge(badgeData: BadgeData): Promise<Buffer> {
  // Badge dimensions (ID card size)
  const width = 600;
  const height = 400;
  
  // Create canvas
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Set background
  ctx.fillStyle = YEC_COLORS.white;
  ctx.fillRect(0, 0, width, height);
  
  // Add YEC branding header
  drawHeader(ctx, width);
  
  // Add profile photo
  await drawProfilePhoto(ctx, badgeData.profileImageBase64, width, height);
  
  // Add user information
  drawUserInfo(ctx, badgeData, width, height);
  
  // Generate and add QR code
  await drawQRCode(ctx, badgeData, width, height);
  
  // Add footer with YEC branding
  drawFooter(ctx, width, height);
  
  return canvas.toBuffer('image/png');
}

function drawHeader(ctx: CanvasRenderingContext2D, width: number): void {
  // YEC header background
  const headerHeight = 60;
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, YEC_COLORS.primary);
  gradient.addColorStop(1, YEC_COLORS.accent);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, headerHeight);
  
  // YEC text
  ctx.fillStyle = YEC_COLORS.white;
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('YEC DAY 2024', width / 2, 35);
  
  // Subtitle
  ctx.font = '14px Arial, sans-serif';
  ctx.fillText('Young Entrepreneurs Chamber', width / 2, 52);
}

async function drawProfilePhoto(
  ctx: CanvasRenderingContext2D, 
  profileImageBase64: string | undefined, 
  width: number, 
  height: number
): Promise<void> {
  const photoSize = 120;
  const photoX = 30;
  const photoY = 80;
  
  if (profileImageBase64) {
    try {
      // Handle both data URLs and raw base64 strings
      let base64Data = profileImageBase64;
      if (profileImageBase64.startsWith('data:')) {
        base64Data = profileImageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      }
      
      const image = await loadImage(Buffer.from(base64Data, 'base64'));
      
      // Create circular mask
      ctx.save();
      ctx.beginPath();
      ctx.arc(photoX + photoSize/2, photoY + photoSize/2, photoSize/2, 0, 2 * Math.PI);
      ctx.clip();
      
      // Draw image
      ctx.drawImage(image, photoX, photoY, photoSize, photoSize);
      ctx.restore();
    } catch (error) {
      console.error('Error loading profile image:', error);
      drawDefaultProfilePhoto(ctx, photoX, photoY, photoSize);
    }
  } else {
    drawDefaultProfilePhoto(ctx, photoX, photoY, photoSize);
  }
  
  // Add border
  ctx.strokeStyle = YEC_COLORS.primary;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(photoX + photoSize/2, photoY + photoSize/2, photoSize/2, 0, 2 * Math.PI);
  ctx.stroke();
}

function drawDefaultProfilePhoto(
  ctx: CanvasRenderingContext2D, 
  x: number, 
  y: number, 
  size: number
): void {
  // Draw placeholder background
  ctx.fillStyle = YEC_COLORS.lightGray;
  ctx.beginPath();
  ctx.arc(x + size/2, y + size/2, size/2, 0, 2 * Math.PI);
  ctx.fill();
  
  // Draw placeholder icon
  ctx.fillStyle = YEC_COLORS.gray;
  ctx.font = `${size/3}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('👤', x + size/2, y + size/2 + size/6);
}

function drawUserInfo(ctx: CanvasRenderingContext2D, badgeData: BadgeData, width: number, height: number): void {
  const infoX = 180;
  const infoY = 80;
  const lineHeight = 25;
  
  ctx.textAlign = 'left';
  
  // Full Name
  ctx.fillStyle = YEC_COLORS.primary;
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.fillText(`${badgeData.fullName}`, infoX, infoY);
  
  // Nickname
  ctx.fillStyle = YEC_COLORS.accent;
  ctx.font = '16px Arial, sans-serif';
  ctx.fillText(`(${badgeData.nickname})`, infoX, infoY + lineHeight);
  
  // YEC Province
  ctx.fillStyle = YEC_COLORS.black;
  ctx.font = '14px Arial, sans-serif';
  ctx.fillText(`จังหวัด: ${badgeData.yecProvince}`, infoX, infoY + lineHeight * 2);
  
  // Business Type
  const businessTypeLabel = badgeData.businessType === 'other' && badgeData.businessTypeOther
    ? badgeData.businessTypeOther
    : BUSINESS_TYPE_LABELS[badgeData.businessType] || badgeData.businessType;
  
  ctx.fillText(`ประเภทกิจการ: ${businessTypeLabel}`, infoX, infoY + lineHeight * 3);
  
  // Phone (masked for privacy)
  const maskedPhone = badgeData.phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1***$3');
  ctx.fillText(`โทร: ${maskedPhone}`, infoX, infoY + lineHeight * 4);
}

async function drawQRCode(
  ctx: CanvasRenderingContext2D, 
  badgeData: BadgeData, 
  width: number, 
  height: number
): Promise<void> {
  const qrSize = 100;
  const qrX = width - qrSize - 30;
  const qrY = height - qrSize - 80;
  
  // QR code data
  const qrData: QRCodeData = {
    regId: badgeData.registrationId,
    fullName: badgeData.fullName,
    phone: badgeData.phone
  };
  
  try {
    // Generate QR code
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: qrSize,
      margin: 1,
      color: {
        dark: YEC_COLORS.primary,
        light: YEC_COLORS.white
      }
    });
    
    // Load QR code image
    const qrImage = await loadImage(qrCodeDataURL);
    ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
    
    // Add QR code label
    ctx.fillStyle = YEC_COLORS.gray;
    ctx.font = '12px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Scan for details', qrX + qrSize/2, qrY + qrSize + 15);
    
  } catch (error) {
    console.error('Error generating QR code:', error);
    // Draw placeholder if QR generation fails
    ctx.fillStyle = YEC_COLORS.lightGray;
    ctx.fillRect(qrX, qrY, qrSize, qrSize);
    ctx.fillStyle = YEC_COLORS.gray;
    ctx.font = '12px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('QR Code Error', qrX + qrSize/2, qrY + qrSize/2);
  }
}

function drawFooter(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const footerHeight = 40;
  const footerY = height - footerHeight;
  
  // Footer background
  const gradient = ctx.createLinearGradient(0, footerY, width, footerY);
  gradient.addColorStop(0, YEC_COLORS.accent);
  gradient.addColorStop(1, YEC_COLORS.highlight);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, footerY, width, footerHeight);
  
  // Footer text
  ctx.fillStyle = YEC_COLORS.white;
  ctx.font = '12px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Official YEC Registration Badge', width / 2, footerY + 25);
}

// Utility function to convert file to base64
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Utility function to get business type display text
export function getBusinessTypeDisplay(businessType: string, businessTypeOther?: string): string {
  if (businessType === 'other' && businessTypeOther) {
    return businessTypeOther;
  }
  return BUSINESS_TYPE_LABELS[businessType] || businessType;
} 