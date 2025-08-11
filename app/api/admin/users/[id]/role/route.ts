import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest, hasRole } from '../../../../../lib/auth-utils.server';
import { getSupabaseAuth } from '../../../../../lib/auth-client';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authenticated and is super_admin
    const currentUser = await getCurrentUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!(await hasRole('super_admin'))) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { role } = await request.json();

    if (!role || !['admin', 'super_admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "admin" or "super_admin"' },
        { status: 400 }
      );
    }

    // Prevent super_admin from demoting themselves
    if (currentUser.id === params.id && role === 'admin') {
      return NextResponse.json(
        { error: 'Cannot demote yourself from super_admin' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAuth();
    
    // Update user role in admin_users table
    const { data, error } = await supabase
      .from('admin_users')
      .update({ 
        role,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user role:', error);
      return NextResponse.json(
        { error: 'Failed to update user role' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.id,
        email: data.email,
        role: data.role,
        updated_at: data.updated_at
      }
    });

  } catch (error) {
    console.error('Update user role error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
