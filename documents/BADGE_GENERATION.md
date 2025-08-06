# YEC Registration Badge Generation

## Overview
The YEC Registration System now includes automatic badge generation for successful registrations. Each badge includes the user's profile photo, personal information, and a QR code containing registration details.

## Features

### Badge Components
- **YEC Branding Header**: Gradient background with YEC Day 2024 branding
- **Profile Photo**: Circular profile image with YEC primary color border
- **User Information**: 
  - Full name and nickname
  - YEC province
  - Business type (with custom text for "Other" category)
  - Masked phone number for privacy
- **QR Code**: Contains registration ID, full name, and phone number
- **YEC Footer**: Gradient footer with official badge text

### Technical Specifications
- **Dimensions**: 600x400 pixels (ID card size)
- **Format**: PNG with transparency support
- **Colors**: Uses YEC brand colors from globals.css
  - Primary: #1A237E (PANTONE 3591)
  - Accent: #4285C5 (PANTONE 2394)
  - Highlight: #4CD1E0 (PANTONE 3105)

### QR Code Data Structure
```json
{
  "regId": "YEC-1234567890-abc123def",
  "fullName": "นาย ชื่อ นามสกุล",
  "phone": "0812345678"
}
```

## Implementation

### Dependencies
- `canvas`: For image generation and manipulation
- `qrcode`: For QR code generation
- `@types/qrcode`: TypeScript definitions

### Files
- `app/lib/badgeGenerator.ts`: Main badge generation utility
- `app/api/register/route.ts`: Updated to generate badges on registration
- `app/success/page.tsx`: Updated to display and allow download of badges

### Badge Generation Process
1. **Registration Submission**: When a user submits the registration form
2. **Data Preparation**: Extract user data and convert profile image to base64
3. **Badge Creation**: Generate badge with all components
4. **Response**: Return badge as base64 data in API response
5. **Display**: Show badge on success page with download option

## Usage

### API Response
The registration API now returns:
```json
{
  "success": true,
  "message": "Registration submitted successfully",
  "registrationId": "YEC-1234567890-abc123def",
  "badgeBase64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

### Success Page
- Displays the generated badge
- Provides download button for the badge
- Badge filename: `yec-badge-{registrationId}.png`

## Business Type Mapping
The system automatically maps business type values to Thai labels:

| Value | Thai Label |
|-------|------------|
| technology | เทคโนโลยี |
| finance | การเงินและการธนาคาร |
| healthcare | สุขภาพและการแพทย์ |
| education | การศึกษา |
| retail | ค้าปลีก |
| manufacturing | การผลิต |
| construction | การก่อสร้าง |
| real-estate | อสังหาริมทรัพย์ |
| tourism | การท่องเที่ยว |
| food-beverage | อาหารและเครื่องดื่ม |
| fashion | แฟชั่นและเสื้อผ้า |
| automotive | ยานยนต์ |
| energy | พลังงาน |
| logistics | โลจิสติกส์ |
| media | สื่อและบันเทิง |
| consulting | ที่ปรึกษา |
| legal | กฎหมาย |
| marketing | การตลาด |
| agriculture | เกษตรกรรม |
| other | ใช้ข้อความที่ผู้ใช้ระบุ |

## Error Handling
- If profile image loading fails, displays default placeholder
- If QR code generation fails, displays error placeholder
- Badge generation errors don't prevent registration completion
- Graceful fallback for missing or invalid data

## Security Considerations
- Phone numbers are masked in the badge display (081***5678)
- QR code contains full phone number for verification purposes
- Registration ID is not displayed as text on the badge
- All sensitive data is handled server-side

## Future Enhancements
- Add badge customization options
- Support for different badge templates
- Batch badge generation for admin users
- Badge verification system using QR codes
- Integration with event check-in systems 