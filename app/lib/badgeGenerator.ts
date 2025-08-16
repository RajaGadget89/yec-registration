import {
  createCanvas,
  loadImage,
  registerFont,
  CanvasRenderingContext2D,
} from "canvas";
import QRCode from "qrcode";
import path from "path";
import fs from "fs";

// Register Thai-compatible font
// Try multiple approaches to ensure Thai text renders properly
let thaiFontRegistered = false;
let activeFontFamily = "Arial, sans-serif";

console.log("=== FONT REGISTRATION START ===");

try {
  // Try to register Noto Sans Thai from the fonts directory
  const fontPath = path.join(
    process.cwd(),
    "fonts",
    "NotoSansThai-Regular.ttf",
  );
  console.log("Looking for NotoSansThai font at:", fontPath);

  if (fs.existsSync(fontPath)) {
    registerFont(fontPath, { family: "NotoSansThai" });
    thaiFontRegistered = true;
    activeFontFamily = "NotoSansThai";
    console.log("✅ NotoSansThai font registered successfully from:", fontPath);
  } else {
    console.log("❌ NotoSansThai font file not found at:", fontPath);
    console.log("📁 Available files in fonts directory:");
    try {
      const files = fs.readdirSync(path.join(process.cwd(), "fonts"));
      files.forEach((file) => console.log("   -", file));
    } catch {
      console.log("   (fonts directory is empty or not accessible)");
    }
  }
} catch (error) {
  console.log("❌ Error registering NotoSansThai font:", error);
}

// Try to register other Thai fonts if NotoSansThai is not available
if (!thaiFontRegistered) {
  console.log("🔍 Trying system Thai fonts...");
  const thaiFonts = [
    {
      path: "/System/Library/Fonts/Supplemental/Thonburi.ttc",
      family: "Thonburi",
    },
    {
      path: "/System/Library/Fonts/Supplemental/Arial Unicode MS.ttf",
      family: "Arial Unicode MS",
    },
    {
      path: "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
      family: "DejaVu Sans",
    },
  ];

  for (const font of thaiFonts) {
    console.log(`🔍 Checking for ${font.family} at: ${font.path}`);
    if (fs.existsSync(font.path)) {
      try {
        registerFont(font.path, { family: font.family });
        thaiFontRegistered = true;
        activeFontFamily = font.family;
        console.log(`✅ ${font.family} font registered successfully`);
        break;
      } catch (error) {
        console.log(`❌ Error registering ${font.family} font:`, error);
      }
    } else {
      console.log(`❌ ${font.family} font not found at: ${font.path}`);
    }
  }
}

if (!thaiFontRegistered) {
  console.log("⚠️  No Thai fonts found, using fallback approach");
  activeFontFamily = "Arial, sans-serif";
}

console.log("🎯 Active font family for badge generation:", activeFontFamily);
console.log("=== FONT REGISTRATION END ===");

// YEC Brand Colors from globals.css
const YEC_COLORS = {
  primary: "#1A237E", // PANTONE 3591
  accent: "#4285C5", // PANTONE 2394
  highlight: "#4CD1E0", // PANTONE 3105
  white: "#FFFFFF",
  black: "#171717",
  gray: "#6B7280",
  lightGray: "#F3F4F6",
  darkBlue: "#0D47A1", // Darker blue for better contrast
};

