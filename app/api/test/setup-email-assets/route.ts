import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  // Security check - only allow in test environment
  const testHelpersEnabled = request.headers.get('X-Test-Helpers-Enabled');
  const authHeader = request.headers.get('Authorization');
  
  if (testHelpersEnabled !== '1' || !authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Test helpers not enabled or unauthorized' }, { status: 403 });
  }

  const token = authHeader.replace('Bearer ', '');
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    console.log('[SETUP-EMAIL-ASSETS] Starting email assets setup...');

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Create yec-assets bucket if it doesn't exist
    console.log('[SETUP-EMAIL-ASSETS] Creating yec-assets bucket...');
    
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      throw new Error(`Failed to list buckets: ${listError.message}`);
    }

    const existingBucketNames = buckets?.map(b => b.name) || [];
    const bucketExists = existingBucketNames.includes('yec-assets');

    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket('yec-assets', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'],
        fileSizeLimit: 2 * 1024 * 1024 // 2MB
      });

      if (createError) {
        throw new Error(`Failed to create yec-assets bucket: ${createError.message}`);
      }

      console.log('[SETUP-EMAIL-ASSETS] yec-assets bucket created successfully');
    } else {
      console.log('[SETUP-EMAIL-ASSETS] yec-assets bucket already exists');
    }

    // Step 2: Upload the logo
    console.log('[SETUP-EMAIL-ASSETS] Uploading logo...');
    
    const logoPath = path.join(process.cwd(), 'public', 'assets', 'logo-full.png');
    
    if (!fs.existsSync(logoPath)) {
      throw new Error(`Logo file not found at: ${logoPath}`);
    }

    const logoBuffer = fs.readFileSync(logoPath);
    console.log('[SETUP-EMAIL-ASSETS] Logo file read successfully, size:', logoBuffer.length);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('yec-assets')
      .upload('logo-full.png', logoBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('[SETUP-EMAIL-ASSETS] Upload error:', uploadError);
      throw uploadError;
    }

    console.log('[SETUP-EMAIL-ASSETS] Logo uploaded successfully:', uploadData);

    // Step 3: Get the public URL
    const { data: urlData } = supabase.storage
      .from('yec-assets')
      .getPublicUrl('logo-full.png');

    console.log('[SETUP-EMAIL-ASSETS] Public URL:', urlData.publicUrl);

    return NextResponse.json({
      success: true,
      message: 'Email assets setup completed successfully',
      data: {
        bucketCreated: !bucketExists,
        logoUploaded: uploadData,
        publicUrl: urlData.publicUrl
      }
    });
    
  } catch (error) {
    console.error('[SETUP-EMAIL-ASSETS] Error:', error);
    return NextResponse.json({ 
      error: 'Email assets setup failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
