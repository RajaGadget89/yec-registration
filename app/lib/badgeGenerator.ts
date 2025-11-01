// Server-only: This module uses Node.js APIs that are not available in the browser
if (typeof window !== "undefined") {
  throw new Error("badgeGenerator.ts can only be used on the server");
}

import {
  createCanvas,
  loadImage,
  registerFont,
  CanvasRenderingContext2D,
} from "canvas";
// QR drawing is centralized in qrService
import { encryptQrPayload, renderQrToCanvas } from "./qr/qrService";
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

// Helper to draw a gradient chevron (arrow) layer
function drawChevronLayer(
  ctx: CanvasRenderingContext2D,
  width: number,
  peakY: number,
  spread: number,
  topColor: string,
  bottomColor: string,
  alpha: number,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  const gradient = ctx.createLinearGradient(
    width / 2,
    peakY - 40,
    width / 2,
    peakY + spread + 40,
  );
  gradient.addColorStop(0, topColor);
  gradient.addColorStop(1, bottomColor);
  ctx.fillStyle = gradient as any;
  ctx.beginPath();
  ctx.moveTo(0, peakY + spread);
  ctx.lineTo(width / 2, peakY);
  ctx.lineTo(width, peakY + spread);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

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

interface _QRCodeData {
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
    const sizeMatch = ctx.font.match(/(\d+)px/);
    const currentFontSize = sizeMatch ? parseInt(sizeMatch[1], 10) : 16;
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
  // Print-ready vertical card (12cm x 19cm at ~300DPI)
  const width = 1417; // 12cm @ 300dpi ≈ 1417px
  const height = 2244; // 19cm @ 300dpi ≈ 2244px

  // Create canvas
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Log the active font at the start of badge generation
  console.log(
    "🚀 Starting badge generation with active font:",
    activeFontFamily,
  );

  // Paint a black base to eliminate any white gaps beneath overlays
  ctx.fillStyle = "#0E0E0E";
  ctx.fillRect(0, 0, width, height);

  // Background style to match example: top light/dark blue chevrons, lower black diagonal panel
  const topHeight = Math.floor(height * 0.35);
  // Base top color
  ctx.fillStyle = "#2F68C9"; // strong blue
  ctx.fillRect(0, 0, width, topHeight);
  // Chevron overlays with subtle gradients (3 layers)
  // Align the chevron peak just ABOVE the profile circle to remove blue blank
  const photoSizeForLayout = 560;
  const photoYForLayout = Math.floor(topHeight - photoSizeForLayout / 2);
  const peakY = Math.max(120, photoYForLayout - 40);
  // Outer light layer (widest)
  drawChevronLayer(ctx, width, peakY + 60, 640, "#86D0FF", "#4A8DE0", 1.0);
  // Middle medium layer
  drawChevronLayer(ctx, width, peakY + 10, 480, "#69B8FF", "#3F7ED6", 0.95);
  // Inner dark layer (narrowest)
  drawChevronLayer(ctx, width, peakY - 40, 340, "#4E96F0", "#2F68C9", 0.9);
  // Bottom black polygon with upward peak (matching reference)
  ctx.fillStyle = "#0E0E0E";
  ctx.beginPath();
  // Position black apex slightly inside upper portion of the circle for tight overlap
  const apexY = Math.floor(photoYForLayout + photoSizeForLayout * 0.1);
  const edgeY = apexY + 300;
  ctx.moveTo(0, edgeY);
  ctx.lineTo(width / 2, apexY);
  ctx.lineTo(width, edgeY);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  // Add header with logo and branding
  await drawHeader(ctx);

  // Add main content area
  await drawMainContent(ctx, badgeData, width, height);

  // Add footer
  drawFooter(ctx, width, height);

  // Print trim border to aid cutting (safe inset)
  try {
    ctx.save();
    const inset = 20;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#66A7FF";
    ctx.setLineDash([10, 8]);
    ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
    ctx.restore();
  } catch {}

  console.log("✅ Badge generation completed successfully");
  return canvas.toBuffer("image/png");
}

async function drawHeader(ctx: CanvasRenderingContext2D): Promise<void> {
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
      // Scale logo to visually match the header text height and align centers
      const logoHeight = 120; // approximate text cap height (112px) with padding
      const aspect = 320 / 140;
      const logoWidth = Math.round(logoHeight * aspect);
      const logoX = 96;
      const logoY = 80;

      // Draw logo on dark background
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

  // Wordmark next to logo
  ctx.fillStyle = YEC_COLORS.white;
  ctx.textAlign = "left";
  ctx.font = getThaiFont(112, "bold");
  // Align text vertically centered to the logo block
  const textCenterY = 80 + 120 / 2;
  const prevBaseline = ctx.textBaseline as CanvasTextBaseline;
  ctx.textBaseline = "middle";
  const headerX = 96 + Math.round(120 * (320 / 140)) + 36;
  // Faux-extra-bold: stroke + fill to increase visual weight
  ctx.strokeStyle = YEC_COLORS.white;
  ctx.lineWidth = 3;
  ctx.strokeText("YEC DAY 2025", headerX, textCenterY);
  drawThaiText(ctx, "YEC DAY 2025", headerX, textCenterY);
  ctx.textBaseline = prevBaseline || "alphabetic";
}

async function drawMainContent(
  ctx: CanvasRenderingContext2D,
  badgeData: BadgeData,
  width: number,
  height: number,
): Promise<void> {
  // Reference layout aims to match the example card: centered portrait photo
  // overlapping blue/black sections, centered text, a thin cyan divider, then
  // a large QR code below.

  // 1) Draw the user section (photo + text + divider) and capture the Y
  // coordinate after the divider to anchor the QR section.
  const afterDividerY = await drawUserSection(ctx, badgeData, width, height);

  // 2) Draw QR code, centered and large, starting a bit below the divider
  await drawQRCodeSection(ctx, badgeData, width, height, afterDividerY + 30);
}

async function drawUserSection(
  ctx: CanvasRenderingContext2D,
  badgeData: BadgeData,
  width: number,
  height: number,
): Promise<number> {
  // Place the circular profile photo centered horizontally, overlapping the
  // boundary between the blue chevrons and the black polygon.
  const topHeight = Math.floor(height * 0.25);
  const photoSize = 560;
  const centerX = Math.floor(width / 2);
  const photoX = centerX - Math.floor(photoSize / 2);
  const photoY = topHeight - Math.floor(photoSize / 2);

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

  // Add rings: thick white ring outside + slim cyan highlight like sample
  ctx.lineWidth = 18;
  ctx.strokeStyle = YEC_COLORS.white;
  ctx.beginPath();
  ctx.arc(centerX, photoY + photoSize / 2, photoSize / 2 + 12, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.lineWidth = 10;
  ctx.strokeStyle = "#66A7FF";
  ctx.beginPath();
  ctx.arc(centerX, photoY + photoSize / 2, photoSize / 2 - 6, 0, 2 * Math.PI);
  ctx.stroke();

  // User information (centered under photo on the black panel)
  const textStartY = photoY + photoSize + 200; // Increased from 140 to 200 to move text lower
  const lineHeight = 96;

  // Draw nickname above full name, centered
  const cleanName = removeNamePrefix(badgeData.fullName);
  const nicknameText = `(${badgeData.nickname})`;

  // Reset alignment to centered for both elements
  ctx.textAlign = "center";

  // Draw nickname first (above the name) with 10% larger size
  ctx.fillStyle = "#1FB6FF";
  ctx.font = getThaiFont(106, "bold"); // 96 * 1.1 = 105.6, rounded to 106
  drawThaiText(ctx, nicknameText, centerX, textStartY - 60);

  // Draw full name below nickname (moved down to prevent overlap)
  ctx.fillStyle = YEC_COLORS.white;
  ctx.font = getThaiFont(96, "bold");
  drawThaiText(ctx, cleanName, centerX, textStartY + 80);

  // Province, Business type, Phone
  const businessTypeLabel =
    badgeData.businessType === "other" && badgeData.businessTypeOther
      ? badgeData.businessTypeOther
      : BUSINESS_TYPE_LABELS[badgeData.businessType] || badgeData.businessType;

  // Reset alignment to centered for the following block items
  ctx.textAlign = "center";
  ctx.fillStyle = YEC_COLORS.white;
  ctx.font = getThaiFont(50, "bold");
  drawThaiText(
    ctx,
    `จังหวัดสมาชิก YEC: ${
      (badgeData.yecProvince &&
        (badgeData.yecProvince as string).toUpperCase()) ||
      badgeData.yecProvince
    }`,
    centerX,
    textStartY + lineHeight * 1.7,
  );

  ctx.fillStyle = YEC_COLORS.white;
  ctx.font = getThaiFont(47);
  drawThaiText(
    ctx,
    `ประเภทกิจการ: ${businessTypeLabel}`,
    centerX,
    textStartY + lineHeight * 2.55,
  );

  // TEMPORARILY DISABLED: Phone number display per customer request
  // ctx.fillStyle = YEC_COLORS.white;
  // ctx.font = getThaiFont(47);
  // drawThaiText(
  //   ctx,
  //   `โทร: ${badgeData.phone}`,
  //   centerX,
  //   textStartY + lineHeight * 3.2,
  // );

  // Thin cyan divider line below the text, matching the reference card
  const dividerY = textStartY + lineHeight * 3.35 + 40;
  ctx.fillStyle = "#1FB6FF";
  ctx.fillRect(Math.floor(width * 0.18), dividerY, Math.floor(width * 0.64), 6);

  // Return a Y anchor for the QR section
  return dividerY;
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
  startY: number,
): Promise<void> {
  // Large, centered QR code placed below the divider line
  const footerHeight = 160;
  const availableHeight = height - footerHeight - startY - 80;
  const baseSize = Math.min(720, Math.max(520, Math.floor(availableHeight)));
  const targetSize = Math.floor(baseSize * 0.9); // reduce by ~10%
  const qrSize = targetSize;
  const qrX = Math.floor(width / 2 - qrSize / 2);
  const qrY = Math.floor(startY + 50);

  // Validate and ensure registrationId is available
  if (!badgeData.registrationId) {
    console.error(
      "❌ CRITICAL: registrationId is missing from badgeData:",
      badgeData,
    );
    throw new Error("Registration ID is required for QR code generation");
  }

  // Encrypted QR payload (tracking_id + form_key)
  const trackingId = badgeData.registrationId; // use registrationId as tracking id for YEC
  const formKey = "yec";

  try {
    console.log(`🔍 Generating QR code for registrationId: ${trackingId}`);

    // Step 1: Encrypt QR payload (with fallback to unencrypted if secret missing)
    let token: string;
    let useEncryption = true;

    try {
      token = await encryptQrPayload({
        tracking_id: trackingId,
        form_key: formKey,
      });
      console.log(
        `✅ QR payload encrypted successfully (token length: ${token.length})`,
      );
    } catch (encryptError: any) {
      console.warn(
        "⚠️ QR encryption failed, using unencrypted fallback:",
        encryptError?.message,
      );
      console.warn("⚠️ Encrypt error details:", {
        message: encryptError?.message,
        hasQRSecret: !!process.env.QR_SECRET,
        hasPublicQRSecret: !!process.env.NEXT_PUBLIC_QR_SECRET,
      });

      // Fallback: Use simple JSON payload if encryption fails (e.g., QR_SECRET missing)
      // This ensures badge generation continues even without the secret
      useEncryption = false;
      token = JSON.stringify({
        tracking_id: trackingId,
        form_key: formKey,
        version: 1,
      });
      console.log(
        `⚠️ Using unencrypted QR payload fallback (token length: ${token.length})`,
      );
    }

    // Step 2: Render QR code to canvas
    try {
      await renderQrToCanvas(ctx as any, qrX, qrY, qrSize, token);
      console.log(
        `✅ QR code rendered to canvas successfully (encrypted: ${useEncryption})`,
      );
    } catch (renderError: any) {
      console.error("❌ Error rendering QR code to canvas:", renderError);
      console.error("❌ Render error details:", {
        message: renderError?.message,
        stack: renderError?.stack,
        tokenLength: token?.length,
        qrSize,
      });
      // Draw placeholder if QR rendering fails completely
      ctx.fillStyle = YEC_COLORS.lightGray;
      ctx.fillRect(qrX, qrY, qrSize, qrSize);
      ctx.fillStyle = YEC_COLORS.gray;
      ctx.font = getThaiFont(16);
      ctx.textAlign = "center";
      drawThaiText(ctx, "QR Code Error", qrX + qrSize / 2, qrY + qrSize / 2);
      // Don't throw - allow badge generation to complete
      return;
    }

    // Add QR code label
    ctx.fillStyle = YEC_COLORS.gray;
    ctx.font = getThaiFont(28);
    ctx.textAlign = "center";
    drawThaiText(ctx, "Scan for details", qrX + qrSize / 2, qrY + qrSize + 40);

    console.log("✅ QR code drawn successfully");
  } catch (error: any) {
    // Final fallback: if everything fails, draw placeholder and continue
    console.error("❌ Unexpected error in QR code generation:", error);
    console.error("❌ Full error details:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      registrationId: trackingId,
    });
    // Draw placeholder if QR generation fails
    ctx.fillStyle = YEC_COLORS.lightGray;
    ctx.fillRect(qrX, qrY, qrSize, qrSize);
    ctx.fillStyle = YEC_COLORS.gray;
    ctx.font = getThaiFont(16);
    ctx.textAlign = "center";
    drawThaiText(ctx, "QR Code Error", qrX + qrSize / 2, qrY + qrSize / 2);
    // Don't throw - allow badge generation to complete even if QR fails
  }
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const footerHeight = 160;
  const footerY = height - footerHeight;

  // Solid dark-blue footer bar
  ctx.fillStyle = YEC_COLORS.darkBlue;
  ctx.fillRect(0, footerY, width, footerHeight);

  // Footer text
  ctx.fillStyle = YEC_COLORS.white;
  ctx.font = getThaiFont(26, "bold");
  ctx.textAlign = "center";
  drawThaiText(ctx, "Official YEC Registration Badge", width / 2, footerY + 40);
  drawThaiText(ctx, "2025 YEC Day.", width / 2, footerY + 90);
  drawThaiText(ctx, "All rights reserved.", width / 2, footerY + 120);
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
