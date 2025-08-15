import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToSupabase } from '../../lib/uploadFileToSupabase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string;
    const filename = formData.get('filename') as string | undefined;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!folder) {
      return NextResponse.json({ error: 'No folder specified' }, { status: 400 });
    }

    // Upload file using server-side function
    const fileUrl = await uploadFileToSupabase(file, folder, filename);

    return NextResponse.json({ 
      success: true, 
      fileUrl,
      message: 'File uploaded successfully' 
    });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
