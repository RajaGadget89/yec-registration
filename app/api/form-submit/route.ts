import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Check if this is a form submission (has form data)
  const hasFormData = searchParams.has('firstName') || searchParams.has('email') || searchParams.has('phone');
  
  if (hasFormData) {
    // This is a form submission, redirect to preview
    const formData: any = {};
    searchParams.forEach((value, key) => {
      formData[key] = value;
    });
    
    // Create a response that redirects to preview with form data
    const previewUrl = new URL('/preview', request.url);
    
    // Store form data in a temporary way (this is a workaround)
    // In a real implementation, this would be stored in a database or session
    const response = NextResponse.redirect(previewUrl);
    
    // Set a cookie with the form data (temporary solution)
    response.cookies.set('tempFormData', JSON.stringify(formData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300 // 5 minutes
    });
    
    return response;
  }
  
  // Not a form submission, redirect to home
  return NextResponse.redirect(new URL('/', request.url));
}
