# Supabase Setup Guide

## Overview
The YEC Registration System uses Supabase Storage to store and serve badge images. This guide will help you set up Supabase for badge storage.

## Prerequisites
1. A Supabase account (free tier available)
2. A Supabase project created

## Step-by-Step Setup

### 1. Create Supabase Project
1. Go to [Supabase.com](https://supabase.com)
2. Sign up or log in
3. Create a new project
4. Wait for the project to be ready

### 2. Get Project Credentials
1. Go to your project dashboard
2. Navigate to **Settings** → **API**
3. Copy the following values:
   - **Project URL** (e.g., `https://your-project-id.supabase.co`)
   - **Service Role Key** (under "Project API keys")

### 3. Configure Environment Variables
Add these to your `.env.local` file:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 4. Create Storage Bucket
1. Go to **Storage** in your Supabase dashboard
2. Click **Create a new bucket**
3. Set bucket name: `yec-badges`
4. Make it **Public** (so badges can be accessed via URL)
5. Click **Create bucket**

### 5. Configure Storage Policies
1. Go to **Storage** → **Policies**
2. For the `yec-badges` bucket, add these policies:

#### Policy 1: Allow Public Read Access
```sql
-- Allow anyone to read badge images
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'yec-badges');
```

#### Policy 2: Allow Authenticated Uploads
```sql
-- Allow authenticated users to upload badges
CREATE POLICY "Authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'yec-badges');
```

#### Policy 3: Allow Service Role Full Access
```sql
-- Allow service role to manage all files
CREATE POLICY "Service role full access" ON storage.objects
FOR ALL USING (bucket_id = 'yec-badges');
```

## Usage

### Upload Badge
```typescript
import { uploadBadgeToSupabase } from './app/lib/uploadBadgeToSupabase';

const publicUrl = await uploadBadgeToSupabase(buffer, 'YEC-123456.png');
console.log('Badge URL:', publicUrl);
```

### Delete Badge
```typescript
import { deleteBadgeFromSupabase } from './app/lib/uploadBadgeToSupabase';

const deleted = await deleteBadgeFromSupabase('YEC-123456.png');
```

### Check if Badge Exists
```typescript
import { badgeExistsInSupabase } from './app/lib/uploadBadgeToSupabase';

const exists = await badgeExistsInSupabase('YEC-123456.png');
```

## File Structure
```
yec-badges/
├── YEC-1234567890-abc123def.png
├── YEC-1234567890-def456ghi.png
└── ...
```

## Security Considerations

### Service Role Key
- The service role key has admin privileges
- Never expose it in client-side code
- Only use it in server-side API routes
- Keep it secure and rotate regularly

### Public Access
- Badge images are publicly accessible
- Anyone with the URL can view the badge
- Consider implementing additional security if needed

### File Validation
- Only PNG files are accepted
- File size limits are enforced by Supabase
- Filenames are sanitized automatically

## Error Handling

The upload function includes comprehensive error handling:

```typescript
try {
  const url = await uploadBadgeToSupabase(buffer, filename);
  console.log('Success:', url);
} catch (error) {
  console.error('Upload failed:', error.message);
  // Handle error appropriately
}
```

## Common Issues

### 1. "Missing Supabase environment variables"
- Check that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- Ensure the `.env.local` file is in the project root

### 2. "Failed to upload badge: Bucket not found"
- Verify the `yec-badges` bucket exists
- Check bucket name spelling

### 3. "Failed to upload badge: Insufficient permissions"
- Verify storage policies are configured correctly
- Check that the service role key is valid

### 4. "Failed to generate public URL"
- Ensure the bucket is set to public
- Check storage policies allow public read access

## Monitoring

### Storage Usage
- Monitor storage usage in Supabase dashboard
- Set up alerts for storage limits
- Consider implementing cleanup for old badges

### Performance
- Badge images are served via CDN
- Consider image optimization for large files
- Monitor upload/download speeds

## Best Practices

1. **File Naming**: Use registration IDs as filenames for uniqueness
2. **Error Handling**: Always handle upload errors gracefully
3. **Cleanup**: Implement cleanup for failed uploads
4. **Backup**: Consider backing up important badges
5. **Monitoring**: Set up alerts for storage issues 