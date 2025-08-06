import { NextResponse } from 'next/server';
import { generateYECBadge } from '../../lib/badgeGenerator';

export async function POST() {
  try {
    // Test badge data with Thai text
    const testBadgeData = {
      registrationId: 'YEC-TEST-123456789',
      fullName: 'นาย สมชาย ใจดี',
      nickname: 'ชาย',
      phone: '0812345678',
      yecProvince: 'กรุงเทพมหานคร',
      businessType: 'technology',
      businessTypeOther: undefined,
      profileImageBase64: undefined // No profile image for test
    };

    console.log('=== BADGE GENERATION TEST START ===');
    console.log('Test badge data:', testBadgeData);
    console.log('Generating test badge with Thai text...');

    // Generate badge
    const badgeBuffer = await generateYECBadge(testBadgeData);
    
    if (!badgeBuffer || badgeBuffer.length === 0) {
      throw new Error('Badge generation failed - empty buffer returned');
    }

    console.log('Test badge generated successfully!');
    console.log('Badge size:', badgeBuffer.length, 'bytes');
    console.log('=== BADGE GENERATION TEST END ===');

    // Return the badge as a response
      return new NextResponse(new Blob([Uint8Array.from(badgeBuffer)]), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'inline; filename="test-badge.png"',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('=== BADGE GENERATION TEST ERROR ===');
    console.error('Test badge generation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Badge generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      message: 'Test badge endpoint - use POST with test data to generate a badge',
      available: true,
      timestamp: new Date().toISOString(),
      testData: {
        registrationId: 'YEC-TEST-123456789',
        fullName: 'นาย สมชาย ใจดี',
        nickname: 'ชาย',
        phone: '0812345678',
        yecProvince: 'กรุงเทพมหานคร',
        businessType: 'technology'
      }
    },
    { status: 200 }
  );
} 