// Business type mapping from FormSchema
const BUSINESS_TYPE_LABELS: { [key: string]: string } = {
  technology: "เทคโนโลยี",
  finance: "การเงินและการธนาคาร",
  healthcare: "สุขภาพและการแพทย์",
  education: "การศึกษา",
  retail: "ค้าปลีก",
  manufacturing: "การผลิต",
  construction: "การก่อสร้าง",
  "real-estate": "อสังหาริมทรัพย์",
  tourism: "การท่องเที่ยว",
  "food-beverage": "อาหารและเครื่องดื่ม",
  fashion: "แฟชั่นและเสื้อผ้า",
  automotive: "ยานยนต์",
  energy: "พลังงาน",
  logistics: "โลจิสติกส์",
  media: "สื่อและบันเทิง",
  consulting: "ที่ปรึกษา",
  legal: "กฎหมาย",
  marketing: "การตลาด",
  agriculture: "เกษตรกรรม",
  other: "อื่น ๆ",
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

// Helper function to get Thai-compatible font
function getThaiFont(size: number, weight: string = "normal"): string {
  // Use the active font family that was successfully registered
  return `${weight} ${size}px ${activeFontFamily}`;
}

// Helper function to safely render Thai text
function drawThaiText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth?: number,
): void {
  try {
    // Set the font using the active font family
    const currentFontSize = parseInt(ctx.font) || 16;
    const currentWeight = ctx.font.includes("bold") ? "bold" : "normal";
    ctx.font = getThaiFont(currentFontSize, currentWeight);

    // Log the font being used for debugging (only for first few calls to avoid spam)
    if (Math.random() < 0.1) {
      // Log 10% of calls
      console.log(`🎨 Drawing text "${text}" with font: ${ctx.font}`);
    }

    ctx.fillText(text, x, y, maxWidth);
  } catch (error) {
    console.warn(
      "⚠️  Error rendering Thai text, falling back to basic font:",
      error,
    );
    // Fallback to basic font
    ctx.font = ctx.font
      .replace(/['"]/g, "")
      .replace(/,\s*[^,]+$/, ", Arial, sans-serif");
    ctx.fillText(text, x, y, maxWidth);
  }
}

// Helper function to remove name prefix
function removeNamePrefix(fullName: string): string {
  const prefixes = ["นาย", "นาง", "นางสาว", "ดร.", "ผศ.", "รศ.", "ศ."];
  let cleanName = fullName;

  for (const prefix of prefixes) {
    if (cleanName.startsWith(prefix + " ")) {
      cleanName = cleanName.substring(prefix.length + 1);
      break;
    }
  }

  return cleanName;
}

export async function generateYECBadge(badgeData: BadgeData): Promise<Buffer> {
  // Badge dimensions (ID card size) - increased for better content spacing
  const width = 750;
  const height = 500;

  // Create canvas
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Log the active font at the start of badge generation
  console.log(
    "🚀 Starting badge generation with active font:",
    activeFontFamily,
  );

  // Set background
  ctx.fillStyle = YEC_COLORS.white;
  ctx.fillRect(0, 0, width, height);

  // Add header with logo and branding
  await drawHeader(ctx, width);

  // Add main content area
  await drawMainContent(ctx, badgeData, width, height);

  // Add footer
  drawFooter(ctx, width, height);

  console.log("✅ Badge generation completed successfully");
  return canvas.toBuffer("image/png");
}

async function drawHeader(
  ctx: CanvasRenderingContext2D,
  width: number,
): Promise<void> {
  const headerHeight = 90;

  // Header background with gradient
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, YEC_COLORS.darkBlue);
  gradient.addColorStop(1, YEC_COLORS.primary);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, headerHeight);

  try {
    // Load and draw YEC logo with white background for better readability
    const logoPath = path.join(
      process.cwd(),
      "public",
      "assets",
      "logo-full.png",
    );
    if (fs.existsSync(logoPath)) {
      const logo = await loadImage(logoPath);
      const logoWidth = 130;
      const logoHeight = 55;
      const logoX = 25;
      const logoY = (headerHeight - logoHeight) / 2;

      // Draw white background circle for logo
      ctx.fillStyle = YEC_COLORS.white;
      ctx.beginPath();
      ctx.arc(
        logoX + logoWidth / 2,
        logoY + logoHeight / 2,
        Math.max(logoWidth, logoHeight) / 2 + 5,
        0,
        2 * Math.PI,
      );
      ctx.fill();

      // Draw logo
      ctx.drawImage(logo as any, logoX, logoY, logoWidth, logoHeight);
      console.log("✅ YEC logo drawn successfully with white background");
    } else {
      console.log("⚠️  YEC logo not found, using text fallback");
      // Fallback to text logo with white background
      ctx.fillStyle = YEC_COLORS.white;
      ctx.beginPath();
      ctx.arc(90, 45, 35, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = YEC_COLORS.primary;
      ctx.font = getThaiFont(20, "bold");
      ctx.textAlign = "center";
      drawThaiText(ctx, "YEC", 90, 52);
    }
  } catch (error) {
    console.log("⚠️  Error loading YEC logo:", error);
    // Fallback to text logo with white background
    ctx.fillStyle = YEC_COLORS.white;
    ctx.beginPath();
    ctx.arc(90, 45, 35, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = YEC_COLORS.primary;
    ctx.font = getThaiFont(20, "bold");
    ctx.textAlign = "center";
    drawThaiText(ctx, "YEC", 90, 52);
  }

  // Right side branding
  ctx.fillStyle = YEC_COLORS.white;
  ctx.textAlign = "right";

  // Main title
  ctx.font = getThaiFont(26, "bold");
  drawThaiText(ctx, "YEC DAY 2024", width - 25, 40);

  // Subtitle
  ctx.font = getThaiFont(16);
  drawThaiText(ctx, "Young Entrepreneurs Chamber", width - 25, 62);

  // Reset text alignment
  ctx.textAlign = "left";
}

async function drawMainContent(
  ctx: CanvasRenderingContext2D,
  badgeData: BadgeData,
  width: number,
  height: number,
): Promise<void> {
  const contentY = 110;
  const contentHeight = height - 160; // Leave space for header and footer

  // Draw content background with subtle border
  ctx.fillStyle = YEC_COLORS.lightGray;
  ctx.fillRect(25, contentY, width - 50, contentHeight);

  // Draw white content area
  ctx.fillStyle = YEC_COLORS.white;
  ctx.fillRect(30, contentY + 5, width - 60, contentHeight - 10);

  // Left side: Profile photo and user info
  await drawUserSection(ctx, badgeData, width, contentY);

  // Bottom-right: QR code (moved from right side)
  await drawQRCodeSection(ctx, badgeData, width, height);
}

async function drawUserSection(
  ctx: CanvasRenderingContext2D,
  badgeData: BadgeData,
  width: number,
  contentY: number,
): Promise<void> {
  const leftSectionX = 60;
  const leftSectionY = contentY + 25;

  // Profile photo
  const photoSize = 140;
  const photoX = leftSectionX;
  const photoY = leftSectionY;

  if (badgeData.profileImageBase64) {
    try {
      // Handle both data URLs and raw base64 strings
      let base64Data = badgeData.profileImageBase64;
      if (badgeData.profileImageBase64.startsWith("data:")) {
        base64Data = badgeData.profileImageBase64.replace(
          /^data:image\/[a-z]+;base64,/,
          "",
        );
      }

      // Validate base64 data
      if (!base64Data || base64Data.length === 0) {
        throw new Error("Empty base64 data");
      }

      const image = await loadImage(Buffer.from(base64Data, "base64"));

      // Create circular mask
      ctx.save();
      ctx.beginPath();
      ctx.arc(
        photoX + photoSize / 2,
        photoY + photoSize / 2,
        photoSize / 2,
        0,
        2 * Math.PI,
      );
      ctx.clip();

      // Draw image
      ctx.drawImage(image as any, photoX, photoY, photoSize, photoSize);
      ctx.restore();

      console.log("✅ Profile image drawn successfully");
    } catch (error) {
      console.error("❌ Error loading profile image:", error);
      drawDefaultProfilePhoto(ctx, photoX, photoY, photoSize);
    }
  } else {
    console.log("📷 No profile image provided, drawing default");
    drawDefaultProfilePhoto(ctx, photoX, photoY, photoSize);
  }

  // Add border
  ctx.strokeStyle = YEC_COLORS.primary;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(
    photoX + photoSize / 2,
    photoY + photoSize / 2,
    photoSize / 2,
    0,
    2 * Math.PI,
  );
  ctx.stroke();

  // User information (to the right of photo)
  const infoX = photoX + photoSize + 40;
  const infoY = photoY + 15;
  const lineHeight = 55;

  ctx.textAlign = "left";

  // Full Name (Line 1) - emphasized and without prefix
  const cleanName = removeNamePrefix(badgeData.fullName);
  ctx.fillStyle = YEC_COLORS.primary;
  ctx.font = getThaiFont(44, "bold");
  drawThaiText(ctx, `${cleanName}`, infoX, infoY);

  // Nickname (Line 2) - on a new line
  ctx.fillStyle = YEC_COLORS.accent;
  ctx.font = getThaiFont(36, "bold");
  drawThaiText(ctx, `(${badgeData.nickname})`, infoX, infoY + lineHeight);

  // YEC Member Province (Line 3)
  ctx.fillStyle = YEC_COLORS.darkBlue;
  ctx.font = getThaiFont(18, "bold");
  drawThaiText(
    ctx,
    `จังหวัดสมาชิก YEC: ${badgeData.yecProvince}`,
    infoX,
    infoY + lineHeight * 2,
  );

  // Business Type (Line 4)
  const businessTypeLabel =
    badgeData.businessType === "other" && badgeData.businessTypeOther
      ? badgeData.businessTypeOther
      : BUSINESS_TYPE_LABELS[badgeData.businessType] || badgeData.businessType;

  ctx.fillStyle = YEC_COLORS.black;
  ctx.font = getThaiFont(18);
  drawThaiText(
    ctx,
    `ประเภทกิจการ: ${businessTypeLabel}`,
    infoX,
    infoY + lineHeight * 3,
  );

  // Phone (Line 5) - full number, not masked
  drawThaiText(ctx, `โทร: ${badgeData.phone}`, infoX, infoY + lineHeight * 4);
}

function drawDefaultProfilePhoto(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  // Draw placeholder background
  ctx.fillStyle = YEC_COLORS.lightGray;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, 2 * Math.PI);
  ctx.fill();

  // Draw placeholder icon
  ctx.fillStyle = YEC_COLORS.gray;
  ctx.textAlign = "center";
  drawThaiText(ctx, "👤", x + size / 2, y + size / 2 + size / 6);
}

async function drawQRCodeSection(
  ctx: CanvasRenderingContext2D,
  badgeData: BadgeData,
  width: number,
  height: number,
): Promise<void> {
  const qrSize = 160;
  const qrX = width - qrSize - 40; // 40px padding from right
  const qrY = height - qrSize - 90; // 40px padding from bottom, accounting for footer height

  // QR code data
  const qrData: QRCodeData = {
    regId: badgeData.registrationId,
    fullName: badgeData.fullName,
    phone: badgeData.phone,
  };

  try {
    // Validate QR data
    const qrDataString = JSON.stringify(qrData);
    if (!qrDataString || qrDataString === "{}") {
      throw new Error("Empty QR code data");
    }

    console.log("📱 Generating QR code with data:", qrDataString);

    // Generate QR code
    const qrCodeDataURL = await QRCode.toDataURL(qrDataString, {
      width: qrSize,
      margin: 3,
      color: {
        dark: YEC_COLORS.primary,
        light: YEC_COLORS.white,
      },
    });

    // Load QR code image
    const qrImage = await loadImage(qrCodeDataURL);
    ctx.drawImage(qrImage as any, qrX, qrY, qrSize, qrSize);

    // Add QR code label
    ctx.fillStyle = YEC_COLORS.gray;
    ctx.font = getThaiFont(16);
    ctx.textAlign = "center";
    drawThaiText(ctx, "Scan for details", qrX + qrSize / 2, qrY + qrSize + 25);

    console.log("✅ QR code drawn successfully");
  } catch (error) {
    console.error("❌ Error generating QR code:", error);
    // Draw placeholder if QR generation fails
    ctx.fillStyle = YEC_COLORS.lightGray;
    ctx.fillRect(qrX, qrY, qrSize, qrSize);
    ctx.fillStyle = YEC_COLORS.gray;
    ctx.font = getThaiFont(16);
    ctx.textAlign = "center";
    drawThaiText(ctx, "QR Code Error", qrX + qrSize / 2, qrY + qrSize / 2);
  }
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const footerHeight = 50;
  const footerY = height - footerHeight;

  // Footer background
  const gradient = ctx.createLinearGradient(0, footerY, width, footerY);
  gradient.addColorStop(0, YEC_COLORS.accent);
  gradient.addColorStop(1, YEC_COLORS.highlight);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, footerY, width, footerHeight);

  // Footer text
  ctx.fillStyle = YEC_COLORS.white;
  ctx.font = getThaiFont(16, "bold");
  ctx.textAlign = "center";
  drawThaiText(ctx, "Official YEC Registration Badge", width / 2, footerY + 32);
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
export function getBusinessTypeDisplay(
  businessType: string,
  businessTypeOther?: string,
): string {
  if (businessType === "other" && businessTypeOther) {
    return businessTypeOther;
  }
  return BUSINESS_TYPE_LABELS[businessType] || businessType;
}
