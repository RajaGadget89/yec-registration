import { cookies } from 'next/headers';
import { isAdmin } from './admin-guard';

/**
 * Interface for user data
 */
export interface User {
  id?: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Gets the current user from cookies/session
 * This is a simplified approach for the current setup
 * @returns User object or null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    
    // Check for various possible session cookies
    const sessionCookie = cookieStore.get('sb-access-token')?.value ||
                         cookieStore.get('supabase-auth-token')?.value ||
                         cookieStore.get('auth-token')?.value ||
                         cookieStore.get('admin-email')?.value ||
                         cookieStore.get('dev-user-email')?.value;
    
    if (!sessionCookie) {
      return null;
    }
    
    // For now, we'll return a mock user for testing
    // In a real implementation, you'd decode the JWT or query Supabase
    return {
      id: 'test-user-id',
      email: sessionCookie, // Use the cookie value as email for now
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Gets the current user from request headers (for API routes)
 * @param request - The request object
 * @returns User object or null if not authenticated
 */
export async function getCurrentUserFromRequest(request: Request): Promise<User | null> {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    let userEmail: string | null = null;

    // Check for various possible session cookies
    const cookieMatches = [
      /sb-access-token=([^;]+)/,
      /supabase-auth-token=([^;]+)/,
      /auth-token=([^;]+)/,
      /admin-email=([^;]+)/,
      /dev-user-email=([^;]+)/
    ];

    for (const regex of cookieMatches) {
      const match = cookieHeader.match(regex);
      if (match) {
        userEmail = decodeURIComponent(match[1]);
        break;
      }
    }

    if (!userEmail) {
      return null;
    }

    return {
      id: 'test-user-id',
      email: userEmail,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting current user from request:', error);
    return null;
  }
}

/**
 * Checks if user is authenticated and is an admin
 * @returns true if user is authenticated and is an admin, false otherwise
 */
export async function isAuthenticatedAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user || !user.email) {
    return false;
  }
  
  return isAdmin(user.email);
}

/**
 * Checks if user is authenticated (has any valid session)
 * @returns true if user is authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}
