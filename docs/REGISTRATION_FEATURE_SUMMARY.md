# YEC Day Registration System - Feature Summary

## Overview
The YEC Day Registration System is a comprehensive web application that handles participant registration for the YEC Day event. The system processes registration data, generates personalized badges, sends confirmation emails, and stores all information in Supabase.

## Core Features Implemented

### 1. Data Submission to Supabase
- **API Endpoint**: `POST /api/register`
- **Database**: Supabase PostgreSQL with proper TypeScript types
- **Data Flow**: Frontend form → Validation → Database mapping → Supabase storage

### 2. Data Validation & Processing
- **Comprehensive Validation**: 11 required fields with format validation
- **Phone Validation**: Thai format (0XXXXXXXXX or +66XXXXXXXX)
- **Email Validation**: Standard email format validation
- **Line ID Validation**: Alphanumeric with dots, underscores, hyphens
- **Business Logic Validation**: Hotel choice dependencies, roommate requirements

### 3. Database Schema & Types
- **Registration Table**: 25+ fields including personal info, preferences, and metadata
- **TypeScript Types**: Proper type definitions for type safety
- **Data Mapping**: Frontend field names to database column names
- **Status Tracking**: Registration status, email sent status, timestamps

### 4. Badge Generation System
- **Dynamic Badge Creation**: Personalized badges with participant information
- **Image Processing**: Profile image integration, YEC province display
- **File Upload**: Automatic upload to Supabase storage
- **Error Handling**: Graceful fallback if badge generation fails

### 5. Email Notification System
- **Confirmation Emails**: Automatic sending with badge attachment
- **Email Service**: Resend API integration
- **Status Tracking**: Email sent status and timestamp
- **Error Handling**: Continues registration even if email fails

### 6. File Management
- **Profile Images**: Support for URL and base64 data
- **Document Uploads**: Chamber card, payment slip handling
- **Badge Storage**: Organized file structure in Supabase
- **File Validation**: Size limits, format validation

### 7. Timezone Handling
- **Thailand Timezone**: All timestamps in Thailand time
- **ISO String Conversion**: Proper timezone formatting
- **Display Formatting**: Human-readable time formatting

### 8. Security & Metadata
- **IP Address Tracking**: User IP address logging
- **User Agent Logging**: Browser/device information
- **Form Data Backup**: Complete form data stored as JSON
- **Service Role Access**: Secure database access

## Technical Implementation

### Database Fields
```typescript
// Core Registration Data
registration_id: string          // Unique identifier
title, first_name, last_name: string
nickname, phone, line_id: string
email, company_name: string
business_type, yec_province: string

// Accommodation Preferences
hotel_choice: 'in-quota' | 'out-of-quota'
room_type: 'single' | 'double' | 'suite' | 'no-accommodation'
roommate_info, roommate_phone: string
external_hotel_name: string

// Travel & Documents
travel_type: 'private-car' | 'van'
profile_image_url, chamber_card_url, payment_slip_url: string

// System Fields
badge_url: string
email_sent: boolean
status: string
ip_address, user_agent: string
created_at, updated_at: string
```

### Validation Rules
- **Required Fields**: 11 mandatory fields
- **Phone Format**: Thai phone number validation
- **Email Format**: Standard email validation
- **Line ID**: Alphanumeric with special characters
- **Hotel Logic**: Conditional field requirements
- **Roommate Logic**: Required for double rooms

### Error Handling
- **Validation Errors**: Detailed error messages
- **Database Errors**: Graceful error responses
- **Badge Generation**: Fallback without badge
- **Email Errors**: Continue without email
- **File Upload Errors**: Handle upload failures

### Response Format
```typescript
{
  success: boolean
  message: string
  registrationId: string
  badgeUrl: string | null
  emailSent: boolean
}
```

## Integration Points

### Frontend Integration
- **Form Submission**: RESTful API calls
- **Error Display**: User-friendly error messages
- **Success Handling**: Registration confirmation
- **File Upload**: Image and document handling

### External Services
- **Supabase**: Database and file storage
- **Resend**: Email delivery service
- **Badge Generation**: Custom badge creation
- **File Processing**: Image and document handling

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Database access key
- `RESEND_API_KEY`: Email service key

## Data Flow Summary

1. **Form Submission** → Frontend sends registration data
2. **Validation** → Server validates all fields and business rules
3. **Data Mapping** → Frontend fields mapped to database columns
4. **Badge Generation** → Personalized badge created and uploaded
5. **Database Insert** → Registration data stored in Supabase
6. **Email Sending** → Confirmation email with badge sent
7. **Status Update** → Email status updated in database
8. **Response** → Success/error response sent to frontend

## Quality Assurance

### TypeScript Integration
- **Type Safety**: Full TypeScript coverage
- **Database Types**: Proper Supabase type definitions
- **API Types**: Request/response type definitions
- **Error Prevention**: Compile-time error checking

### Code Quality
- **ESLint Compliance**: Code style and best practices
- **Error Handling**: Comprehensive error management
- **Logging**: Detailed console logging for debugging
- **Documentation**: Clear code comments and structure

## Performance Considerations

### Optimization Features
- **Efficient Queries**: Optimized database operations
- **File Size Limits**: 5MB maximum for uploads
- **Error Recovery**: Graceful degradation
- **Caching**: Supabase client caching

### Scalability
- **Service Role Access**: Secure database connections
- **Stateless Design**: No server-side state
- **Modular Architecture**: Separated concerns
- **Extensible Design**: Easy to add new features

---

*This registration system provides a complete, production-ready solution for YEC Day event registration with comprehensive data handling, validation, and user experience features.* 