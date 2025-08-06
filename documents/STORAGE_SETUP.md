# Supabase Storage Setup for YEC Registration

## Overview

The registration form has been refactored to upload files directly to Supabase Storage instead of storing large base64 data in localStorage. This improves performance and reduces browser storage usage.

## Required Supabase Storage Buckets

Create the following storage buckets in your Supabase project:

### 1. `profile-images`
- **Purpose**: Store user profile images
- **Public**: Yes (for image display)
- **File size limit**: 10MB
- **Allowed file types**: image/jpeg, image/jpg, image/png

### 2. `chamber-cards`
- **Purpose**: Store chamber membership cards
- **Public**: Yes (for image display)
- **File size limit**: 10MB
- **Allowed file types**: image/jpeg, image/jpg, image/png

### 3. `payment-slips`
- **Purpose**: Store payment confirmation slips
- **Public**: Yes (for image display)
- **File size limit**: 10MB
- **Allowed file types**: image/jpeg, image/jpg, image/png

### 4. `yec-badges`
- **Purpose**: Store generated YEC badges
- **Public**: Yes (for badge display and download)
- **File size limit**: 5MB
- **Allowed file types**: image/png

## Environment Variables

Add these to your `.env.local` file:

```env
# Server-side (API routes)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Client-side (browser)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Storage Bucket Policies

### Public Read Access
All buckets should allow public read access for image display:

```sql
-- Allow public read access to all files
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT USING (bucket_id IN ('profile-images', 'chamber-cards', 'payment-slips', 'yec-badges'));
```

### Authenticated Upload Access
For the client-side uploads, create policies that allow authenticated users to upload:

```sql
-- Allow authenticated users to upload to profile-images
CREATE POLICY "Authenticated upload to profile-images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'profile-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to upload to chamber-cards
CREATE POLICY "Authenticated upload to chamber-cards" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'chamber-cards' AND auth.role() = 'authenticated');

-- Allow authenticated users to upload to payment-slips
CREATE POLICY "Authenticated upload to payment-slips" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'payment-slips' AND auth.role() = 'authenticated');
```

## Changes Made

### 1. New File Upload Service
- Created `app/lib/uploadFileToSupabase.ts` for client-side file uploads
- Handles immediate upload to Supabase Storage
- Returns public URLs for stored files

### 2. Updated Registration Form
- Files are uploaded to Supabase before form submission
- Only file URLs are stored in localStorage (not base64 data)
- Significantly reduced localStorage usage

### 3. Updated API Route
- Handles both new format (URLs) and old format (base64) for backward compatibility
- Fetches images from URLs when needed for badge generation

### 4. Updated Preview Page
- Displays images from Supabase URLs
- Maintains backward compatibility with old base64 format

## Benefits

1. **Reduced localStorage usage**: No more storing large base64 strings
2. **Better performance**: Faster form submission and page loads
3. **Scalability**: Files stored in cloud storage instead of browser
4. **Backward compatibility**: Existing data still works
5. **Security**: Files stored securely in Supabase with proper access controls

## Migration Notes

- Existing registrations with base64 data will continue to work
- New registrations will use the URL-based approach
- No data migration required
- The system automatically detects and handles both formats 